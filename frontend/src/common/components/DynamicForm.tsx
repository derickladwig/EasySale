import { useState, useEffect } from 'react';
import { Input } from './atoms/Input';
import { Button } from './atoms/Button';
import { AlertCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'file';

export interface FieldSchema {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  default?: unknown;

  // Validation
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // Select/Radio options
  options?: Array<{ value: string; label: string }>;

  // Textarea
  rows?: number;

  // Conditional rendering
  showIf?: (formData: Record<string, unknown>) => boolean;

  // Custom validation
  validate?: (value: unknown, formData: Record<string, unknown>) => string | null;

  // Wizard step (for multi-step forms)
  step?: number;
}

export interface FormSchema {
  id: string;
  title: string;
  description?: string;
  fields: FieldSchema[];
  submitLabel?: string;
  cancelLabel?: string;
}

export interface DynamicFormProps {
  schema: FormSchema;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Component
// ============================================================================

export function DynamicForm({
  schema,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Initialize form data with defaults
  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    schema.fields.forEach((field) => {
      if (field.default !== undefined && formData[field.name] === undefined) {
        defaults[field.name] = field.default;
      }
    });
    if (Object.keys(defaults).length > 0) {
      setFormData((prev) => ({ ...defaults, ...prev }));
    }
  }, [schema.fields, formData]);

  const validateField = (field: FieldSchema, value: unknown): string | null => {
    // Required validation
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} is required`;
    }

    // Skip other validations if empty and not required
    if (value === undefined || value === null || value === '') {
      return null;
    }

    // Type-specific validation
    const strValue = String(value);

    switch (field.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strValue)) {
          return `${field.label} must be a valid email address`;
        }
        break;

      case 'url':
        try {
          new URL(strValue);
        } catch {
          return `${field.label} must be a valid URL`;
        }
        break;

      case 'tel':
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(strValue)) {
          return `${field.label} must be a valid phone number`;
        }
        break;

      case 'number':
        const numValue = Number(value);
        if (isNaN(numValue)) {
          return `${field.label} must be a number`;
        }
        if (field.min !== undefined && numValue < field.min) {
          return `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && numValue > field.max) {
          return `${field.label} must be at most ${field.max}`;
        }
        break;

      case 'text':
      case 'textarea':
      case 'password':
        if (field.minLength !== undefined && strValue.length < field.minLength) {
          return `${field.label} must be at least ${field.minLength} characters`;
        }
        if (field.maxLength !== undefined && strValue.length > field.maxLength) {
          return `${field.label} must be at most ${field.maxLength} characters`;
        }
        if (field.pattern) {
          const regex = new RegExp(field.pattern);
          if (!regex.test(strValue)) {
            return `${field.label} format is invalid`;
          }
        }
        break;
    }

    // Custom validation
    if (field.validate) {
      const customError = field.validate(value, formData);
      if (customError) {
        return customError;
      }
    }

    return null;
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => new Set(prev).add(name));

    // Clear error for this field
    setErrors((prev) => prev.filter((err) => err.field !== name));
  };

  const handleFieldBlur = (field: FieldSchema) => {
    setTouched((prev) => new Set(prev).add(field.name));

    // Validate this field
    const error = validateField(field, formData[field.name]);
    if (error) {
      setErrors((prev) => [
        ...prev.filter((e) => e.field !== field.name),
        { field: field.name, message: error },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get visible fields (respecting showIf conditions)
    const visibleFields = schema.fields.filter((field) => !field.showIf || field.showIf(formData));

    // Mark all visible fields as touched
    const allFields = new Set(visibleFields.map((field) => field.name));
    setTouched(allFields);

    // Validate and get errors
    const newErrors: ValidationError[] = [];
    visibleFields.forEach((field) => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors.push({ field: field.name, message: error });
      }
    });

    setErrors(newErrors);

    // Only submit if no errors
    if (newErrors.length === 0) {
      await onSubmit(formData);
    }
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return errors.find((err) => err.field === fieldName)?.message;
  };

  const renderField = (field: FieldSchema) => {
    // Check conditional rendering
    if (field.showIf && !field.showIf(formData)) {
      return null;
    }

    const value = formData[field.name];
    const error = touched.has(field.name) ? getFieldError(field.name) : undefined;

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'number':
      case 'tel':
      case 'url':
      case 'date':
      case 'time':
      case 'datetime-local':
        return (
          <Input
            key={field.name}
            type={field.type}
            label={field.label}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const newValue =
                field.type === 'number' && e.target.value ? Number(e.target.value) : e.target.value;
              handleFieldChange(field.name, newValue);
            }}
            onBlur={() => handleFieldBlur(field)}
            placeholder={field.placeholder}
            required={field.required}
            error={error}
            helperText={!error ? field.helpText : undefined}
            disabled={isLoading}
            fullWidth
          />
        );

      case 'textarea':
        const textareaId = `textarea-${field.name}`;
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={textareaId} className="block text-sm font-medium text-text-primary">
              {field.label}
              {field.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <textarea
              id={textareaId}
              value={value ? String(value) : ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              placeholder={field.placeholder}
              rows={field.rows || 4}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            {error && <p className="text-sm text-error-600">{error}</p>}
            {!error && field.helpText && (
              <p className="text-sm text-text-secondary">{field.helpText}</p>
            )}
          </div>
        );

      case 'select':
        const selectId = `select-${field.name}`;
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={selectId} className="block text-sm font-medium text-text-primary">
              {field.label}
              {field.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <select
              id={selectId}
              value={value ? String(value) : ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-error-600">{error}</p>}
            {!error && field.helpText && (
              <p className="text-sm text-text-secondary">{field.helpText}</p>
            )}
          </div>
        );

      case 'checkbox':
        const checkboxId = `checkbox-${field.name}`;
        return (
          <div key={field.name} className="flex items-start gap-3">
            <input
              type="checkbox"
              id={checkboxId}
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={isLoading}
              className="mt-1 w-4 h-4 rounded border-border bg-background text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <div className="flex-1">
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-text-primary cursor-pointer"
              >
                {field.label}
                {field.required && <span className="text-error-400 ml-1">*</span>}
              </label>
              {field.helpText && (
                <p className="text-sm text-text-secondary mt-1">{field.helpText}</p>
              )}
              {error && <p className="text-sm text-error-600 mt-1">{error}</p>}
            </div>
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">
              {field.label}
              {field.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((opt) => {
                const radioId = `radio-${field.name}-${opt.value}`;
                return (
                  <div key={opt.value} className="flex items-center gap-3">
                    <input
                      type="radio"
                      id={radioId}
                      name={field.name}
                      value={opt.value}
                      checked={value === opt.value}
                      onChange={(e) => handleFieldChange(field.name, e.target.value)}
                      disabled={isLoading}
                      className="w-4 h-4 border-border bg-background text-primary-600 focus:ring-2 focus:ring-primary-500"
                    />
                    <label htmlFor={radioId} className="text-sm text-text-primary cursor-pointer">
                      {opt.label}
                    </label>
                  </div>
                );
              })}
            </div>
            {error && <p className="text-sm text-error-600">{error}</p>}
            {!error && field.helpText && (
              <p className="text-sm text-text-secondary">{field.helpText}</p>
            )}
          </div>
        );

      case 'file':
        const fileId = `file-${field.name}`;
        return (
          <div key={field.name} className="space-y-2">
            <label htmlFor={fileId} className="block text-sm font-medium text-text-primary">
              {field.label}
              {field.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <input
              type="file"
              id={fileId}
              onChange={(e) => handleFieldChange(field.name, e.target.files?.[0])}
              onBlur={() => handleFieldBlur(field)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-600 file:text-white hover:file:bg-primary-700"
            />
            {error && <p className="text-sm text-error-600">{error}</p>}
            {!error && field.helpText && (
              <p className="text-sm text-text-secondary">{field.helpText}</p>
            )}
          </div>
        );

      default:
        return (
          <div
            key={field.name}
            className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg"
          >
            <p className="text-sm text-error-400">Unknown field type: {field.type}</p>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Form header */}
      {(schema.title || schema.description) && (
        <div className="pb-4 border-b border-border">
          {schema.title && (
            <h3 className="text-lg font-semibold text-text-primary">{schema.title}</h3>
          )}
          {schema.description && (
            <p className="text-sm text-text-secondary mt-1">{schema.description}</p>
          )}
        </div>
      )}

      {/* Form fields */}
      <div className="space-y-4">{schema.fields.map((field) => renderField(field))}</div>

      {/* Form actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button type="submit" variant="primary" loading={isLoading} disabled={isLoading}>
          {schema.submitLabel || 'Submit'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {schema.cancelLabel || 'Cancel'}
          </Button>
        )}
      </div>

      {/* Global errors */}
      {errors.length > 0 && touched.size > 0 && (
        <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-error-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-error-400">Please fix the errors above</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

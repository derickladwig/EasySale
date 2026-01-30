import { useState, useEffect } from 'react';
import { useConfig } from '../../config';
import { AttributeConfig } from '../../config/types';
import { Input } from './atoms/Input';
import { Button } from './atoms/Button';
import { AlertCircle } from 'lucide-react';

interface DynamicCategoryFormProps {
  categoryId: string;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface ValidationError {
  field: string;
  message: string;
}

export function DynamicCategoryForm({
  categoryId,
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
}: DynamicCategoryFormProps) {
  const { categories } = useConfig();
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Find the category configuration
  const category = categories.find((cat) => cat.id === categoryId);

  useEffect(() => {
    // Initialize form data with defaults
    if (category) {
      const defaults: Record<string, unknown> = {};
      category.attributes.forEach((attr) => {
        if (attr.default !== undefined && formData[attr.name] === undefined) {
          defaults[attr.name] = attr.default;
        }
      });
      if (Object.keys(defaults).length > 0) {
        setFormData((prev) => ({ ...defaults, ...prev }));
      }
    }
  }, [category, formData]);

  // Helper function to get error for a field
  const getFieldError = (fieldName: string): string | undefined => {
    const error = errors.find(err => err.field === fieldName);
    return error?.message;
  };

  if (!category) {
    return (
      <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg text-error-400">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} />
          <span>Category not found: {categoryId}</span>
        </div>
      </div>
    );
  }

  const validateField = (attribute: AttributeConfig, value: unknown): string | null => {
    // Required validation
    if (attribute.required && (value === undefined || value === null || value === '')) {
      return `${attribute.label || attribute.name} is required`;
    }

    // Type-specific validation
    if (value !== undefined && value !== null && value !== '') {
      switch (attribute.type) {
        case 'number':
          const numValue = Number(value);
          if (isNaN(numValue)) {
            return `${attribute.label || attribute.name} must be a number`;
          }
          if (attribute.min !== undefined && numValue < attribute.min) {
            return `${attribute.label || attribute.name} must be at least ${attribute.min}`;
          }
          if (attribute.max !== undefined && numValue > attribute.max) {
            return `${attribute.label || attribute.name} must be at most ${attribute.max}`;
          }
          break;

        case 'text':
          if (attribute.pattern) {
            const regex = new RegExp(attribute.pattern);
            if (!regex.test(String(value))) {
              return `${attribute.label || attribute.name} format is invalid`;
            }
          }
          break;

        case 'dropdown':
          if (attribute.values && !attribute.values.includes(String(value))) {
            return `${attribute.label || attribute.name} must be one of: ${attribute.values.join(', ')}`;
          }
          break;
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

  const handleFieldBlur = (attribute: AttributeConfig) => {
    setTouched((prev) => new Set(prev).add(attribute.name));

    // Validate this field
    const error = validateField(attribute, formData[attribute.name]);
    if (error) {
      setErrors((prev) => [
        ...prev.filter((e) => e.field !== attribute.name),
        { field: attribute.name, message: error },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    const allFields = new Set(category.attributes.map((attr) => attr.name));
    setTouched(allFields);

    // Validate and get errors
    const newErrors: ValidationError[] = [];
    category.attributes.forEach((attr) => {
      const error = validateField(attr, formData[attr.name]);
      if (error) {
        newErrors.push({ field: attr.name, message: error });
      }
    });

    setErrors(newErrors);

    // Only submit if no errors
    if (newErrors.length === 0) {
      await onSubmit(formData);
    }
  };

  const renderField = (attribute: AttributeConfig) => {
    const value = formData[attribute.name];
    const error = touched.has(attribute.name) ? getFieldError(attribute.name) : undefined;
    const commonProps = {
      label: attribute.label || attribute.name,
      required: attribute.required,
      error: error,
      helperText: !error ? attribute.helpText : undefined,
      disabled: isLoading,
    };

    switch (attribute.type) {
      case 'text':
        return (
          <Input
            key={attribute.name}
            type="text"
            value={String(value || '')}
            onChange={(e) => handleFieldChange(attribute.name, e.target.value)}
            onBlur={() => handleFieldBlur(attribute)}
            placeholder={attribute.placeholder}
            {...commonProps}
          />
        );

      case 'number':
        return (
          <Input
            key={attribute.name}
            type="number"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) =>
              handleFieldChange(attribute.name, e.target.value ? Number(e.target.value) : undefined)
            }
            onBlur={() => handleFieldBlur(attribute)}
            placeholder={attribute.placeholder}
            {...commonProps}
          />
        );

      case 'dropdown':
        const selectId = `select-${attribute.name}`;
        return (
          <div key={attribute.name} className="space-y-2">
            <label htmlFor={selectId} className="block text-sm font-medium text-text-secondary">
              {attribute.label || attribute.name}
              {attribute.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <select
              id={selectId}
              value={String(value || '')}
              onChange={(e) => handleFieldChange(attribute.name, e.target.value)}
              onBlur={() => handleFieldBlur(attribute)}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-surface-base border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="">Select {attribute.label || attribute.name}</option>
              {attribute.values?.map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
            {error && <p className="text-sm text-error-400">{error}</p>}
            {!error && attribute.helpText && (
              <p className="text-sm text-text-disabled">{attribute.helpText}</p>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div key={attribute.name} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={attribute.name}
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(attribute.name, e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded border-border bg-surface-base text-primary-600 focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor={attribute.name} className="text-sm font-medium text-text-secondary">
              {attribute.label || attribute.name}
              {attribute.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            {attribute.helpText && (
              <p className="text-sm text-text-disabled ml-7">{attribute.helpText}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <Input
            key={attribute.name}
            type="date"
            value={value ? String(value) : ''}
            onChange={(e) => handleFieldChange(attribute.name, e.target.value)}
            onBlur={() => handleFieldBlur(attribute)}
            {...commonProps}
          />
        );

      case 'multi-select':
        return (
          <div key={attribute.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {attribute.label}
              {attribute.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-600 rounded-md p-2">
              {attribute.values?.map((option: string) => {
                const currentValues = (formData[attribute.name] as string[] || []);
                const isChecked = currentValues.includes(option);
                return (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...currentValues, option]
                          : currentValues.filter(v => v !== option);
                        handleFieldChange(attribute.name, newValues);
                      }}
                      className="rounded border-gray-600 text-accent focus:ring-accent"
                    />
                    <span className="text-sm text-gray-300">{option}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'hierarchy':
        return (
          <div key={attribute.name} className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              {attribute.label}
              {attribute.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <select
              value={formData[attribute.name] as string || ''}
              onChange={(e) => handleFieldChange(attribute.name, e.target.value)}
              onBlur={() => handleFieldBlur(attribute)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Select {attribute.label}</option>
              {attribute.values?.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {getFieldError(attribute.name) && (
              <p className="text-sm text-red-400">{getFieldError(attribute.name)}</p>
            )}
          </div>
        );

      case 'json':
        return (
          <div key={attribute.name} className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              {attribute.label || attribute.name}
              {attribute.required && <span className="text-error-400 ml-1">*</span>}
            </label>
            <textarea
              value={value ? JSON.stringify(value, null, 2) : ''}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(attribute.name, parsed);
                } catch {
                  // Invalid JSON, store as string temporarily
                  handleFieldChange(attribute.name, e.target.value);
                }
              }}
              onBlur={() => handleFieldBlur(attribute)}
              disabled={isLoading}
              rows={4}
              placeholder={attribute.placeholder || '{}'}
              className="w-full px-4 py-2 bg-surface-base border border-border rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            {error && <p className="text-sm text-error-400">{error}</p>}
            {!error && attribute.helpText && (
              <p className="text-sm text-text-disabled">{attribute.helpText}</p>
            )}
          </div>
        );

      default:
        return (
          <div
            key={attribute.name}
            className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg"
          >
            <p className="text-sm text-error-400">Unknown field type: {attribute.type}</p>
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category header */}
      <div className="pb-4 border-b border-border">
        <h3 className="text-lg font-semibold text-white">{category.name}</h3>
        {category.description && (
          <p className="text-sm text-text-tertiary mt-1">{category.description}</p>
        )}
      </div>

      {/* Form fields */}
      <div className="space-y-4">{category.attributes.map((attr) => renderField(attr))}</div>

      {/* Form actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <Button type="submit" variant="primary" loading={isLoading} disabled={isLoading}>
          Save
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
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

import { useState, useEffect } from 'react';
import { Button, Input } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
import { AlertCircle } from 'lucide-react';

export interface EditorField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'multiselect' | 'toggle' | 'radio' | 'textarea';
  placeholder?: string;
  options?: { value: string; label: string }[];
  helpText?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface EditorSection {
  title: string;
  description?: string;
  fields: EditorField[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface EntityEditorModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  entity?: T;
  sections: EditorSection[];
  onSave: (data: T) => Promise<void>;
  validate?: (data: T) => ValidationError[];
  isLoading?: boolean;
}

export function EntityEditorModal<T extends Record<string, any>>({
  isOpen,
  onClose,
  title,
  entity,
  sections,
  onSave,
  validate,
  isLoading = false,
}: EntityEditorModalProps<T>) {
  const [formData, setFormData] = useState<T>({} as T);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when entity changes
  useEffect(() => {
    if (entity) {
      setFormData(entity);
    } else {
      // Initialize with empty values
      const initialData: any = {};
      sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.type === 'toggle') {
            initialData[field.name] = false;
          } else if (field.type === 'multiselect') {
            initialData[field.name] = [];
          } else {
            initialData[field.name] = '';
          }
        });
      });
      setFormData(initialData as T);
    }
    setIsDirty(false);
    setErrors([]);
  }, [entity, sections]);

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    setIsDirty(true);
    // Clear error for this field when user starts typing
    setErrors((prev) => prev.filter((e) => e.field !== fieldName));
  };

  // Handle field blur - validate on blur
  const handleFieldBlur = (fieldName: string) => {
    if (validate) {
      const validationErrors = validate(formData);
      const fieldError = validationErrors.find((e) => e.field === fieldName);
      if (fieldError) {
        setErrors((prev) => {
          // Remove existing error for this field and add new one
          const filtered = prev.filter((e) => e.field !== fieldName);
          return [...filtered, fieldError];
        });
      }
    }
  };

  // Handle save
  const handleSave = async () => {
    // Validate
    if (validate) {
      const validationErrors = validate(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    // Save
    setIsSaving(true);
    try {
      await onSave(formData);
      setIsDirty(false);
      onClose();
    } catch (error: unknown) {
      // Handle API errors
      const err = error as { errors?: Array<{ field: string; message: string }>; message?: string };
      if (err.errors) {
        setErrors(err.errors);
      } else {
        setErrors([{ field: '_general', message: err.message || 'Failed to save' }]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close with dirty check
  const handleClose = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  };

  // Get error for field
  const getFieldError = (fieldName: string) => {
    return errors.find((e) => e.field === fieldName);
  };

  // Get general error
  const generalError = errors.find((e) => e.field === '_general');

  // Render field
  const renderField = (field: EditorField) => {
    const error = getFieldError(field.name);
    const value = formData[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-secondary-700">
              {field.label}
              {field.required && <span className="text-error-600 ml-1">*</span>}
            </label>
            <Input
              type={field.type}
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
            />
            {field.helpText && <p className="text-xs text-secondary-500">{field.helpText}</p>}
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-secondary-700">
              {field.label}
              {field.required && <span className="text-error-600 ml-1">*</span>}
            </label>
            <textarea
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              placeholder={field.placeholder}
              disabled={field.disabled}
              rows={4}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {field.helpText && <p className="text-xs text-secondary-500">{field.helpText}</p>}
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-secondary-700">
              {field.label}
              {field.required && <span className="text-error-600 ml-1">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              onBlur={() => handleFieldBlur(field.name)}
              disabled={field.disabled}
              className="w-full px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select {field.label}</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && <p className="text-xs text-secondary-500">{field.helpText}</p>}
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'toggle':
        return (
          <div key={field.name} className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-secondary-700">{field.label}</label>
              {field.helpText && <p className="text-xs text-secondary-500">{field.helpText}</p>}
            </div>
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.name, e.target.checked)}
              disabled={field.disabled}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500 rounded"
            />
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <label className="block text-sm font-medium text-secondary-700">
              {field.label}
              {field.required && <span className="text-error-600 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    disabled={field.disabled}
                    className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">{option.label}</span>
                </label>
              ))}
            </div>
            {field.helpText && <p className="text-xs text-secondary-500">{field.helpText}</p>}
            {error && (
              <p className="text-sm text-error-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error.message}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} size="lg">
      <div className="space-y-6">
        {/* General Error */}
        {generalError && (
          <div className="p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-error-800">{generalError.message}</p>
          </div>
        )}

        {/* Sections */}
        {sections.map((section, index) => (
          <div key={index} className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-secondary-900">{section.title}</h3>
              {section.description && (
                <p className="text-sm text-secondary-600 mt-1">{section.description}</p>
              )}
            </div>
            <div className="space-y-4">{section.fields.map((field) => renderField(field))}</div>
          </div>
        ))}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-secondary-200">
          <Button onClick={handleClose} variant="secondary" disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary" disabled={isSaving || isLoading}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

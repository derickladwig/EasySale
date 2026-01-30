import { useState } from 'react';
import { DynamicForm } from '@common/components/DynamicForm';
import {
  allFormTemplates,
  FormTemplateKey,
  getAllFormTemplates,
} from '@common/components/formTemplates';

/**
 * Form Templates Showcase Page
 * Demonstrates all available pre-built form templates
 */
export function FormTemplatesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplateKey>('contact');
  const [submittedData, setSubmittedData] = useState<Record<string, unknown> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const templates = getAllFormTemplates();
  const currentTemplate = allFormTemplates[selectedTemplate];

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmittedData(data);
    setIsSubmitting(false);

    // Show success message
    alert('Form submitted successfully! Check console for data.');
  };

  const handleCancel = () => {
    setSubmittedData(null);
  };

  return (
    <div className="min-h-full bg-background-primary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Form Templates Library</h1>
          <p className="text-text-tertiary">
            Pre-built, customizable forms for common business needs. Select a template below to see
            it in action.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Template Selector */}
          <div className="lg:col-span-1">
            <div className="bg-surface-base rounded-lg border border-border p-4 sticky top-6">
              <h2 className="text-lg font-semibold text-white mb-4">Available Templates</h2>
              <div className="space-y-2">
                {Object.entries(templates).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedTemplate(key as FormTemplateKey);
                      setSubmittedData(null);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedTemplate === key
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-elevated text-text-secondary hover:bg-surface-overlay'
                    }`}
                  >
                    <div className="font-medium">{template.title}</div>
                    <div className="text-sm opacity-75 mt-1">{template.fields.length} fields</div>
                  </button>
                ))}
              </div>

              {/* Template Info */}
              <div className="mt-6 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold text-white mb-2">Template Info</h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-text-tertiary">ID:</dt>
                    <dd className="text-text-secondary font-mono">{currentTemplate.id}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Fields:</dt>
                    <dd className="text-text-secondary">{currentTemplate.fields.length}</dd>
                  </div>
                  <div>
                    <dt className="text-text-tertiary">Required:</dt>
                    <dd className="text-text-secondary">
                      {currentTemplate.fields.filter((f) => f.required).length}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>

          {/* Form Display */}
          <div className="lg:col-span-3">
            <div className="bg-surface-base rounded-lg border border-border p-6">
              {!submittedData ? (
                <DynamicForm
                  schema={currentTemplate}
                  onSubmit={handleSubmit}
                  onCancel={handleCancel}
                  isLoading={isSubmitting}
                />
              ) : (
                <div className="space-y-6">
                  {/* Success Message */}
                  <div className="p-4 bg-success-500/10 border border-success-500/20 rounded-lg">
                    <h3 className="text-lg font-semibold text-success-400 mb-2">
                      ✓ Form Submitted Successfully!
                    </h3>
                    <p className="text-sm text-success-400/80">
                      Your form has been submitted. Below is the data that was collected.
                    </p>
                  </div>

                  {/* Submitted Data */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Submitted Data:</h3>
                    <div className="bg-background-primary rounded-lg p-4 border border-border">
                      <pre className="text-sm text-text-secondary overflow-auto">
                        {JSON.stringify(submittedData, null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSubmittedData(null)}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Submit Another
                    </button>
                    <button
                      onClick={() => {
                        const nextIndex =
                          (Object.keys(templates).indexOf(selectedTemplate) + 1) %
                          Object.keys(templates).length;
                        setSelectedTemplate(Object.keys(templates)[nextIndex] as FormTemplateKey);
                        setSubmittedData(null);
                      }}
                      className="px-4 py-2 bg-surface-elevated text-white rounded-lg hover:bg-surface-overlay transition-colors"
                    >
                      Try Next Template
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Field Types Reference */}
            <div className="mt-6 bg-surface-base rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Field Types in This Template
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from(new Set(currentTemplate.fields.map((f) => f.type))).map((type) => (
                  <div
                    key={type}
                    className="px-3 py-2 bg-surface-elevated rounded-lg text-sm text-text-secondary text-center"
                  >
                    {type}
                  </div>
                ))}
              </div>
            </div>

            {/* Features List */}
            <div className="mt-6 bg-surface-base rounded-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Features</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Real-time validation with helpful error messages</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Conditional field rendering based on form data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Custom validation rules per field</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Support for 14 different field types</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Pre-filled default values</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Fully customizable and extensible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Accessible with proper ARIA labels</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success-400 mt-0.5">✓</span>
                  <span>Responsive design for all screen sizes</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

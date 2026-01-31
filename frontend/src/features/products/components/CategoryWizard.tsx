import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useConfig } from '../../../config/ConfigProvider';
import { productApi } from '../../../domains/product/api';
import type { Product } from '../../../domains/product/types';

interface WizardStep {
  id: string;
  label: string;
  attribute: string;
  options: string[] | { value: string; label: string }[];
  dependsOn?: string;
}

interface CategoryWizardProps {
  category: string;
  onComplete: (products: Product[]) => void;
  onCancel: () => void;
}

export const CategoryWizard: React.FC<CategoryWizardProps> = ({
  category,
  onComplete,
  onCancel,
}) => {
  const { config } = useConfig();
  const [currentStep, setCurrentStep] = useState(0);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load wizard steps from category configuration
  useEffect(() => {
    if (!config) return;

    const categoryConfig = config.categories?.find((c: { id: string }) => c.id === category);
    if (!categoryConfig?.wizard?.steps) {
      setError('No wizard configuration found for this category');
      return;
    }

    setSteps(categoryConfig.wizard.steps as unknown as WizardStep[]);
  }, [config, category]);

  // Get filtered options for current step based on previous selections
  const getFilteredOptions = (
    step: WizardStep
  ): Array<string | { value: string; label: string }> => {
    if (!step.dependsOn || !selections[step.dependsOn]) {
      return step.options;
    }

    // Filter options based on dependency
    // This is a simplified implementation - in production, you'd have more complex filtering logic
    return step.options;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSelection = (value: string) => {
    const step = steps[currentStep];
    setSelections((prev) => ({
      ...prev,
      [step.attribute]: value,
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build filter criteria from selections
      const filters: Record<string, string> = {};
      Object.entries(selections).forEach(([key, value]) => {
        filters[key] = value;
      });

      // Search products with criteria
      const response = await productApi.searchProducts({
        query: '',
        category,
        filters,
        page: 1,
        pageSize: 50,
      });

      // Remember selections for session
      sessionStorage.setItem(`wizard_selections_${category}`, JSON.stringify(selections));

      onComplete(response.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search products');
    } finally {
      setLoading(false);
    }
  };

  const isStepComplete = (stepIndex: number): boolean => {
    if (stepIndex > currentStep) return false;
    const step = steps[stepIndex];
    return !!selections[step.attribute];
  };

  const canProceed = (): boolean => {
    const step = steps[currentStep];
    return !!selections[step.attribute];
  };

  if (error && !steps.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-error-400 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-surface-secondary text-text-primary rounded hover:bg-surface-elevated"
        >
          Close
        </button>
      </div>
    );
  }

  if (!steps.length) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-tertiary">Loading wizard...</p>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const filteredOptions = getFilteredOptions(currentStepData);

  return (
    <div className="flex flex-col h-full">
      {/* Progress Indicator */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-text-primary">{currentStepData.label}</h3>
          <span className="text-sm text-text-tertiary">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <div className="flex gap-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded ${
                isStepComplete(index)
                  ? 'bg-accent'
                  : index === currentStep
                    ? 'bg-accent/50'
                    : 'bg-surface-secondary'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 p-4 bg-error-500/10 border border-error-500/20 rounded text-error-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredOptions.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            const isSelected = selections[currentStepData.attribute] === value;

            return (
              <button
                key={value}
                onClick={() => handleSelection(value)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-surface-elevated hover:border-border-strong'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-text-primary font-medium">{label}</span>
                  {isSelected && <Check className="w-5 h-5 text-accent" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between">
        <button
          onClick={currentStep === 0 ? onCancel : handleBack}
          className="flex items-center gap-2 px-4 py-2 text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          {currentStep === 0 ? 'Cancel' : 'Back'}
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || loading}
          className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            'Searching...'
          ) : currentStep === steps.length - 1 ? (
            'Find Products'
          ) : (
            <>
              Next
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

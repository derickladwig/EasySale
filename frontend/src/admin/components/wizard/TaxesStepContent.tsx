/**
 * TaxesStepContent - Tax Configuration
 * 
 * Required step for setting up tax rates (GST/PST/HST or custom).
 * Validates: Requirements 7.2
 */

import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';
import type { StepContentProps, TaxesStepData } from './types';
import wizardStyles from '../../pages/SetupWizard.module.css';

const TAX_PRESETS = [
  { region: 'US - No State Tax', rates: [] },
  { region: 'US - Standard', rates: [{ name: 'Sales Tax', rate: 7.0, isDefault: true }] },
  { region: 'Canada - GST Only', rates: [{ name: 'GST', rate: 5.0, isDefault: true }] },
  { region: 'Canada - GST + PST (BC)', rates: [
    { name: 'GST', rate: 5.0, isDefault: true },
    { name: 'PST', rate: 7.0, isDefault: false },
  ]},
  { region: 'Canada - HST (Ontario)', rates: [{ name: 'HST', rate: 13.0, isDefault: true }] },
  { region: 'Canada - HST (Nova Scotia)', rates: [{ name: 'HST', rate: 15.0, isDefault: true }] },
  { region: 'UK - VAT', rates: [{ name: 'VAT', rate: 20.0, isDefault: true }] },
  { region: 'Custom', rates: [] },
];


export function TaxesStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<TaxesStepData>) {
  const [formData, setFormData] = useState<TaxesStepData>({
    taxRegion: data?.taxRegion || 'US - Standard',
    taxRates: data?.taxRates || [{ name: 'Sales Tax', rate: 7.0, isDefault: true }],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = TAX_PRESETS.find((p) => p.region === e.target.value);
    if (preset) {
      setFormData({
        taxRegion: preset.region,
        taxRates: [...preset.rates],
      });
    }
  };

  const handleRateChange = (index: number, field: 'name' | 'rate', value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      taxRates: prev.taxRates.map((rate, i) =>
        i === index ? { ...rate, [field]: value } : rate
      ),
    }));
  };

  const handleAddRate = () => {
    setFormData((prev) => ({
      ...prev,
      taxRates: [...prev.taxRates, { name: '', rate: 0, isDefault: false }],
    }));
  };

  const handleRemoveRate = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      taxRates: prev.taxRates.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      onComplete(formData);
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isComplete) {
    const totalRate = formData.taxRates.reduce((sum, r) => sum + r.rate, 0);
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Taxes Configured
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              {data?.taxRegion} • {totalRate.toFixed(1)}% total
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        {/* Tax Region Preset */}
        <div className={wizardStyles.formGroup}>
          <label className={wizardStyles.formLabel}>
            Tax Region
          </label>
          <select
            value={formData.taxRegion}
            onChange={handlePresetChange}
            className={wizardStyles.formSelect}
          >
            {TAX_PRESETS.map((preset) => (
              <option key={preset.region} value={preset.region}>
                {preset.region}
              </option>
            ))}
          </select>
        </div>

        {/* Tax Rates */}
        <div className={wizardStyles.formGroup}>
          <div className="flex items-center justify-between mb-3">
            <label className={wizardStyles.formLabel} style={{ marginBottom: 0 }}>
              Tax Rates
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddRate}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Rate
            </Button>
          </div>


          {formData.taxRates.length === 0 ? (
            <div className="text-center py-6 text-text-tertiary bg-surface-elevated rounded-lg border border-border">
              No tax rates configured. This store will be tax-exempt.
            </div>
          ) : (
            <div className="space-y-3">
              {formData.taxRates.map((rate, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 bg-surface-elevated rounded-lg border border-border"
                >
                  <input
                    type="text"
                    value={rate.name}
                    onChange={(e) => handleRateChange(index, 'name', e.target.value)}
                    placeholder="Tax name"
                    className={cn(wizardStyles.formInput, 'flex-1')}
                    style={{ marginBottom: 0 }}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={rate.rate}
                      onChange={(e) => handleRateChange(index, 'rate', parseFloat(e.target.value) || 0)}
                      step="0.1"
                      min="0"
                      max="100"
                      className={cn(wizardStyles.formInput, 'w-24 text-right')}
                      style={{ marginBottom: 0 }}
                    />
                    <span className="text-text-muted text-sm">%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRate(index)}
                    className="p-2 text-text-tertiary hover:text-error-400 transition-colors rounded-lg hover:bg-error-500/10"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Save Tax Settings
      </Button>
    </form>
  );
}

/**
 * StoreStepContent - Store Basics & Tax Configuration
 * 
 * Required step for setting up store name, currency, locale, and tax rates.
 * Consolidates store basics and tax configuration into a single step.
 * Uses shared locale defaults from config/localeDefaults.ts
 * 
 * Validates: Requirements 7.2
 */

import React, { useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { cn } from '@common/utils/classNames';
import type { StepContentProps, StoreStepData, TaxRate } from './types';
import wizardStyles from '../../pages/SetupWizard.module.css';
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  TIMEZONE_OPTIONS,
  DEFAULT_STORE_LOCALE,
  TAX_REGION_OPTIONS,
  getSettingsByTimezone,
} from '../../../config/localeDefaults';

// Tax region presets (use from localeDefaults)
const TAX_PRESETS = TAX_REGION_OPTIONS;


export function StoreStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<StoreStepData>) {
  // Apply Canada-first defaults only when values are empty/undefined
  const [formData, setFormData] = useState<StoreStepData>({
    storeName: data?.storeName || '',
    currency: data?.currency || DEFAULT_STORE_LOCALE.currency,
    locale: data?.locale || DEFAULT_STORE_LOCALE.locale,
    timezone: data?.timezone || DEFAULT_STORE_LOCALE.timezone,
    taxRegion: data?.taxRegion || 'Canada - GST Only',
    taxRates: data?.taxRates || [{ name: 'GST', rate: 5.0, isDefault: true }],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof StoreStepData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof StoreStepData, string>> = {};

    if (!formData.storeName.trim()) {
      newErrors.storeName = 'Store name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Save store settings to backend
      const settingsToSave = [
        { key: 'store_name', value: formData.storeName, scope: 'global' },
        { key: 'currency', value: formData.currency, scope: 'global' },
        { key: 'locale', value: formData.locale, scope: 'global' },
        { key: 'timezone', value: formData.timezone, scope: 'global' },
        { key: 'tax_region', value: formData.taxRegion, scope: 'global' },
        { key: 'tax_rates', value: JSON.stringify(formData.taxRates), scope: 'global' },
      ];

      // Try to save each setting - continue even if some fail during first setup
      for (const setting of settingsToSave) {
        try {
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(setting),
          });
        } catch {
          // Settings endpoint may require auth - store locally for now
          localStorage.setItem(`easysale_${setting.key}`, String(setting.value));
        }
      }

      // Also store in localStorage as backup
      localStorage.setItem('store_name', formData.storeName);
      localStorage.setItem('currency', formData.currency);
      localStorage.setItem('locale', formData.locale);
      localStorage.setItem('timezone', formData.timezone);

      onComplete(formData);
    } catch (error) {
      console.error('Failed to save store config:', error);
      // Still complete the step - data is stored locally
      onComplete(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof StoreStepData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Auto-complete currency, locale, and tax region when timezone changes
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const timezoneId = e.target.value;
    const suggestions = getSettingsByTimezone(timezoneId);
    
    setFormData((prev) => ({
      ...prev,
      timezone: timezoneId,
      currency: suggestions.currency,
      locale: suggestions.locale,
      taxRegion: suggestions.taxRegion,
      taxRates: suggestions.taxRates.length > 0 ? [...suggestions.taxRates] : prev.taxRates,
    }));
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = TAX_PRESETS.find((p) => p.region === e.target.value);
    if (preset) {
      setFormData((prev) => ({
        ...prev,
        taxRegion: preset.region,
        taxRates: [...preset.rates],
      }));
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


  if (isComplete) {
    const totalRate = formData.taxRates.reduce((sum, r) => sum + r.rate, 0);
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Store & Tax Configured
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              {data?.storeName} • {data?.currency} • {data?.locale} • {totalRate.toFixed(1)}% tax
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-5">
        {/* Store Name */}
        <div className={wizardStyles.formGroup}>
          <label className={cn(wizardStyles.formLabel, wizardStyles.formLabelRequired)}>
            Store Name
          </label>
          <input
            type="text"
            value={formData.storeName}
            onChange={handleChange('storeName')}
            placeholder="Your Store Name"
            className={cn(
              wizardStyles.formInput,
              errors.storeName && wizardStyles.formInputError
            )}
          />
          {errors.storeName && (
            <p className={wizardStyles.formError}>{errors.storeName}</p>
          )}
        </div>

        {/* Currency */}
        <div className={wizardStyles.formGroup}>
          <label className={wizardStyles.formLabel}>
            Currency
          </label>
          <select
            value={formData.currency}
            onChange={handleChange('currency')}
            className={wizardStyles.formSelect}
          >
            {CURRENCY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>


        {/* Locale */}
        <div className={wizardStyles.formGroup}>
          <label className={wizardStyles.formLabel}>
            Language & Region
          </label>
          <select
            value={formData.locale}
            onChange={handleChange('locale')}
            className={wizardStyles.formSelect}
          >
            {LOCALE_OPTIONS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timezone */}
        <div className={wizardStyles.formGroup}>
          <label className={wizardStyles.formLabel}>
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={handleTimezoneChange}
            className={wizardStyles.formSelect}
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz.id} value={tz.id}>
                {tz.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-tertiary mt-1">
            Changing timezone will auto-suggest matching currency, locale, and tax settings
          </p>
        </div>

        {/* Tax Configuration Section */}
        <div className="border-t border-border pt-5 mt-5">
          <h3 className="text-lg font-medium text-text-primary mb-4">Tax Configuration</h3>
          
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
              <div className="text-center py-4 text-text-tertiary bg-surface-elevated rounded-lg border border-border text-sm">
                No tax rates configured. This store will be tax-exempt.
              </div>
            ) : (
              <div className="space-y-2">
                {formData.taxRates.map((rate, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg border border-border"
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
                        className={cn(wizardStyles.formInput, 'w-20 text-right')}
                        style={{ marginBottom: 0 }}
                      />
                      <span className="text-text-muted text-sm">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRate(index)}
                      className="p-2 text-text-tertiary hover:text-error-400 transition-colors rounded-lg hover:bg-error-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Save Store & Tax Settings
      </Button>
    </form>
  );
}

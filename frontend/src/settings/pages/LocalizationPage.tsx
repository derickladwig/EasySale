import React, { useState } from 'react';
import { CollapsibleSection } from '@common/components/molecules/CollapsibleSection';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { Toggle } from '@common/components/atoms/Toggle';
import { toast } from '@common/components/molecules/Toast';
import { Globe, DollarSign, Calendar, Clock as _Clock, Save } from 'lucide-react';
import {
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  DEFAULT_STORE_LOCALE,
} from '../../config/localeDefaults';

export const LocalizationPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Language settings
  const [language, setLanguage] = useState('en');

  // Currency settings - Canada-first default
  const [currency, setCurrency] = useState(DEFAULT_STORE_LOCALE.currency);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [currencyPosition, setCurrencyPosition] = useState<'before' | 'after'>('before');
  const [decimalPlaces, setDecimalPlaces] = useState('2');

  // Tax settings - Canadian defaults
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState('13.00');
  const [taxName, setTaxName] = useState('HST');

  // Date/Time settings - Canada-first default
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD');
  const [timeFormat, setTimeFormat] = useState('24h');
  const [timezone, setTimezone] = useState(DEFAULT_STORE_LOCALE.timezone);

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/localization', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          currency,
          currency_symbol: currencySymbol,
          currency_position: currencyPosition,
          decimal_places: parseInt(decimalPlaces),
          tax_enabled: taxEnabled,
          tax_rate: parseFloat(taxRate),
          tax_name: taxName,
          date_format: dateFormat,
          time_format: timeFormat,
          timezone
        })
      });
      if (!response.ok) throw new Error('Failed to update localization settings');
      toast.success('Localization settings updated successfully');
      setHasUnsavedChanges(false);
    } catch {
      toast.error('Failed to update localization settings');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h1 className="text-3xl font-bold text-text-primary">Localization</h1>
        <p className="text-text-secondary mt-2">Configure language, currency, and regional settings</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Language Section */}
          <CollapsibleSection title="Language" icon={Globe} defaultOpen={true}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Default Language
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="fr">French (Français)</option>
                  <option value="es">Spanish (Español)</option>
                </select>
                <p className="text-sm text-text-tertiary mt-2">Applied to UI, receipts, and reports</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Currency Section */}
          <CollapsibleSection title="Currency" icon={DollarSign} defaultOpen={true}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      setCurrency(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Currency Symbol"
                  value={currencySymbol}
                  onChange={(e) => {
                    setCurrencySymbol(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="$"
                />

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Symbol Position
                  </label>
                  <select
                    value={currencyPosition}
                    onChange={(e) => {
                      setCurrencyPosition(e.target.value as 'before' | 'after');
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="before">Before amount ($100.00)</option>
                    <option value="after">After amount (100.00$)</option>
                  </select>
                </div>

                <Input
                  label="Decimal Places"
                  type="number"
                  value={decimalPlaces}
                  onChange={(e) => {
                    setDecimalPlaces(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="2"
                  min="0"
                  max="4"
                />
              </div>

              <div className="mt-4 p-4 bg-background-secondary rounded-lg border border-border-light">
                <div className="text-sm text-text-tertiary mb-2">Preview:</div>
                <div className="text-2xl font-bold text-text-primary">
                  {currencyPosition === 'before'
                    ? `${currencySymbol}${(1234.56).toFixed(parseInt(decimalPlaces))}`
                    : `${(1234.56).toFixed(parseInt(decimalPlaces))}${currencySymbol}`}
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* Tax Section */}
          <CollapsibleSection title="Tax Configuration" icon={DollarSign} defaultOpen={false}>
            <div className="space-y-4">
              <Toggle
                checked={taxEnabled}
                onChange={(checked) => {
                  setTaxEnabled(checked);
                  setHasUnsavedChanges(true);
                }}
                label="Enable Tax"
                description="Apply tax to transactions"
              />

              {taxEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    value={taxRate}
                    onChange={(e) => {
                      setTaxRate(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="13.00"
                    min="0"
                    max="100"
                    step="0.01"
                  />

                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-2">Tax Name</label>
                    <select
                      value={taxName}
                      onChange={(e) => {
                        setTaxName(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="GST">GST (Goods and Services Tax)</option>
                      <option value="HST">HST (Harmonized Sales Tax)</option>
                      <option value="PST">PST (Provincial Sales Tax)</option>
                      <option value="VAT">VAT (Value Added Tax)</option>
                      <option value="Sales Tax">Sales Tax</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* Date & Time Section */}
          <CollapsibleSection title="Date & Time" icon={Calendar} defaultOpen={false}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Date Format</label>
                  <select
                    value={dateFormat}
                    onChange={(e) => {
                      setDateFormat(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-01-28)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (01/28/2026)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (28/01/2026)</option>
                    <option value="DD-MMM-YYYY">DD-MMM-YYYY (28-Jan-2026)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Time Format</label>
                  <select
                    value={timeFormat}
                    onChange={(e) => {
                      setTimeFormat(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="24h">24-hour (14:30)</option>
                    <option value="12h">12-hour (2:30 PM)</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-text-primary mb-2">Timezone</label>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-background-secondary border border-border-DEFAULT rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.id} value={tz.id}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 p-4 bg-background-secondary rounded-lg border border-border-light">
                <div className="text-sm text-text-tertiary mb-2">Current Date/Time Preview:</div>
                <div className="text-lg font-semibold text-text-primary">
                  {new Date().toLocaleDateString('en-CA')}{' '}
                  {new Date().toLocaleTimeString('en-CA', { hour12: timeFormat === '12h' })}
                </div>
                <div className="text-sm text-text-tertiary mt-1">Timezone: {timezone}</div>
              </div>
            </div>
          </CollapsibleSection>
        </div>
      </div>

      {/* Sticky Footer with Save/Cancel */}
      <div className="border-t border-border-light bg-background-secondary px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {hasUnsavedChanges && (
              <span className="text-sm text-warning-DEFAULT flex items-center gap-2">
                <span className="w-2 h-2 bg-warning-DEFAULT rounded-full animate-pulse"></span>
                You have unsaved changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                // Reset to Canada-first defaults
                setLanguage('en');
                setCurrency(DEFAULT_STORE_LOCALE.currency);
                setCurrencySymbol('$');
                setCurrencyPosition('before');
                setDecimalPlaces('2');
                setTaxEnabled(true);
                setTaxRate('13.00');
                setTaxName('HST');
                setDateFormat('YYYY-MM-DD');
                setTimeFormat('24h');
                setTimezone(DEFAULT_STORE_LOCALE.timezone);
                setHasUnsavedChanges(false);
                toast.info('Changes discarded');
              }}
              variant="ghost"
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              variant="primary"
              loading={isLoading}
              disabled={!hasUnsavedChanges}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save All Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

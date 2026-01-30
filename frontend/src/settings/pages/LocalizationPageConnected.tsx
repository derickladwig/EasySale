import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { Globe, DollarSign, Calendar } from 'lucide-react';
import { useLocalizationSettings } from '../../hooks/useSettings';
import {
  CURRENCY_OPTIONS,
  TIMEZONE_OPTIONS,
  DEFAULT_STORE_LOCALE,
} from '../../config/localeDefaults';

export const LocalizationPageConnected: React.FC = () => {
  const { settings, isLoading, updateSettings, isUpdating } = useLocalizationSettings();

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

  // Update local state when settings are loaded (persisted values override defaults)
  useEffect(() => {
    if (settings) {
      setLanguage(settings.language);
      setCurrency(settings.currency);
      setCurrencySymbol(settings.currency_symbol);
      setCurrencyPosition(settings.currency_position as 'before' | 'after');
      setDecimalPlaces(settings.decimal_places.toString());
      setTaxEnabled(settings.tax_enabled);
      setTaxRate(settings.tax_rate.toString());
      setTaxName(settings.tax_name);
      setDateFormat(settings.date_format);
      setTimeFormat(settings.time_format);
      setTimezone(settings.timezone);
    }
  }, [settings]);

  const handleSaveSettings = () => {
    updateSettings({
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
      timezone,
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background-primary">
        <div className="text-text-secondary">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Localization</h1>
          <p className="text-text-secondary mt-2">Configure language, currency, and regional settings</p>
        </div>

        {/* Language Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Language</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Default Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="en">English</option>
                  <option value="fr">French (Français)</option>
                  <option value="es">Spanish (Español)</option>
                </select>
                <p className="text-sm text-text-tertiary mt-2">Applied to UI, receipts, and reports</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Currency Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Currency</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="$"
              />

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Symbol Position
                </label>
                <select
                  value={currencyPosition}
                  onChange={(e) => setCurrencyPosition(e.target.value as 'before' | 'after')}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="before">Before amount ($100.00)</option>
                  <option value="after">After amount (100.00$)</option>
                </select>
              </div>

              <Input
                label="Decimal Places"
                type="number"
                value={decimalPlaces}
                onChange={(e) => setDecimalPlaces(e.target.value)}
                placeholder="2"
                min="0"
                max="4"
              />
            </div>

            <div className="mt-4 p-4 bg-surface-base rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-2">Preview:</div>
              <div className="text-2xl font-bold text-text-primary">
                {currencyPosition === 'before'
                  ? `${currencySymbol}${(1234.56).toFixed(parseInt(decimalPlaces))}`
                  : `${(1234.56).toFixed(parseInt(decimalPlaces))}${currencySymbol}`}
              </div>
            </div>
          </div>
        </Card>

        {/* Tax Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Tax Configuration</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-surface-base rounded-lg">
                <div>
                  <div className="font-medium text-text-primary">Enable Tax</div>
                  <div className="text-sm text-text-tertiary">Apply tax to transactions</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-elevated peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {taxEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="13.00"
                    min="0"
                    max="100"
                    step="0.01"
                  />

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">Tax Name</label>
                    <select
                      value={taxName}
                      onChange={(e) => setTaxName(e.target.value)}
                      className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          </div>
        </Card>

        {/* Date & Time Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Date & Time</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Date Format</label>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2026-01-28)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (01/28/2026)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (28/01/2026)</option>
                  <option value="DD-MMM-YYYY">DD-MMM-YYYY (28-Jan-2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Time Format</label>
                <select
                  value={timeFormat}
                  onChange={(e) => setTimeFormat(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="24h">24-hour (14:30)</option>
                  <option value="12h">12-hour (2:30 PM)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-text-secondary mb-2">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.id} value={tz.id}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 p-4 bg-surface-base rounded-lg border border-border">
              <div className="text-sm text-text-tertiary mb-2">Current Date/Time Preview:</div>
              <div className="text-lg font-semibold text-text-primary">
                {new Date().toLocaleDateString('en-CA')}{' '}
                {new Date().toLocaleTimeString('en-CA', { hour12: timeFormat === '12h' })}
              </div>
              <div className="text-sm text-text-tertiary mt-1">Timezone: {timezone}</div>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} loading={isUpdating} variant="primary" size="lg">
            Save All Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

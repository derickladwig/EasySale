import React, { useState, useEffect } from 'react';
import { Card } from '@common/components/molecules/Card';
import { Button } from '@common/components/atoms/Button';
import { Input } from '@common/components/atoms/Input';
import { toast } from '@common/components/molecules/Toast';
import { Building2, MapPin, Phone, Mail, Plus, Edit, Trash2, Save } from 'lucide-react';
import { useConfig } from '../../config/ConfigProvider';

interface Store {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  receipt_footer: string;
  is_active: boolean;
}

export const CompanyStoresPage: React.FC = () => {
  const { branding, brandConfig } = useConfig();
  const [isLoading, setIsLoading] = useState(false);
  const [stores, _setStores] = useState<Store[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Company info state - initialized from config
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyZip, setCompanyZip] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');

  // Store original values for reset (from config)
  const [originalValues, setOriginalValues] = useState({
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyPhone: '',
    companyEmail: '',
  });

  // Initialize from config on mount
  useEffect(() => {
    const configCompanyName = branding?.company?.name || brandConfig?.company?.name || 'EasySale Store';
    const configStoreName = branding?.store?.name || brandConfig?.store?.name || '';
    
    // Use company name from config, or store name as fallback
    const displayName = configCompanyName !== 'EasySale' ? configCompanyName : (configStoreName || 'EasySale Store');
    
    const initialValues = {
      companyName: displayName,
      companyAddress: '',
      companyCity: '',
      companyState: '',
      companyZip: '',
      companyPhone: '',
      companyEmail: '',
    };

    setCompanyName(initialValues.companyName);
    setCompanyAddress(initialValues.companyAddress);
    setCompanyCity(initialValues.companyCity);
    setCompanyState(initialValues.companyState);
    setCompanyZip(initialValues.companyZip);
    setCompanyPhone(initialValues.companyPhone);
    setCompanyEmail(initialValues.companyEmail);
    setOriginalValues(initialValues);
  }, [branding, brandConfig]);

  const handleSaveCompanyInfo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/config/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyName,
          address: companyAddress,
          city: companyCity,
          state: companyState,
          zip: companyZip,
          phone: companyPhone,
          email: companyEmail
        })
      });
      if (!response.ok) throw new Error('Failed to update company information');
      
      // Update original values to reflect saved state
      setOriginalValues({
        companyName,
        companyAddress,
        companyCity,
        companyState,
        companyZip,
        companyPhone,
        companyEmail,
      });
      
      toast.success('Company information updated successfully');
      setHasUnsavedChanges(false);
    } catch {
      toast.error('Failed to update company information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStore = () => {
    toast.info('Store management is configured through the admin setup wizard. Contact your administrator to add new store locations.');
  };

  const handleEditStore = (store: Store) => {
    toast.info(`Edit store: ${store.name}`);
  };

  const handleDeleteStore = (store: Store) => {
    if (stores.length === 1) {
      toast.error('Cannot delete the last store');
      return;
    }
    toast.info(`Delete store: ${store.name}`);
  };

  const handleReset = () => {
    setCompanyName(originalValues.companyName);
    setCompanyAddress(originalValues.companyAddress);
    setCompanyCity(originalValues.companyCity);
    setCompanyState(originalValues.companyState);
    setCompanyZip(originalValues.companyZip);
    setCompanyPhone(originalValues.companyPhone);
    setCompanyEmail(originalValues.companyEmail);
    setHasUnsavedChanges(false);
    toast.info('Changes discarded');
  };

  return (
    <div className="h-full flex flex-col bg-background-primary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border-light">
        <h1 className="text-3xl font-bold text-text-primary">Company & Stores</h1>
        <p className="text-text-secondary mt-2">Manage company information and store locations</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Company Information Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Building2 className="w-5 h-5 text-primary-400" />
              <h2 className="text-xl font-semibold text-text-primary">Company Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e) => {
                    setCompanyName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter company name"
                />
              </div>

              <div className="md:col-span-2">
                <Input
                  label="Address"
                  value={companyAddress}
                  onChange={(e) => {
                    setCompanyAddress(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter street address"
                />
              </div>

              <Input
                label="City"
                value={companyCity}
                onChange={(e) => {
                  setCompanyCity(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter city"
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="State/Province"
                  value={companyState}
                  onChange={(e) => {
                    setCompanyState(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="ON"
                />
                <Input
                  label="ZIP/Postal Code"
                  value={companyZip}
                  onChange={(e) => {
                    setCompanyZip(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="M5H 2N2"
                />
              </div>

              <Input
                label="Phone"
                type="tel"
                value={companyPhone}
                onChange={(e) => {
                  setCompanyPhone(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="(416) 555-0100"
              />

              <Input
                label="Email"
                type="email"
                value={companyEmail}
                onChange={(e) => {
                  setCompanyEmail(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="info@company.com"
              />
            </div>
          </div>
        </Card>

        {/* Stores Section */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary-400" />
                <h2 className="text-xl font-semibold text-text-primary">Store Locations</h2>
              </div>
              <Button
                onClick={handleAddStore}
                variant="primary"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Store
              </Button>
            </div>

            <div className="space-y-4">
              {stores.length === 0 ? (
                <div className="text-center py-8 text-text-secondary">
                  <MapPin className="w-12 h-12 mx-auto mb-3 text-text-tertiary opacity-50" />
                  <p>No store locations configured yet.</p>
                  <p className="text-sm mt-1">Use the Setup Wizard to add your first store location.</p>
                </div>
              ) : (
                stores.map((store) => (
                  <div
                    key={store.id}
                    className="p-4 bg-background-secondary rounded-lg border border-border-light hover:border-border-DEFAULT transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-text-primary">{store.name}</h3>
                          {store.is_active ? (
                            <span className="px-2 py-1 text-xs font-medium bg-success-500/20 text-success-400 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-background-tertiary text-text-tertiary rounded">
                              Inactive
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-text-secondary">
                            <MapPin className="w-4 h-4 text-text-tertiary" />
                            <span>
                              {store.address}, {store.city}, {store.state} {store.zip}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-text-secondary">
                            <Phone className="w-4 h-4 text-text-tertiary" />
                            <span>{store.phone}</span>
                          </div>

                          <div className="flex items-center gap-2 text-text-secondary">
                            <Mail className="w-4 h-4 text-text-tertiary" />
                            <span>{store.email}</span>
                          </div>

                          <div className="text-text-secondary">
                            <span className="text-text-tertiary">Timezone:</span> {store.timezone}
                          </div>

                          <div className="text-text-secondary">
                            <span className="text-text-tertiary">Currency:</span> {store.currency}
                          </div>
                        </div>

                        {store.receipt_footer && (
                          <div className="mt-3 p-2 bg-background-primary rounded text-xs text-text-tertiary">
                            <span className="text-text-tertiary">Receipt Footer:</span>{' '}
                            {store.receipt_footer}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button onClick={() => handleEditStore(store)} variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteStore(store)}
                          variant="ghost"
                          size="sm"
                          disabled={stores.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
        </div>
      </div>

      {/* Sticky Footer with Save/Cancel */}
      <div className="border-t border-border-light bg-background-secondary px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
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
              onClick={handleReset}
              variant="ghost"
              disabled={!hasUnsavedChanges}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCompanyInfo}
              variant="primary"
              loading={isLoading}
              disabled={!hasUnsavedChanges}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

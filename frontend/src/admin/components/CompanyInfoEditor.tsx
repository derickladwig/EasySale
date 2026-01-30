import { useState, useEffect } from 'react';
import { Building2, Upload, Save } from 'lucide-react';
import { Button, Input } from '@common/components/atoms';
import { LogoWithFallback } from '@common/components/atoms/LogoWithFallback';

interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string | null;
}

export function CompanyInfoEditor() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    logo_url: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/company/info', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data);
        if (data.logo_url) {
          setLogoPreview(data.logo_url);
        }
      } else if (response.status === 404) {
        // Graceful fallback if endpoint not available
        console.warn('Company info endpoint not available - using defaults');
      }
    } catch (error) {
      console.error('Failed to fetch company info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CompanyInfo, value: string) => {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Upload logo if changed
      let logoUrl = companyInfo.logo_url;
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const uploadResponse = await fetch('/api/company/logo', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (uploadResponse.ok) {
          const { url } = await uploadResponse.json();
          logoUrl = url;
        } else if (uploadResponse.status === 404) {
          console.warn('Logo upload endpoint not available');
          // Continue without logo upload
        }
      }

      // Update company info
      const response = await fetch('/api/company/info', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...companyInfo, logo_url: logoUrl }),
      });

      if (response.ok) {
        alert('Company information updated successfully');
        fetchCompanyInfo();
      } else if (response.status === 404) {
        alert('Company info feature requires backend implementation');
      } else {
        throw new Error('Failed to update company info');
      }
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-secondary-500">Loading company information...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-secondary-900">Company Information</h2>
        </div>
        <Button onClick={handleSave} disabled={saving} leftIcon={<Save className="w-4 h-4" />}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Logo Upload */}
      <div className="p-4 bg-surface-base border border-border rounded-lg">
        <label className="block text-sm font-medium text-text-secondary mb-2">Company Logo</label>
        <div className="flex items-center gap-4">
          {logoPreview && (
            <LogoWithFallback
              logoUrl={logoPreview}
              companyName={companyInfo.name || 'Company'}
              size="lg"
              className="w-24 h-24 border border-border rounded"
              testId="company-logo-preview"
            />
          )}
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className="cursor-pointer">
              <span className="inline-block">
                <Button variant="secondary" leftIcon={<Upload className="w-4 h-4" />} type="button">
                  Upload Logo
                </Button>
              </span>
            </label>
            <p className="text-xs text-text-tertiary mt-1">
              PNG, JPG or SVG. Max 2MB. Recommended: 200x200px
            </p>
          </div>
        </div>
      </div>

      {/* Company Details */}
      <div className="p-4 bg-surface-base border border-border rounded-lg space-y-4">
        <h3 className="text-lg font-medium text-text-primary">Company Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Company Name *
            </label>
            <Input
              value={companyInfo.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter company name"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">Address</label>
            <Input
              value={companyInfo.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">City</label>
            <Input
              value={companyInfo.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              State/Province
            </label>
            <Input
              value={companyInfo.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="State"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              ZIP/Postal Code
            </label>
            <Input
              value={companyInfo.zip}
              onChange={(e) => handleChange('zip', e.target.value)}
              placeholder="ZIP code"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Country</label>
            <Input
              value={companyInfo.country}
              onChange={(e) => handleChange('country', e.target.value)}
              placeholder="Country"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="p-4 bg-surface-base border border-border rounded-lg space-y-4">
        <h3 className="text-lg font-medium text-text-primary">Contact Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              value={companyInfo.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={companyInfo.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="contact@company.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-secondary-700 mb-1">Website</label>
            <Input
              type="url"
              value={companyInfo.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://www.company.com"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

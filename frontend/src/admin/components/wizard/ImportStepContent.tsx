/**
 * ImportStepContent - Data Import
 * 
 * Optional step for importing products, customers, and vendors.
 * Features:
 * - CSV template downloads with all supported fields
 * - Field documentation showing required vs optional
 * - Demo data import for quick evaluation
 * - Custom attribute support (attr_* columns)
 * 
 * Validates: Requirements 7.2
 */

import React, { useState, useRef } from 'react';
import { 
  CheckCircle2, FileSpreadsheet, Users, Package, Download, Building2, 
  AlertCircle, ChevronDown, ChevronUp, Info, Sparkles, Trash2 
} from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import apiClient from '@common/utils/apiClient';
import { toast } from '@common/utils/toast';
import type { StepContentProps, ImportStepData } from './types';

// =============================================================================
// Field Documentation
// =============================================================================

const FIELD_DOCS = {
  products: {
    required: [
      { name: 'sku', description: 'Unique product identifier (e.g., PROD-001)' },
      { name: 'name', description: 'Product display name' },
      { name: 'category', description: 'Product category (e.g., Electronics, Apparel)' },
      { name: 'unit_price', description: 'Selling price (also accepts "price")' },
      { name: 'cost', description: 'Purchase/cost price' },
    ],
    optional: [
      { name: 'store_id', description: 'Store identifier (defaults to "default-store")' },
      { name: 'description', description: 'Product description text' },
      { name: 'subcategory', description: 'Product subcategory' },
      { name: 'quantity', description: 'Initial quantity on hand (default: 0)' },
      { name: 'reorder_point', description: 'Low stock alert threshold' },
      { name: 'barcode', description: 'Barcode value (UPC, EAN, etc.)' },
      { name: 'barcode_type', description: 'Barcode format: UPC-A, EAN-13, Code128, QR' },
      { name: 'is_active', description: 'Active status: true/false (default: true)' },
      { name: 'parent_sku', description: 'Parent product SKU for variants' },
      { name: 'images', description: 'Comma-separated image URLs' },
      { name: 'tax_class', description: 'Tax classification' },
      { name: 'notes', description: 'Internal notes' },
    ],
    customAttrs: [
      { name: 'attr_color', description: 'Product color' },
      { name: 'attr_size', description: 'Product size' },
      { name: 'attr_brand', description: 'Brand name' },
      { name: 'attr_weight', description: 'Product weight' },
      { name: 'attr_material', description: 'Material type' },
      { name: 'attr_custom_1', description: 'Custom attribute 1' },
      { name: 'attr_custom_2', description: 'Custom attribute 2' },
      { name: 'attr_custom_3', description: 'Custom attribute 3' },
    ],
    vendor: [
      { name: 'vendor_1_name', description: 'Primary vendor name' },
      { name: 'vendor_1_sku', description: 'Vendor\'s SKU for this product' },
      { name: 'vendor_1_cost', description: 'Cost from this vendor' },
      { name: 'vendor_2_name', description: 'Secondary vendor name' },
      { name: 'vendor_2_sku', description: 'Secondary vendor SKU' },
      { name: 'vendor_2_cost', description: 'Cost from secondary vendor' },
    ],
    altSkus: [
      { name: 'alt_sku_manufacturer', description: 'Manufacturer part number' },
      { name: 'alt_sku_upc', description: 'UPC code' },
      { name: 'alt_sku_ean', description: 'EAN code' },
    ],
  },
  customers: {
    required: [
      { name: 'first_name', description: 'Customer first name' },
      { name: 'last_name', description: 'Customer last name' },
    ],
    optional: [
      { name: 'email', description: 'Email address' },
      { name: 'phone', description: 'Phone number' },
      { name: 'company', description: 'Company name' },
      { name: 'address', description: 'Street address' },
      { name: 'city', description: 'City' },
      { name: 'state', description: 'State/Province' },
      { name: 'zip', description: 'ZIP/Postal code' },
      { name: 'country', description: 'Country code (e.g., US, CA)' },
      { name: 'pricing_tier', description: 'Pricing tier: retail, wholesale, vip' },
      { name: 'credit_limit', description: 'Credit limit amount' },
      { name: 'tax_exempt', description: 'Tax exempt: true/false' },
      { name: 'notes', description: 'Internal notes' },
    ],
  },
  vendors: {
    required: [
      { name: 'name', description: 'Vendor/supplier name' },
    ],
    optional: [
      { name: 'email', description: 'Contact email' },
      { name: 'phone', description: 'Contact phone' },
      { name: 'address', description: 'Full address' },
      { name: 'website', description: 'Vendor website URL' },
      { name: 'tax_id', description: 'Tax ID / EIN' },
      { name: 'contact_name', description: 'Primary contact person' },
      { name: 'payment_terms', description: 'Payment terms: Net 30, Net 15, etc.' },
      { name: 'notes', description: 'Internal notes' },
      { name: 'keywords', description: 'Detection keywords (comma-separated)' },
    ],
  },
};

// =============================================================================
// CSV Template Definitions
// =============================================================================

const IMPORT_TEMPLATES = {
  products: {
    csv: {
      filename: 'products_import_template.csv',
      headers: [
        // Required fields (marked with *)
        'sku*', 'name*', 'category*', 'unit_price*', 'cost*',
        // Optional standard fields
        'store_id', 'description', 'subcategory', 'quantity', 'reorder_point',
        'barcode', 'barcode_type', 'is_active', 'parent_sku', 'images', 'tax_class', 'notes',
        // Custom attributes
        'attr_color', 'attr_size', 'attr_brand', 'attr_weight', 'attr_material',
        'attr_custom_1', 'attr_custom_2', 'attr_custom_3',
        // Vendor information
        'vendor_1_name', 'vendor_1_sku', 'vendor_1_cost',
        'vendor_2_name', 'vendor_2_sku', 'vendor_2_cost',
        // Alt SKUs
        'alt_sku_manufacturer', 'alt_sku_upc', 'alt_sku_ean',
      ],
      sampleRows: [
        // Complete electronics product
        ['ELEC-001', 'Wireless Bluetooth Headphones', 'Electronics', '79.99', '35.00',
         'main-store', 'Premium wireless headphones with noise cancellation', 'Audio', '50', '10',
         '012345678901', 'UPC-A', 'true', '', '', 'standard', 'Best seller',
         'Black', 'One Size', 'SoundMax', '250g', 'Plastic/Metal',
         '', '', '',
         'Tech Distributors', 'TD-WBH-001', '32.00',
         '', '', '',
         'SM-WBH-2024', '012345678901', ''],
        // Clothing product with variants
        ['APRL-001', 'Cotton T-Shirt - Blue Large', 'Apparel', '29.99', '12.00',
         'main-store', 'Comfortable 100% cotton t-shirt', 'Shirts', '100', '20',
         '012345678902', 'EAN-13', 'true', '', '', 'clothing', '',
         'Blue', 'Large', 'ComfortWear', '200g', 'Cotton',
         '', '', '',
         'Textile World', 'TW-TS-BL-L', '10.00',
         '', '', '',
         'CW-TSH-BL-L', '012345678902', '4012345678901'],
        // Minimal product (required fields only)
        ['TOOL-001', 'Screwdriver Set', 'Tools', '45.00', '22.00',
         '', '', '', '', '',
         '', '', '', '', '', '', '',
         '', '', '', '', '',
         '', '', '',
         '', '', '',
         '', '', '',
         '', '', ''],
      ],
    },
  },
  customers: {
    csv: {
      filename: 'customers_import_template.csv',
      headers: [
        'first_name*', 'last_name*',
        'email', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country',
        'pricing_tier', 'credit_limit', 'tax_exempt', 'notes',
      ],
      sampleRows: [
        ['John', 'Doe', 'john.doe@example.com', '555-0100', 'Acme Corp', 
         '123 Main St', 'Anytown', 'CA', '90210', 'US',
         'retail', '1000.00', 'false', 'VIP customer'],
        ['Jane', 'Smith', 'jane.smith@example.com', '555-0101', 'Smith Industries', 
         '456 Oak Ave', 'Springfield', 'IL', '62701', 'US',
         'wholesale', '5000.00', 'true', 'Tax exempt - reseller'],
        ['Bob', 'Wilson', '', '555-0102', '', 
         '', '', '', '', '',
         '', '', '', ''],
      ],
    },
  },
  vendors: {
    csv: {
      filename: 'vendors_import_template.csv',
      headers: [
        'name*',
        'email', 'phone', 'address', 'website', 'tax_id',
        'contact_name', 'payment_terms', 'notes', 'keywords',
      ],
      sampleRows: [
        ['Tech Distributors', 'orders@techdist.com', '555-0200', 
         '789 Industrial Blvd, Commerce City, TX 75001', 'https://techdist.com', '12-3456789',
         'Bob Wilson', 'Net 30', 'Primary electronics supplier', 'TECH DIST,TD,TECHDIST'],
        ['Textile World', 'sales@textileworld.com', '555-0201', 
         '321 Factory Rd, Detroit, MI 48201', 'https://textileworld.com', '98-7654321',
         'Alice Brown', 'Net 15', 'Clothing and fabric supplier', 'TEXTILE,TW,TEXTILE WORLD'],
        ['General Supplies Co', '', '555-0202', 
         '', '', '',
         '', 'Net 30', '', 'GSC,GENERAL'],
      ],
    },
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateCSVContent(type: 'products' | 'customers' | 'vendors'): string {
  const template = IMPORT_TEMPLATES[type].csv;
  
  // Add comment header explaining the format
  const commentLines = [
    `# ${type.charAt(0).toUpperCase() + type.slice(1)} Import Template`,
    '# Fields marked with * are REQUIRED, all others are optional',
    '# Columns can be in ANY ORDER - only include the columns you need',
    '# Custom attributes: any column starting with "attr_" will be saved as a custom attribute',
    '#',
  ];
  
  const dataLines = [
    template.headers.join(','),
    ...template.sampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ];
  
  return [...commentLines, ...dataLines].join('\n');
}

function downloadTemplate(type: 'products' | 'customers' | 'vendors') {
  const content = generateCSVContent(type);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = IMPORT_TEMPLATES[type].csv.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// Field Reference Component
// =============================================================================

interface FieldReferenceProps {
  type: 'products' | 'customers' | 'vendors';
  isExpanded: boolean;
  onToggle: () => void;
}

function FieldReference({ type, isExpanded, onToggle }: FieldReferenceProps) {
  const docs = FIELD_DOCS[type];
  
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 text-xs text-text-tertiary hover:text-accent transition-colors"
      >
        <Info className="w-3 h-3" />
        <span>Field Reference</span>
        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      
      {isExpanded && (
        <div className="mt-2 p-3 bg-surface-elevated rounded-lg border border-border text-xs space-y-3 max-h-64 overflow-y-auto">
          {/* Info banner */}
          <div className="p-2 bg-accent/10 rounded text-accent border border-accent/20">
            CSV columns can be in any order. Only required fields must be present.
          </div>
          
          {/* Required fields */}
          <div>
            <h4 className="font-medium text-error-400 mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error-400" />
              Required Fields
            </h4>
            <div className="grid grid-cols-1 gap-1">
              {docs.required.map(f => (
                <div key={f.name} className="flex items-start gap-2">
                  <code className="text-accent bg-accent/10 px-1 rounded flex-shrink-0">{f.name}*</code>
                  <span className="text-text-muted">{f.description}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Optional fields */}
          <div>
            <h4 className="font-medium text-text-secondary mb-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted" />
              Optional Fields
            </h4>
            <div className="grid grid-cols-1 gap-1">
              {docs.optional.map(f => (
                <div key={f.name} className="flex items-start gap-2">
                  <code className="text-text-tertiary bg-surface-base px-1 rounded flex-shrink-0">{f.name}</code>
                  <span className="text-text-muted">{f.description}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Custom attributes (products only) */}
          {type === 'products' && 'customAttrs' in docs && (
            <div>
              <h4 className="font-medium text-warning-400 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-warning-400" />
                Custom Attributes (attr_*)
              </h4>
              <p className="text-text-muted mb-1">Any column starting with "attr_" becomes a custom attribute.</p>
              <div className="grid grid-cols-2 gap-1">
                {(docs as typeof FIELD_DOCS.products).customAttrs.map(f => (
                  <div key={f.name} className="flex items-start gap-1">
                    <code className="text-warning-400 bg-warning-400/10 px-1 rounded text-[10px]">{f.name}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Vendor info (products only) */}
          {type === 'products' && 'vendor' in docs && (
            <div>
              <h4 className="font-medium text-info-400 mb-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-info-400" />
                Vendor Information
              </h4>
              <p className="text-text-muted mb-1">Link products to vendors (supports up to 3 vendors).</p>
              <div className="grid grid-cols-1 gap-1">
                {(docs as typeof FIELD_DOCS.products).vendor.slice(0, 3).map(f => (
                  <div key={f.name} className="flex items-start gap-2">
                    <code className="text-info-400 bg-info-400/10 px-1 rounded flex-shrink-0">{f.name}</code>
                    <span className="text-text-muted">{f.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Import Section Component
// =============================================================================

interface ImportSectionProps {
  type: 'products' | 'customers' | 'vendors';
  icon: React.ElementType;
  title: string;
  description: string;
  file: File | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  status: 'idle' | 'importing' | 'done' | 'error';
  count: number;
  error?: string;
  onFileSelect: (type: 'products' | 'customers' | 'vendors') => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: (type: 'products' | 'customers' | 'vendors') => void;
  onLoadDemo: (type: 'products' | 'customers' | 'vendors') => void;
  demoLoading: boolean;
  showFieldRef: boolean;
  onToggleFieldRef: () => void;
}

function ImportSection({ 
  type, 
  icon: Icon, 
  title, 
  description,
  file,
  fileRef,
  status,
  count,
  error,
  onFileSelect,
  onImport,
  onLoadDemo,
  demoLoading,
  showFieldRef,
  onToggleFieldRef,
}: ImportSectionProps) {
  return (
    <div className="bg-surface-base border border-border rounded-lg p-4">
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={onFileSelect(type)}
        className="hidden"
      />

      <div className="flex items-center gap-3">
        {/* Icon and Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            status === 'done' ? 'bg-success/20' : status === 'error' ? 'bg-error/20' : 'bg-accent/10'
          }`}>
            {status === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : status === 'error' ? (
              <AlertCircle className="w-5 h-5 text-error" />
            ) : (
              <Icon className="w-5 h-5 text-accent" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary">{title}</h3>
              {status === 'done' && (
                <span className="text-xs text-success px-1.5 py-0.5 bg-success/10 rounded">
                  {count} imported
                </span>
              )}
            </div>
            {status === 'error' ? (
              <p className="text-xs text-error truncate" title={error}>{error || 'Import failed'}</p>
            ) : (
              <p className="text-xs text-text-tertiary">{description}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Demo Data Button */}
          <button
            type="button"
            onClick={() => onLoadDemo(type)}
            disabled={demoLoading || status === 'done'}
            className="text-xs text-warning hover:text-warning/80 flex items-center gap-1 transition-colors px-2 py-1 bg-warning/10 rounded hover:bg-warning/20 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Load demo data for evaluation"
          >
            <Sparkles className="w-3 h-3" />
            <span className="hidden sm:inline">Demo</span>
          </button>
          
          {/* Template Download */}
          <button
            type="button"
            onClick={() => downloadTemplate(type)}
            className="text-xs text-text-tertiary hover:text-accent flex items-center gap-1 transition-colors"
            title="Download CSV template with all fields"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Template</span>
          </button>
          
          {status === 'done' ? (
            <span className="text-xs text-success px-2 py-1 bg-success/10 rounded">Done</span>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="text-xs h-8 px-3"
              >
                {file ? (
                  <span className="max-w-[80px] truncate">{file.name}</span>
                ) : (
                  <>
                    <FileSpreadsheet className="w-3 h-3 mr-1" />
                    Select CSV
                  </>
                )}
              </Button>
              {file && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => onImport(type)}
                  loading={status === 'importing'}
                  className="text-xs h-8 px-3"
                >
                  {status === 'error' ? 'Retry' : 'Import'}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Field Reference - Collapsible */}
      <FieldReference 
        type={type} 
        isExpanded={showFieldRef} 
        onToggle={onToggleFieldRef}
      />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ImportStepContent({
  onComplete,
  data,
  isComplete,
}: StepContentProps<ImportStepData>) {
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [customersFile, setCustomersFile] = useState<File | null>(null);
  const [vendorsFile, setVendorsFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{
    products: 'idle' | 'importing' | 'done' | 'error';
    customers: 'idle' | 'importing' | 'done' | 'error';
    vendors: 'idle' | 'importing' | 'done' | 'error';
  }>({ products: 'idle', customers: 'idle', vendors: 'idle' });
  const [importCounts, setImportCounts] = useState({ products: 0, customers: 0, vendors: 0 });
  const [importErrors, setImportErrors] = useState<{ products?: string; customers?: string; vendors?: string }>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [showFieldRef, setShowFieldRef] = useState<{ products: boolean; customers: boolean; vendors: boolean }>({
    products: false, customers: false, vendors: false
  });
  
  const productsRef = useRef<HTMLInputElement>(null);
  const customersRef = useRef<HTMLInputElement>(null);
  const vendorsRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: 'products' | 'customers' | 'vendors') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportErrors(prev => ({ ...prev, [type]: undefined }));
      
      if (type === 'products') {
        setProductsFile(file);
      } else if (type === 'customers') {
        setCustomersFile(file);
      } else {
        setVendorsFile(file);
      }
    }
  };

  const handleImport = async (type: 'products' | 'customers' | 'vendors') => {
    const file = type === 'products' ? productsFile : type === 'customers' ? customersFile : vendorsFile;
    if (!file) return;

    setImportStatus((prev) => ({ ...prev, [type]: 'importing' }));
    setImportErrors(prev => ({ ...prev, [type]: undefined }));
    
    try {
      const csvData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      
      const response = await apiClient.post<{ 
        imported: number; 
        skipped: number; 
        errors: Array<{ row: number; field?: string; message: string }> 
      }>('/api/setup/import', { entity_type: type, csv_data: csvData });
      
      if (response && typeof response.imported === 'number') {
        setImportCounts((prev) => ({ ...prev, [type]: response.imported }));
        
        if (response.errors && response.errors.length > 0) {
          const errorSummary = response.errors.slice(0, 3).map(e => 
            `Row ${e.row}: ${e.message}`
          ).join('; ');
          const moreErrors = response.errors.length > 3 ? ` (+${response.errors.length - 3} more)` : '';
          
          if (response.imported > 0) {
            setImportStatus((prev) => ({ ...prev, [type]: 'done' }));
            toast.warning(`Imported ${response.imported} with ${response.errors.length} warnings`);
          } else {
            setImportErrors(prev => ({ ...prev, [type]: `${errorSummary}${moreErrors}` }));
            setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
          }
        } else {
          setImportStatus((prev) => ({ ...prev, [type]: 'done' }));
          toast.success(`Successfully imported ${response.imported} ${type}`);
        }
      } else {
        setImportErrors(prev => ({ 
          ...prev, 
          [type]: 'Unexpected response from server' 
        }));
        setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setImportErrors(prev => ({ ...prev, [type]: errorMessage }));
      setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
    }
  };

  const handleLoadDemo = async (type: 'products' | 'customers' | 'vendors') => {
    setDemoLoading(true);
    try {
      const response = await apiClient.post<{ 
        imported: { products: number; customers: number; vendors: number } 
      }>('/api/setup/import-demo', { entity_types: [type] });
      
      if (response?.imported) {
        const count = response.imported[type] || 0;
        setImportCounts(prev => ({ ...prev, [type]: prev[type] + count }));
        setImportStatus(prev => ({ ...prev, [type]: 'done' }));
        toast.success(`Loaded ${count} demo ${type}`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load demo data';
      toast.error(msg);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLoadAllDemo = async () => {
    setDemoLoading(true);
    try {
      const response = await apiClient.post<{ 
        imported: { products: number; customers: number; vendors: number } 
      }>('/api/setup/import-demo', { entity_types: ['products', 'customers', 'vendors'] });
      
      if (response?.imported) {
        setImportCounts({
          products: response.imported.products || 0,
          customers: response.imported.customers || 0,
          vendors: response.imported.vendors || 0,
        });
        setImportStatus({
          products: response.imported.products > 0 ? 'done' : 'idle',
          customers: response.imported.customers > 0 ? 'done' : 'idle',
          vendors: response.imported.vendors > 0 ? 'done' : 'idle',
        });
        toast.success('Demo data loaded successfully!');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to load demo data';
      toast.error(msg);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleClearDemo = async () => {
    try {
      await apiClient.delete('/api/setup/clear-demo');
      setImportCounts({ products: 0, customers: 0, vendors: 0 });
      setImportStatus({ products: 'idle', customers: 'idle', vendors: 'idle' });
      toast.success('Demo data cleared');
    } catch (error) {
      toast.error('Failed to clear demo data');
    }
  };

  const handleComplete = () => {
    onComplete({
      productsImported: importCounts.products,
      customersImported: importCounts.customers,
    });
  };

  const toggleFieldRef = (type: 'products' | 'customers' | 'vendors') => {
    setShowFieldRef(prev => ({ ...prev, [type]: !prev[type] }));
  };

  if (isComplete) {
    return (
      <div className="bg-success/10 border border-success/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success" />
          <div>
            <h3 className="text-lg font-medium text-success">Data Imported</h3>
            <p className="text-success/80 text-sm mt-1">
              {data?.productsImported || 0} products • {data?.customersImported || 0} customers
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasAnyImports = importCounts.products > 0 || importCounts.customers > 0 || importCounts.vendors > 0;

  return (
    <div className="space-y-4 py-2">
      {/* Header with instructions */}
      <div className="space-y-2">
        <p className="text-text-secondary text-sm">
          Import existing data from CSV files or load demo data for evaluation.
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 bg-accent/10 text-accent rounded">
            Download templates for correct format
          </span>
          <span className="px-2 py-1 bg-warning/10 text-warning rounded">
            Demo data available for quick start
          </span>
          <span className="px-2 py-1 bg-surface-elevated text-text-muted rounded">
            Can also import later from Admin → Data
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2 p-3 bg-surface-elevated rounded-lg border border-border">
        <Sparkles className="w-4 h-4 text-warning" />
        <span className="text-sm text-text-secondary flex-1">Quick start with demo data:</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLoadAllDemo}
          loading={demoLoading}
          className="text-xs bg-warning/10 border-warning/30 text-warning hover:bg-warning/20"
        >
          <Sparkles className="w-3 h-3 mr-1" />
          Load All Demo Data
        </Button>
        {hasAnyImports && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearDemo}
            className="text-xs text-error border-error/30 hover:bg-error/10"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Import Sections */}
      <div className="space-y-3">
        <ImportSection
          type="products"
          icon={Package}
          title="Products"
          description="Product catalog with pricing, inventory, and attributes"
          file={productsFile}
          fileRef={productsRef}
          status={importStatus.products}
          count={importCounts.products}
          error={importErrors.products}
          onFileSelect={handleFileSelect}
          onImport={handleImport}
          onLoadDemo={handleLoadDemo}
          demoLoading={demoLoading}
          showFieldRef={showFieldRef.products}
          onToggleFieldRef={() => toggleFieldRef('products')}
        />

        <ImportSection
          type="customers"
          icon={Users}
          title="Customers"
          description="Customer list with contact info and pricing tiers"
          file={customersFile}
          fileRef={customersRef}
          status={importStatus.customers}
          count={importCounts.customers}
          error={importErrors.customers}
          onFileSelect={handleFileSelect}
          onImport={handleImport}
          onLoadDemo={handleLoadDemo}
          demoLoading={demoLoading}
          showFieldRef={showFieldRef.customers}
          onToggleFieldRef={() => toggleFieldRef('customers')}
        />

        <ImportSection
          type="vendors"
          icon={Building2}
          title="Vendors"
          description="Supplier list with contact and payment terms"
          file={vendorsFile}
          fileRef={vendorsRef}
          status={importStatus.vendors}
          count={importCounts.vendors}
          error={importErrors.vendors}
          onFileSelect={handleFileSelect}
          onImport={handleImport}
          onLoadDemo={handleLoadDemo}
          demoLoading={demoLoading}
          showFieldRef={showFieldRef.vendors}
          onToggleFieldRef={() => toggleFieldRef('vendors')}
        />
      </div>

      {/* Summary */}
      {hasAnyImports && (
        <div className="text-sm text-text-secondary text-center py-3 border-t border-border bg-surface-elevated rounded-lg">
          <span className="font-medium">Imported:</span>{' '}
          {importCounts.products > 0 && <span className="text-accent">{importCounts.products} products</span>}
          {importCounts.products > 0 && importCounts.customers > 0 && ' • '}
          {importCounts.customers > 0 && <span className="text-accent">{importCounts.customers} customers</span>}
          {(importCounts.products > 0 || importCounts.customers > 0) && importCounts.vendors > 0 && ' • '}
          {importCounts.vendors > 0 && <span className="text-accent">{importCounts.vendors} vendors</span>}
        </div>
      )}

      {/* Continue Button */}
      <Button
        type="button"
        variant="primary"
        onClick={handleComplete}
        className="w-full"
      >
        {hasAnyImports ? 'Continue' : 'Skip Import'}
      </Button>
    </div>
  );
}

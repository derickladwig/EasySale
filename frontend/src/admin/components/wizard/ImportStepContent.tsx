/**
 * ImportStepContent - Data Import
 * 
 * Optional step for importing products and customers.
 * Validates: Requirements 7.2
 */

import React, { useState, useRef } from 'react';
import { CheckCircle2, FileSpreadsheet, Users, Package, Download, Building2, AlertCircle } from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import apiClient from '@common/utils/apiClient';
import type { StepContentProps, ImportStepData } from './types';

// Import template definitions
// Fields marked with * are required, all others are optional
const IMPORT_TEMPLATES = {
  products: {
    csv: {
      filename: 'products_import_template.csv',
      // Core fields (* = required by backend)
      // Backend requires: sku, name, category, unit_price (or price), cost
      // store_id defaults to "default-store" if not provided
      headers: [
        'sku',            // Required: Unique product identifier
        'name',           // Required: Product name
        'category',       // Required: Product category
        'unit_price',     // Required: Selling price (backend also accepts 'price')
        'cost',           // Required: Cost/purchase price
        'store_id',       // Optional: Store identifier (defaults to default-store)
        'description',    // Optional: Product description
        'subcategory',    // Optional: Product subcategory
        'quantity',       // Optional: Initial quantity on hand (default: 0)
        'reorder_point',  // Optional: Low stock alert threshold
        'barcode',        // Optional: Barcode value (UPC, EAN, etc.)
        'barcode_type',   // Optional: Barcode format (UPC-A, EAN-13, Code128, QR)
        'is_active',      // Optional: Active status (true/false, default: true)
        // Dynamic attributes (any column starting with attr_)
        'attr_color',     // Optional: Custom attribute - color
        'attr_size',      // Optional: Custom attribute - size
        'attr_brand',     // Optional: Custom attribute - brand
        // Vendor information (vendor_1_name, vendor_1_sku, vendor_1_cost pattern)
        'vendor_1_name',  // Optional: Primary vendor/supplier name
        'vendor_1_sku',   // Optional: Vendor's SKU for this product
        'vendor_1_cost',  // Optional: Cost from this vendor
      ],
      sampleRows: [
        // Example 1: Complete product with all common fields
        ['WIDGET-001', 'Blue Widget', 'Electronics', '19.99', '10.00', 'main-store', 'High-quality widget', 'Gadgets', '100', '10', '012345678905', 'UPC-A', 'true', 'Blue', 'Standard', 'Acme', 'Acme Supplies', 'ACME-W001', '8.00'],
        // Example 2: Product with attributes
        ['SHIRT-001', 'Cotton T-Shirt', 'Apparel', '29.99', '12.00', 'main-store', 'Comfortable cotton t-shirt', 'Shirts', '50', '5', '012345678912', 'EAN-13', 'true', 'Blue', 'Large', 'StyleCo', 'Textile World', 'TW-TS-BL-L', '10.00'],
        // Example 3: Minimal product (only required fields + store_id)
        ['TOOL-001', 'Screwdriver Set', 'Tools', '45.00', '22.00', 'main-store', '', '', '', '', '', '', 'true', '', '', '', '', '', ''],
      ],
    },
    excel: {
      filename: 'products_import_template.xlsx',
    },
  },
  customers: {
    csv: {
      filename: 'customers_import_template.csv',
      headers: ['first_name', 'last_name', 'email', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country', 'notes'],
      sampleRows: [
        ['John', 'Doe', 'john.doe@example.com', '555-0100', 'Acme Corp', '123 Main St', 'Anytown', 'CA', '90210', 'US', 'VIP customer'],
        ['Jane', 'Smith', 'jane.smith@example.com', '555-0101', '', '456 Oak Ave', 'Springfield', 'IL', '62701', 'US', ''],
      ],
    },
    excel: {
      filename: 'customers_import_template.xlsx',
    },
  },
  vendors: {
    csv: {
      filename: 'vendors_import_template.csv',
      // Fields marked with * are required
      headers: [
        'name*',          // Required: Vendor/supplier name
        'email',          // Optional: Contact email
        'phone',          // Optional: Contact phone
        'address',        // Optional: Full address
        'website',        // Optional: Vendor website URL
        'tax_id',         // Optional: Tax ID / EIN
        'contact_name',   // Optional: Primary contact person
        'payment_terms',  // Optional: Payment terms (Net 30, Net 15, etc.)
        'notes',          // Optional: Internal notes
        // Identifier keywords for auto-detection (comma-separated)
        'keywords',       // Optional: Keywords for vendor detection (e.g., "ACME,ACME SUPPLY")
      ],
      sampleRows: [
        ['Supplier Inc', 'bob@supplier.com', '555-0200', '789 Industrial Blvd, Commerce City, TX 75001', 'https://supplier.com', '12-3456789', 'Bob Wilson', 'Net 30', 'Primary supplier', 'SUPPLIER,SUPPLIER INC'],
        ['Parts Co', 'alice@partsco.com', '555-0201', '321 Factory Rd, Detroit, MI 48201', '', '', 'Alice Brown', 'Net 15', '', 'PARTS CO,PARTSCO'],
      ],
    },
    excel: {
      filename: 'vendors_import_template.xlsx',
    },
  },
};

// Generate CSV content from template definition
function generateCSVContent(type: 'products' | 'customers' | 'vendors'): string {
  const template = IMPORT_TEMPLATES[type].csv;
  const lines = [
    template.headers.join(','),
    ...template.sampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ];
  return lines.join('\n');
}

// Download a template file
function downloadTemplate(type: 'products' | 'customers' | 'vendors', format: 'csv') {
  // Only CSV is supported - Excel requires a proper library
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

// Helper component for import section - defined outside to avoid recreation on each render
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
}: ImportSectionProps) {
  return (
    <div className="bg-surface-base border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className="w-6 h-6 text-primary-400" />
          <div>
            <h3 className="font-medium text-white">{title}</h3>
            <p className="text-sm text-text-tertiary">{description}</p>
          </div>
        </div>
        {/* Template Download Button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadTemplate(type, 'csv')}
            leftIcon={<Download className="w-3 h-3" />}
            className="text-xs"
          >
            Download Template
          </Button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={onFileSelect(type)}
        className="hidden"
      />

      {status === 'done' ? (
        <div className="flex items-center gap-2 text-success-400">
          <CheckCircle2 className="w-5 h-5" />
          <span>{count} {type} imported</span>
        </div>
      ) : status === 'error' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-error-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">{error || 'Import failed'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              leftIcon={<FileSpreadsheet className="w-4 h-4" />}
            >
              {file ? file.name : 'Select File'}
            </Button>
            {file && (
              <Button
                type="button"
                variant="primary"
                onClick={() => onImport(type)}
              >
                Retry Import
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            {file ? file.name : 'Select File'}
          </Button>
          {file && (
            <Button
              type="button"
              variant="primary"
              onClick={() => onImport(type)}
              loading={status === 'importing'}
            >
              Import
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const productsRef = useRef<HTMLInputElement>(null);
  const customersRef = useRef<HTMLInputElement>(null);
  const vendorsRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (type: 'products' | 'customers' | 'vendors') => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Clear any previous errors
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
      // Read file content as text
      const csvData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      });
      
      // Call backend API to import data
      // Use setup-specific endpoint during wizard (no auth required)
      // Backend expects { entity_type, csv_data }
      const response = await apiClient.post<{ imported: number; skipped: number; errors: Array<{ row: number; field?: string; message: string }> }>(
        '/api/setup/import',
        { entity_type: type, csv_data: csvData }
      );
      
      // Check for successful import
      if (response && typeof response.imported === 'number') {
        setImportCounts((prev) => ({ ...prev, [type]: response.imported }));
        
        // If there were errors but some imports succeeded, show partial success
        if (response.errors && response.errors.length > 0) {
          const errorSummary = response.errors.slice(0, 3).map(e => 
            `Row ${e.row}: ${e.message}`
          ).join('; ');
          const moreErrors = response.errors.length > 3 ? ` (+${response.errors.length - 3} more)` : '';
          
          if (response.imported > 0) {
            // Partial success - show as done with warning
            setImportStatus((prev) => ({ ...prev, [type]: 'done' }));
            console.warn(`Import completed with ${response.errors.length} errors: ${errorSummary}${moreErrors}`);
          } else {
            // All failed
            setImportErrors(prev => ({ ...prev, [type]: `${errorSummary}${moreErrors}` }));
            setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
          }
        } else {
          setImportStatus((prev) => ({ ...prev, [type]: 'done' }));
        }
      } else {
        // Backend returned unexpected response
        setImportErrors(prev => ({ 
          ...prev, 
          [type]: 'Unexpected response from server. Please try again.' 
        }));
        setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Import failed';
      setImportErrors(prev => ({ ...prev, [type]: errorMessage }));
      setImportStatus((prev) => ({ ...prev, [type]: 'error' }));
    }
  };

  const handleComplete = () => {
    onComplete({
      productsImported: importCounts.products,
      customersImported: importCounts.customers,
    });
  };

  if (isComplete) {
    return (
      <div className="bg-success-500/10 border border-success-500/30 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-success-400" />
          <div>
            <h3 className="text-lg font-medium text-success-300">
              Data Imported
            </h3>
            <p className="text-success-400/80 text-sm mt-1">
              {data?.productsImported || 0} products • {data?.customersImported || 0} customers
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-text-tertiary text-sm">
        Import your existing data from CSV or Excel files. Download templates to see the required format.
        You can also do this later from Admin → Data & Imports.
      </p>

      {/* Products Import */}
      <ImportSection
        type="products"
        icon={Package}
        title="Products"
        description="Import your product catalog"
        file={productsFile}
        fileRef={productsRef}
        status={importStatus.products}
        count={importCounts.products}
        error={importErrors.products}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
      />

      {/* Customers Import */}
      <ImportSection
        type="customers"
        icon={Users}
        title="Customers"
        description="Import your customer list"
        file={customersFile}
        fileRef={customersRef}
        status={importStatus.customers}
        count={importCounts.customers}
        error={importErrors.customers}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
      />

      {/* Vendors Import */}
      <ImportSection
        type="vendors"
        icon={Building2}
        title="Vendors"
        description="Import your supplier/vendor list"
        file={vendorsFile}
        fileRef={vendorsRef}
        status={importStatus.vendors}
        count={importCounts.vendors}
        error={importErrors.vendors}
        onFileSelect={handleFileSelect}
        onImport={handleImport}
      />

      <Button
        type="button"
        variant="primary"
        onClick={handleComplete}
        className="w-full"
      >
        {importCounts.products > 0 || importCounts.customers > 0 || importCounts.vendors > 0
          ? 'Continue'
          : 'Skip Import'}
      </Button>
    </div>
  );
}

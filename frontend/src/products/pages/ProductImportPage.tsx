/**
 * ProductImportPage - Comprehensive product import with walkthrough
 * 
 * Features:
 * - Visual step-by-step guide
 * - Dynamic attribute support
 * - Cross-linked SKU handling
 * - Vendor SKU mapping
 * - Real-time validation
 */

import React, { useState, useCallback } from 'react';
import { 
  Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, 
  HelpCircle, ChevronRight, Package, Link2, Tag, Building2,
  Info, ArrowRight, X
} from 'lucide-react';
import { Button } from '@common/components/atoms/Button';
import { toast } from '@common/components/molecules/Toast';
import apiClient from '@common/utils/apiClient';

interface ImportError {
  row: number;
  field: string | null;
  message: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  errors: ImportError[];
}

// Field definitions with metadata
const PRODUCT_FIELDS = {
  required: [
    { name: 'sku', label: 'SKU', description: 'Unique product identifier', example: 'PROD-001' },
    { name: 'name', label: 'Product Name', description: 'Display name', example: 'Blue Widget' },
    { name: 'category', label: 'Category', description: 'Product category', example: 'Electronics' },
    { name: 'unit_price', label: 'Price', description: 'Selling price', example: '29.99' },
    { name: 'cost', label: 'Cost', description: 'Purchase cost', example: '15.00' },
    { name: 'store_id', label: 'Store ID', description: 'Store identifier', example: 'store-001' },
  ],
  optional: [
    { name: 'description', label: 'Description', description: 'Product description' },
    { name: 'subcategory', label: 'Subcategory', description: 'Product subcategory' },
    { name: 'quantity', label: 'Quantity', description: 'Initial stock quantity' },
    { name: 'reorder_point', label: 'Reorder Point', description: 'Low stock threshold' },
    { name: 'barcode', label: 'Barcode', description: 'UPC/EAN barcode' },
    { name: 'barcode_type', label: 'Barcode Type', description: 'UPC-A, EAN-13, Code128' },
    { name: 'is_active', label: 'Active', description: 'true/false' },
  ],
};


const CROSS_LINK_FIELDS = [
  { name: 'alt_sku_manufacturer', label: 'Manufacturer SKU', description: 'Manufacturer part number' },
  { name: 'alt_sku_upc', label: 'UPC Code', description: 'Universal Product Code' },
  { name: 'alt_sku_ean', label: 'EAN Code', description: 'European Article Number' },
  { name: 'alt_sku_vendor_1', label: 'Vendor 1 SKU', description: 'First vendor SKU' },
  { name: 'alt_sku_vendor_2', label: 'Vendor 2 SKU', description: 'Second vendor SKU' },
  { name: 'alt_sku_vendor_3', label: 'Vendor 3 SKU', description: 'Third vendor SKU' },
];

const VENDOR_FIELDS = [
  { name: 'vendor_1_name', label: 'Vendor 1 Name', description: 'Primary vendor name' },
  { name: 'vendor_1_sku', label: 'Vendor 1 SKU', description: 'SKU used by vendor 1' },
  { name: 'vendor_1_cost', label: 'Vendor 1 Cost', description: 'Cost from vendor 1' },
  { name: 'vendor_2_name', label: 'Vendor 2 Name', description: 'Secondary vendor name' },
  { name: 'vendor_2_sku', label: 'Vendor 2 SKU', description: 'SKU used by vendor 2' },
  { name: 'vendor_2_cost', label: 'Vendor 2 Cost', description: 'Cost from vendor 2' },
];

type ImportStep = 'guide' | 'upload' | 'mapping' | 'validate' | 'import' | 'complete';

export function ProductImportPage() {
  const [step, setStep] = useState<ImportStep>('guide');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [customAttributes, setCustomAttributes] = useState<string[]>(['color', 'size', 'brand']);
  const [newAttribute, setNewAttribute] = useState('');
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    
    try {
      const text = await selectedFile.text();
      setCsvData(text);
      
      // Parse headers
      const lines = text.split('\n');
      if (lines.length > 0) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').replace('*', ''));
        setCsvHeaders(headers);
      }
      
      setStep('mapping');
    } catch {
      toast.error('Failed to read file');
    }
  }, []);


  const addCustomAttribute = useCallback(() => {
    if (newAttribute && !customAttributes.includes(newAttribute.toLowerCase())) {
      setCustomAttributes(prev => [...prev, newAttribute.toLowerCase()]);
      setNewAttribute('');
    }
  }, [newAttribute, customAttributes]);

  const removeCustomAttribute = useCallback((attr: string) => {
    setCustomAttributes(prev => prev.filter(a => a !== attr));
  }, []);

  const generateTemplate = useCallback(() => {
    const headers = [
      // Required fields
      ...PRODUCT_FIELDS.required.map(f => `${f.name}*`),
      // Optional fields
      ...PRODUCT_FIELDS.optional.map(f => f.name),
      // Cross-link fields
      ...CROSS_LINK_FIELDS.map(f => f.name),
      // Vendor fields
      ...VENDOR_FIELDS.map(f => f.name),
      // Custom attributes
      ...customAttributes.map(a => `attr_${a}`),
    ];

    // Sample rows with proper demo data matching header order exactly:
    // Required: sku*, name*, category*, unit_price*, cost*, store_id*
    // Optional: description, subcategory, quantity, reorder_point, barcode, barcode_type, is_active
    // Cross-link: alt_sku_manufacturer, alt_sku_upc, alt_sku_ean, alt_sku_vendor_1, alt_sku_vendor_2, alt_sku_vendor_3
    // Vendor: vendor_1_name, vendor_1_sku, vendor_1_cost, vendor_2_name, vendor_2_sku, vendor_2_cost
    const sampleRows = [
      // Row 1: Complete example with all fields
      [
        'WIDGET-001', 'Blue Widget', 'Electronics', '29.99', '15.00', 'main-store',
        'High-quality blue widget for everyday use', 'Gadgets', '100', '10', '012345678905', 'UPC-A', 'true',
        'MFG-BW001', '012345678905', '5901234123457', 'VEND1-BW001', 'VEND2-BW001', '',
        'Acme Supplies', 'ACME-001', '12.00', 'Widget Co', 'WC-001', '13.50',
        ...customAttributes.map((attr) => attr === 'color' ? 'Blue' : attr === 'size' ? 'Medium' : attr === 'brand' ? 'Acme' : ''),
      ],
      // Row 2: Minimal example with only required fields
      [
        'GADGET-002', 'Red Gadget', 'Electronics', '19.99', '8.50', 'main-store',
        'Compact red gadget', 'Gadgets', '50', '5', '', '', 'true',
        '', '', '', '', '', '',
        '', '', '', '', '', '',
        ...customAttributes.map(() => ''),
      ],
      // Row 3: Another category example
      [
        'TOOL-003', 'Precision Screwdriver Set', 'Tools', '45.00', '22.00', 'main-store',
        '12-piece precision screwdriver set', 'Hand Tools', '25', '5', '098765432109', 'UPC-A', 'true',
        'MFG-PSD12', '098765432109', '', '', '', '',
        'Tool Masters', 'TM-PSD12', '20.00', '', '', '',
        ...customAttributes.map((attr) => attr === 'brand' ? 'ToolPro' : ''),
      ],
    ];

    const csvRows = [
      headers.join(','),
      ...sampleRows.map(row => row.map(v => `"${v}"`).join(',')),
    ];
    const content = csvRows.join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products_import_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded with 3 sample products');
  }, [customAttributes]);

  const handleValidate = useCallback(async () => {
    if (!csvData) return;
    setIsProcessing(true);
    setStep('validate');

    try {
      const lines = csvData.split('\n').filter(l => l.trim());
      const dataLines = lines.slice(1);
      const errors: ImportError[] = [];

      // Basic validation
      const headers = csvHeaders.map(h => h.toLowerCase());
      const requiredFields = PRODUCT_FIELDS.required.map(f => f.name);

      for (const required of requiredFields) {
        if (!headers.includes(required)) {
          errors.push({ row: 1, field: required, message: `Required column '${required}' is missing` });
        }
      }

      setValidationResult({
        imported: 0,
        skipped: errors.length > 0 ? dataLines.length : 0,
        errors: errors.slice(0, 20),
      });

      if (errors.length === 0) {
        toast.success(`${dataLines.length} rows ready to import`);
      } else {
        toast.warning(`Found ${errors.length} validation issues`);
      }
    } catch {
      toast.error('Validation failed');
      setStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  }, [csvData, csvHeaders]);


  const handleImport = useCallback(async () => {
    if (!csvData) return;
    setIsProcessing(true);
    setStep('import');

    try {
      const response = await apiClient.post<ImportResult>('/api/data-management/import', {
        entity_type: 'products',
        csv_data: csvData,
      });

      setImportResult(response);
      setStep('complete');
      
      if (response.imported > 0) {
        toast.success(`Imported ${response.imported} products`);
      }
    } catch {
      toast.error('Import failed');
      setStep('validate');
    } finally {
      setIsProcessing(false);
    }
  }, [csvData]);

  const downloadErrorReport = useCallback(() => {
    const errors = validationResult?.errors || importResult?.errors || [];
    if (!errors.length) return;

    const content = [
      'Row,Field,Error',
      ...errors.map(e => `${e.row},"${e.field || ''}","${e.message}"`),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import_errors.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [validationResult, importResult]);

  // Render guide step
  const renderGuide = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Product Import Guide</h1>
        <p className="text-text-secondary max-w-2xl mx-auto">
          Import your products from a CSV file. This guide will walk you through the process
          and explain all available fields and features.
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FeatureCard
          icon={Package}
          title="Product Details"
          description="Import basic product info: SKU, name, price, cost, quantity, and more."
        />
        <FeatureCard
          icon={Link2}
          title="Cross-Linked SKUs"
          description="Link multiple SKUs to one product: manufacturer codes, UPCs, vendor SKUs."
        />
        <FeatureCard
          icon={Tag}
          title="Custom Attributes"
          description="Add unlimited custom attributes like color, size, brand, material."
        />
        <FeatureCard
          icon={Building2}
          title="Vendor Mapping"
          description="Map vendor-specific SKUs and costs for each supplier."
        />
      </div>

      {/* How It Works */}
      <div className="bg-surface-base border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StepCard number={1} title="Download Template" description="Get a CSV template with all available fields" />
          <StepCard number={2} title="Fill Your Data" description="Add your products to the template" />
          <StepCard number={3} title="Upload & Validate" description="We'll check for errors before importing" />
          <StepCard number={4} title="Import" description="Products are added to your catalog" />
        </div>
      </div>


      {/* Field Reference */}
      <div className="bg-surface-base border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Field Reference</h2>
        
        {/* Required Fields */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-error-400 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-error-400 rounded-full"></span>
            Required Fields
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {PRODUCT_FIELDS.required.map(field => (
              <FieldBadge key={field.name} field={field} required />
            ))}
          </div>
        </div>

        {/* Optional Fields */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-text-tertiary rounded-full"></span>
            Optional Fields
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {PRODUCT_FIELDS.optional.map(field => (
              <FieldBadge key={field.name} field={field} />
            ))}
          </div>
        </div>

        {/* Cross-Link Fields */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-primary-400 mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Cross-Linked SKUs (for lookups)
          </h3>
          <p className="text-xs text-text-tertiary mb-2">
            These alternate identifiers allow finding products by manufacturer codes, UPCs, or vendor SKUs.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {CROSS_LINK_FIELDS.map(field => (
              <FieldBadge key={field.name} field={field} />
            ))}
          </div>
        </div>

        {/* Vendor Fields */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-warning-400 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Vendor Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {VENDOR_FIELDS.map(field => (
              <FieldBadge key={field.name} field={field} />
            ))}
          </div>
        </div>

        {/* Custom Attributes */}
        <div>
          <h3 className="text-sm font-medium text-success-400 mb-2 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Custom Attributes
          </h3>
          <p className="text-xs text-text-tertiary mb-2">
            Add any custom attributes. Use column names like <code className="bg-surface-elevated px-1 rounded">attr_color</code>, <code className="bg-surface-elevated px-1 rounded">attr_size</code>, etc.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {customAttributes.map(attr => (
              <span key={attr} className="inline-flex items-center gap-1 px-2 py-1 bg-success-500/10 text-success-400 rounded text-sm">
                attr_{attr}
                <button onClick={() => removeCustomAttribute(attr)} className="hover:text-success-300">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAttribute}
              onChange={(e) => setNewAttribute(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              placeholder="Add attribute name..."
              className="px-3 py-1.5 bg-surface-elevated border border-border rounded text-sm text-text-primary"
              onKeyDown={(e) => e.key === 'Enter' && addCustomAttribute()}
            />
            <Button size="sm" variant="outline" onClick={addCustomAttribute}>Add</Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={generateTemplate} leftIcon={<Download className="w-4 h-4" />}>
          Download Template
        </Button>
        <Button variant="primary" onClick={() => setStep('upload')} rightIcon={<ArrowRight className="w-4 h-4" />}>
          Start Import
        </Button>
      </div>
    </div>
  );


  // Render upload step
  const renderUpload = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Upload Your CSV File</h2>
        <p className="text-text-secondary">Select a CSV file containing your product data</p>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary-500/50 transition-colors">
        <Upload className="w-12 h-12 text-text-disabled mx-auto mb-4" />
        <p className="text-text-secondary mb-4">
          {file ? file.name : 'Drag and drop or click to select'}
        </p>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        <label htmlFor="csv-upload">
          <span className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-secondary bg-surface-base hover:bg-surface-elevated cursor-pointer">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Choose File
          </span>
        </label>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => setStep('guide')}>Back to Guide</Button>
        <Button variant="outline" onClick={generateTemplate} leftIcon={<Download className="w-4 h-4" />}>
          Download Template
        </Button>
      </div>
    </div>
  );

  // Render mapping step
  const renderMapping = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-text-primary mb-2">Review Column Mapping</h2>
        <p className="text-text-secondary">We detected {csvHeaders.length} columns in your file</p>
      </div>

      <div className="bg-surface-base border border-border rounded-xl p-6">
        <h3 className="font-medium text-text-primary mb-4">Detected Columns</h3>
        <div className="flex flex-wrap gap-2">
          {csvHeaders.map((header, idx) => {
            const isRequired = PRODUCT_FIELDS.required.some(f => f.name === header.toLowerCase());
            return (
              <span
                key={idx}
                className={`px-3 py-1 rounded text-sm ${
                  isRequired
                    ? 'bg-success-500/10 text-success-400 border border-success-500/30'
                    : 'bg-surface-elevated text-text-secondary'
                }`}
              >
                {header}
                {isRequired && <CheckCircle2 className="w-3 h-3 inline ml-1" />}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={() => { setStep('upload'); setFile(null); setCsvData(''); }}>
          Choose Different File
        </Button>
        <Button variant="primary" onClick={handleValidate}>
          Validate Data
        </Button>
      </div>
    </div>
  );


  // Render validate step
  const renderValidate = () => (
    <div className="max-w-2xl mx-auto space-y-6">
      {isProcessing ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-secondary">Validating data...</p>
        </div>
      ) : validationResult && (
        <>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">Validation Results</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-base border border-border rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-success-400">
                {csvData.split('\n').filter(l => l.trim()).length - 1 - (validationResult.errors.length || 0)}
              </div>
              <div className="text-sm text-text-tertiary">Valid Rows</div>
            </div>
            <div className="bg-surface-base border border-border rounded-xl p-6 text-center">
              <div className="text-3xl font-bold text-error-400">{validationResult.errors.length}</div>
              <div className="text-sm text-text-tertiary">Errors</div>
            </div>
          </div>

          {validationResult.errors.length > 0 && (
            <div className="bg-error-500/10 border border-error-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-error-400">Validation Errors</h3>
                  <p className="text-sm text-text-secondary">These rows will be skipped during import</p>
                </div>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {validationResult.errors.map((error, idx) => (
                  <div key={idx} className="text-sm text-text-secondary bg-surface-base rounded p-2">
                    <span className="font-medium">Row {error.row}:</span> {error.field} - {error.message}
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={downloadErrorReport} className="mt-3">
                <Download className="w-4 h-4 mr-2" /> Download Error Report
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('mapping')}>Back</Button>
            <Button variant="primary" onClick={handleImport}>
              Import {csvData.split('\n').filter(l => l.trim()).length - 1 - (validationResult.errors.length || 0)} Products
            </Button>
          </div>
        </>
      )}
    </div>
  );

  // Render import step
  const renderImport = () => (
    <div className="max-w-md mx-auto text-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p className="text-text-secondary">Importing products...</p>
      <p className="text-sm text-text-disabled mt-2">This may take a few moments</p>
    </div>
  );

  // Render complete step
  const renderComplete = () => (
    <div className="max-w-md mx-auto text-center space-y-6">
      <CheckCircle2 className="w-16 h-16 text-success-400 mx-auto" />
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Import Complete!</h2>
        <p className="text-text-secondary">
          Successfully imported {importResult?.imported || 0} products
        </p>
      </div>

      {importResult && importResult.skipped > 0 && (
        <div className="bg-warning-500/10 border border-warning-500/30 rounded-xl p-4">
          <p className="text-warning-400">{importResult.skipped} rows were skipped due to errors</p>
          <Button variant="ghost" size="sm" onClick={downloadErrorReport} className="mt-2">
            Download Error Report
          </Button>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Button variant="outline" onClick={() => { setStep('guide'); setFile(null); setCsvData(''); setImportResult(null); }}>
          Import More
        </Button>
        <Button variant="primary" onClick={() => window.location.href = '/products'}>
          View Products
        </Button>
      </div>
    </div>
  );


  return (
    <div className="min-h-screen bg-background-primary p-6">
      {/* Progress indicator */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          {(['guide', 'upload', 'mapping', 'validate', 'import', 'complete'] as ImportStep[]).map((s, idx) => (
            <React.Fragment key={s}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-primary-500 text-white'
                    : ['guide', 'upload', 'mapping', 'validate', 'import', 'complete'].indexOf(step) > idx
                    ? 'bg-success-500 text-white'
                    : 'bg-surface-elevated text-text-tertiary'
                }`}
              >
                {['guide', 'upload', 'mapping', 'validate', 'import', 'complete'].indexOf(step) > idx ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 5 && <ChevronRight className="w-4 h-4 text-text-disabled" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Help button */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-primary-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-600 transition-colors"
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Help panel */}
      {showHelp && (
        <div className="fixed bottom-20 right-6 w-80 bg-surface-base border border-border rounded-xl shadow-xl p-4">
          <h3 className="font-medium text-text-primary mb-2">Need Help?</h3>
          <ul className="text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <span>Required fields are marked with * in the template</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <span>Cross-linked SKUs allow finding products by multiple identifiers</span>
            </li>
            <li className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
              <span>Custom attributes use the format: attr_name</span>
            </li>
          </ul>
          <a href="/docs/features/product-import.md" className="text-primary-400 text-sm mt-3 block hover:underline">
            View Full Documentation →
          </a>
        </div>
      )}

      {/* Main content */}
      {step === 'guide' && renderGuide()}
      {step === 'upload' && renderUpload()}
      {step === 'mapping' && renderMapping()}
      {step === 'validate' && renderValidate()}
      {step === 'import' && renderImport()}
      {step === 'complete' && renderComplete()}
    </div>
  );
}

// Helper components
function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="bg-surface-base border border-border rounded-xl p-4">
      <Icon className="w-8 h-8 text-primary-400 mb-3" />
      <h3 className="font-medium text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-tertiary">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-10 h-10 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
        {number}
      </div>
      <h4 className="font-medium text-text-primary text-sm">{title}</h4>
      <p className="text-xs text-text-tertiary mt-1">{description}</p>
    </div>
  );
}

function FieldBadge({ field, required }: { field: { name: string; label: string; description: string }; required?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-sm ${required ? 'bg-error-500/10 border border-error-500/30' : 'bg-surface-elevated'}`}>
      <div className="font-medium text-text-primary">
        {field.name}{required && <span className="text-error-400">*</span>}
      </div>
      <div className="text-xs text-text-tertiary">{field.description}</div>
    </div>
  );
}

export default ProductImportPage;

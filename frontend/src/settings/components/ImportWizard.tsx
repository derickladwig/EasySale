import React, { useState } from 'react';
import { Button } from '@common/components/atoms/Button';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
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

interface ImportWizardProps {
  entityType: string;
  onClose: () => void;
}

// Template definitions matching backend expectations
const IMPORT_TEMPLATES: Record<string, { headers: string[]; sampleRows: string[][] }> = {
  Products: {
    headers: [
      'sku*', 'name*', 'category*', 'unit_price*', 'cost*', 'store_id*',
      'description', 'subcategory', 'quantity', 'reorder_point',
      'barcode', 'barcode_type', 'is_active', 'parent_sku', 'images',
      'attr_color', 'attr_size', 'attr_brand', 'attr_weight', 'attr_material',
      'vendor_name', 'vendor_sku', 'vendor_cost', 'tax_class', 'notes'
    ],
    sampleRows: [
      ['SKU001', 'Sample Product', 'General', '19.99', '10.00', 'store-001', 'Product description', '', '100', '10', '123456789012', 'UPC-A', 'true', '', '', '', '', '', '', '', '', '', '', 'standard', ''],
      ['SKU002', 'Blue T-Shirt Large', 'Apparel', '29.99', '12.00', 'store-001', 'Cotton t-shirt', 'Shirts', '50', '5', '123456789013', 'EAN-13', 'true', '', '', 'Blue', 'Large', 'BrandX', '200g', 'Cotton', 'Supplier Inc', 'SUPP-TS-BL-L', '10.00', 'standard', ''],
    ],
  },
  Customers: {
    headers: ['first_name*', 'last_name*', 'email', 'phone', 'company', 'address', 'city', 'state', 'zip', 'country', 'notes'],
    sampleRows: [
      ['John', 'Doe', 'john.doe@example.com', '555-0100', 'Acme Corp', '123 Main St', 'Anytown', 'CA', '90210', 'US', 'VIP customer'],
    ],
  },
  Vendors: {
    headers: ['name*', 'email', 'phone', 'address', 'website', 'tax_id', 'contact_name', 'payment_terms', 'notes', 'keywords'],
    sampleRows: [
      ['Supplier Inc', 'bob@supplier.com', '555-0200', '789 Industrial Blvd, Commerce City, TX 75001', 'https://supplier.com', '12-3456789', 'Bob Wilson', 'Net 30', 'Primary supplier', 'SUPPLIER,SUPPLIER INC'],
    ],
  },
};

export const ImportWizard: React.FC<ImportWizardProps> = ({ entityType, onClose }) => {
  const [step, setStep] = useState<'upload' | 'validate' | 'import' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<string>('');
  const [validationResult, setValidationResult] = useState<ImportResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setFile(selectedFile);
      
      // Read file content
      try {
        const text = await selectedFile.text();
        setCsvData(text);
      } catch {
        toast.error('Failed to read file');
      }
    }
  };

  const handleValidate = async () => {
    if (!file || !csvData) return;

    setIsProcessing(true);
    setStep('validate');

    try {
      // Parse CSV locally to count rows and check for obvious errors
      const lines = csvData.split('\n').filter(line => line.trim());
      const headerLine = lines[0];
      const dataLines = lines.slice(1);
      
      // Basic validation
      const errors: ImportError[] = [];
      const template = IMPORT_TEMPLATES[entityType];
      
      if (template) {
        const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace('*', ''));
        const requiredFields = template.headers
          .filter(h => h.endsWith('*'))
          .map(h => h.replace('*', '').toLowerCase());
        
        // Check for required headers
        for (const required of requiredFields) {
          if (!headers.includes(required)) {
            errors.push({
              row: 1,
              field: required,
              message: `Required column '${required}' is missing from CSV headers`,
            });
          }
        }
        
        // Check each data row for empty required fields
        dataLines.forEach((line, idx) => {
          const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          requiredFields.forEach((field) => {
            const headerIdx = headers.indexOf(field);
            if (headerIdx >= 0 && (!values[headerIdx] || values[headerIdx] === '')) {
              errors.push({
                row: idx + 2,
                field,
                message: `Required field '${field}' is empty`,
              });
            }
          });
        });
      }

      const result: ImportResult = {
        imported: 0,
        skipped: errors.length,
        errors: errors.slice(0, 20), // Limit to first 20 errors
      };

      setValidationResult(result);

      if (result.errors.length === 0) {
        toast.success(`Validation passed! ${dataLines.length} rows ready to import.`);
      } else {
        toast.warning(`Found ${result.errors.length} validation issues`);
      }
    } catch (err) {
      toast.error('Validation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!file || !csvData) return;

    setIsProcessing(true);
    setStep('import');

    try {
      // Call backend API with CSV data
      const response = await apiClient.post<ImportResult>('/api/data-management/import', {
        entity_type: entityType.toLowerCase(),
        csv_data: csvData,
      });

      setImportResult(response);
      setStep('complete');
      
      if (response.imported > 0) {
        toast.success(`Imported ${response.imported} ${entityType.toLowerCase()} successfully`);
      }
      if (response.skipped > 0) {
        toast.warning(`Skipped ${response.skipped} rows due to errors`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      toast.error(errorMessage);
      
      // Show error in validation result
      setValidationResult({
        imported: 0,
        skipped: 1,
        errors: [{ row: 0, field: null, message: errorMessage }],
      });
      setStep('validate');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = IMPORT_TEMPLATES[entityType];
    if (!template) {
      toast.error('Template not available for this entity type');
      return;
    }
    
    // Generate CSV content
    const lines = [
      template.headers.join(','),
      ...template.sampleRows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ];
    const content = lines.join('\n');
    
    // Download
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityType.toLowerCase()}_import_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded');
  };

  const downloadErrorReport = () => {
    if (!validationResult?.errors.length) return;
    
    const lines = [
      'Row,Field,Error Message',
      ...validationResult.errors.map(e => `${e.row},"${e.field || ''}","${e.message}"`),
    ];
    const content = lines.join('\n');
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${entityType.toLowerCase()}_import_errors.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Error report downloaded');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-base rounded-lg border border-border w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-text-primary">Import {entityType}</h2>
          <p className="text-sm text-text-tertiary mt-1">
            Upload a CSV file to import {entityType.toLowerCase()} data
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 text-text-disabled mx-auto mb-4" />
                <p className="text-text-secondary mb-4">
                  {file ? file.name : 'Select a CSV file to upload'}
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <span className="inline-flex items-center px-4 py-2 border border-border rounded-lg text-sm font-medium text-text-secondary bg-surface-base hover:bg-surface-elevated cursor-pointer">
                    Choose File
                  </span>
                </label>
              </div>

              <div className="bg-background-primary border border-border rounded-lg p-4">
                <h3 className="font-medium text-text-primary mb-2">CSV Format Requirements</h3>
                <ul className="text-sm text-text-tertiary space-y-1">
                  <li>• First row must contain column headers</li>
                  <li>• Required fields: name, email (varies by entity type)</li>
                  <li>• Date format: YYYY-MM-DD</li>
                  <li>• Currency values: numeric only (no symbols)</li>
                </ul>
                <Button
                  onClick={downloadTemplate}
                  variant="ghost"
                  size="sm"
                  className="mt-3"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Validate */}
          {step === 'validate' && (
            <div className="space-y-6">
              {isProcessing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
                  <p className="text-text-secondary">Validating data...</p>
                </div>
              ) : (
                validationResult && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-background-primary border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-success-400">
                          {csvData.split('\n').filter(l => l.trim()).length - 1 - validationResult.errors.length}
                        </div>
                        <div className="text-sm text-text-tertiary">Valid Rows</div>
                      </div>
                      <div className="bg-background-primary border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-warning-400">
                          {validationResult.skipped}
                        </div>
                        <div className="text-sm text-text-tertiary">Will Skip</div>
                      </div>
                      <div className="bg-background-primary border border-border rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-error-400">
                          {validationResult.errors.length}
                        </div>
                        <div className="text-sm text-text-tertiary">Errors</div>
                      </div>
                    </div>

                    {validationResult.errors.length > 0 && (
                      <div className="bg-error-500/10 border border-error-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-error-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="font-medium text-error-400 mb-1">Validation Errors</h3>
                            <p className="text-sm text-text-secondary">
                              The following rows have errors and will be skipped:
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {validationResult.errors.map((error, index) => (
                            <div
                              key={index}
                              className="text-sm text-text-secondary bg-background-primary rounded p-2"
                            >
                              <span className="font-medium">Row {error.row}:</span> {error.field} -{' '}
                              {error.message}
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={downloadErrorReport}
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          leftIcon={<Download className="w-4 h-4" />}
                        >
                          Download Error Report
                        </Button>
                      </div>
                    )}
                  </>
                )
              )}
            </div>
          )}

          {/* Step 3: Import */}
          {step === 'import' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-text-secondary">Importing data...</p>
              <p className="text-sm text-text-disabled mt-2">This may take a few moments</p>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && importResult && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-text-primary mb-2">Import Complete!</h3>
                <p className="text-text-tertiary">
                  Successfully imported {importResult.imported} {entityType.toLowerCase()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background-primary border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-success-400">{importResult.imported}</div>
                  <div className="text-sm text-text-tertiary">Imported</div>
                </div>
                <div className="bg-background-primary border border-border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-warning-400">{importResult.skipped}</div>
                  <div className="text-sm text-text-tertiary">Skipped</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          {step === 'upload' && (
            <>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleValidate} disabled={!file} variant="primary">
                Validate
              </Button>
            </>
          )}

          {step === 'validate' && !isProcessing && (
            <>
              <Button onClick={() => setStep('upload')} variant="outline">
                Back
              </Button>
              <Button onClick={handleImport} variant="primary">
                Import{' '}
                {validationResult && validationResult.errors.length > 0 ? 'Valid Rows' : 'All'}
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={onClose} variant="primary">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

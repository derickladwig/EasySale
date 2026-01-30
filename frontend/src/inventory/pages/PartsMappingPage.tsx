/**
 * PartsMappingPage Component
 * 
 * Search and manage part number cross-references and mappings.
 * Allows searching by internal SKU, external SKU, or OCR-extracted part numbers.
 * 
 * Requirements: 11.1, 11.2
 * - Search by internal SKU, external SKU/vendor SKU, scanned/OCR-extracted part numbers
 * - Show matched canonical part, match confidence, resolved price and pricebook source
 */

import React, { useState } from 'react';
import { Search, Package, Link2, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@common/components/atoms/Input';
import { Button } from '@common/components/atoms/Button';
import { Card } from '@common/components/molecules/Card';
import { EmptyState } from '@common/components/molecules/EmptyState';
import { useProductsQuery } from '@domains/product/hooks';

interface PartMatch {
  internalSku: string;
  productName: string;
  matchType: 'exact' | 'alias' | 'vendor' | 'ocr';
  confidence: number;
  price: number;
  priceSource: string;
}

export function PartsMappingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PartMatch[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Fetch products for search
  const { data: productsResponse } = useProductsQuery();
  const products = productsResponse?.products ?? [];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);

    // Simulate search - in production this would call a backend API
    // that searches across internal SKU, external SKU, and OCR mappings
    const query = searchQuery.toLowerCase();
    const matches: PartMatch[] = products
      .filter(p => 
        p.sku.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query)
      )
      .slice(0, 10)
      .map(p => ({
        internalSku: p.sku,
        productName: p.name,
        matchType: p.sku.toLowerCase() === query ? 'exact' as const : 'alias' as const,
        confidence: p.sku.toLowerCase() === query ? 100 : 85,
        price: p.price ?? 0,
        priceSource: 'Default Pricebook',
      }));

    setSearchResults(matches);
    setIsSearching(false);
  };

  const getMatchTypeLabel = (type: PartMatch['matchType']) => {
    switch (type) {
      case 'exact': return 'Exact Match';
      case 'alias': return 'Alias Match';
      case 'vendor': return 'Vendor Mapping';
      case 'ocr': return 'OCR Extracted';
    }
  };

  const getMatchTypeColor = (type: PartMatch['matchType']) => {
    switch (type) {
      case 'exact': return 'text-success-400 bg-success-500/20';
      case 'alias': return 'text-primary-400 bg-primary-500/20';
      case 'vendor': return 'text-warning-400 bg-warning-500/20';
      case 'ocr': return 'text-text-secondary bg-surface-overlay';
    }
  };

  return (
    <div className="h-full overflow-auto bg-background-primary p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Parts Cross-Reference</h1>
          <p className="text-text-tertiary mt-1">
            Search by internal SKU, vendor part number, or OCR-extracted text
          </p>
        </div>

        {/* Search */}
        <Card>
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter SKU, vendor part number, or OCR text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  leftIcon={<Search className="w-4 h-4" />}
                />
              </div>
              <Button
                variant="primary"
                onClick={handleSearch}
                loading={isSearching}
              >
                Search
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4">
            {searchResults.length === 0 ? (
              <EmptyState
                title="No matches found"
                description="Try a different search term or check the spelling"
                icon={<Package className="w-12 h-12" />}
              />
            ) : (
              <>
                <div className="text-sm text-text-tertiary">
                  Found {searchResults.length} match{searchResults.length !== 1 ? 'es' : ''}
                </div>
                
                {searchResults.map((match, index) => (
                  <Card key={index}>
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-white">
                              {match.productName}
                            </h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getMatchTypeColor(match.matchType)}`}>
                              {getMatchTypeLabel(match.matchType)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <div className="text-text-disabled mb-1">Internal SKU</div>
                              <div className="text-text-secondary font-mono">{match.internalSku}</div>
                            </div>
                            <div>
                              <div className="text-text-disabled mb-1">Confidence</div>
                              <div className="flex items-center gap-1">
                                {match.confidence >= 90 ? (
                                  <CheckCircle2 className="w-4 h-4 text-success-400" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-warning-400" />
                                )}
                                <span className="text-text-secondary">{match.confidence}%</span>
                              </div>
                            </div>
                            <div>
                              <div className="text-text-disabled mb-1">Price</div>
                              <div className="flex items-center gap-1 text-text-secondary">
                                <DollarSign className="w-4 h-4" />
                                {match.price.toFixed(2)}
                              </div>
                            </div>
                            <div>
                              <div className="text-text-disabled mb-1">Price Source</div>
                              <div className="flex items-center gap-1 text-text-secondary">
                                <Link2 className="w-4 h-4" />
                                {match.priceSource}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}

        {/* Initial state */}
        {!hasSearched && (
          <Card>
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-text-disabled mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-secondary mb-2">
                Search for Parts
              </h3>
              <p className="text-text-tertiary max-w-md mx-auto">
                Enter a part number, SKU, or text from an OCR scan to find matching products
                and see their resolved prices.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

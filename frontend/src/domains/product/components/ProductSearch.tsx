import React, { useState, useEffect, useCallback } from 'react';
import { Product, CategoryConfig } from '../types';
import { productApi } from '../api';
import { debounce } from 'lodash';

interface ProductSearchProps {
  category?: string;
  onResultsChange?: (products: Product[]) => void;
  onBarcodeScanned?: (product: Product) => void;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  category,
  onResultsChange,
  onBarcodeScanned,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<CategoryConfig[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(category);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    // Listen for barcode scanner input
    let barcodeBuffer = '';
    let barcodeTimeout: number | undefined;

    const handleKeyPress = async (e: KeyboardEvent) => {
      // Barcode scanners typically send Enter after the barcode
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        await handleBarcodeScanned(barcodeBuffer);
        barcodeBuffer = '';
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;

        // Clear buffer after 100ms of inactivity (human typing is slower)
        if (barcodeTimeout !== undefined) {
          clearTimeout(barcodeTimeout);
        }
        barcodeTimeout = window.setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeout !== undefined) {
        clearTimeout(barcodeTimeout);
      }
    };
  }, []);

  const loadCategories = async () => {
    try {
      const cats = await productApi.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      const product = await productApi.lookupByBarcode(barcode);
      if (product) {
        onBarcodeScanned?.(product);
      } else {
        alert(`No product found for barcode: ${barcode}`);
      }
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      alert('Failed to lookup barcode');
    }
  };

  const debouncedAutocomplete = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      try {
        const results = await productApi.autocomplete(searchQuery, selectedCategory, 10);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        console.error('Autocomplete failed:', err);
      }
    }, 300),
    [selectedCategory]
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedAutocomplete(value);
  };

  const handleSearch = async () => {
    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await productApi.searchProducts({
        query: query || undefined,
        category: selectedCategory,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        page: 0,
        pageSize: 50,
      });
      onResultsChange?.(response.products);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    handleSearch();
  };

  const handleFilterChange = (field: string, value: string | number | boolean) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setQuery('');
    setSelectedCategory(undefined);
  };

  const selectedCategoryConfig = categories.find((c) => c.id === selectedCategory);

  return (
    <div className="product-search space-y-4">
      {/* Search input with autocomplete */}
      <div className="relative">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Search products... (or scan barcode)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-transparent"
            />

            {/* Autocomplete suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-surface-base border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 hover:bg-surface-elevated cursor-pointer text-text-primary"
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium text-text-secondary">Category:</label>
        <select
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(e.target.value || undefined)}
          className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        {(query || selectedCategory || Object.keys(filters).length > 0) && (
          <button onClick={clearFilters} className="text-sm text-primary-400 hover:text-primary-300">
            Clear Filters
          </button>
        )}
      </div>

      {/* Dynamic filters based on category */}
      {selectedCategoryConfig?.filters && selectedCategoryConfig.filters.length > 0 && (
        <div className="p-4 bg-surface-elevated rounded-lg">
          <h3 className="text-sm font-medium text-text-secondary mb-3">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedCategoryConfig.filters.map((filter) => (
              <div key={filter.field}>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  {filter.label || filter.field}
                </label>
                {filter.type === 'dropdown' && filter.options && (
                  <select
                    value={filters[filter.field] || ''}
                    onChange={(e) => handleFilterChange(filter.field, e.target.value)}
                    className="w-full px-3 py-2 bg-surface-base border border-border rounded-lg text-text-primary"
                  >
                    <option value="">All</option>
                    {filter.options.map((opt: any, idx: number) => (
                      <option key={idx} value={typeof opt === 'string' ? opt : opt.value}>
                        {typeof opt === 'string' ? opt : opt.label}
                      </option>
                    ))}
                  </select>
                )}
                {filter.type === 'range' && (
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      onChange={(e) => handleFilterChange(`${filter.field}_min`, e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      onChange={(e) => handleFilterChange(`${filter.field}_max`, e.target.value)}
                      className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

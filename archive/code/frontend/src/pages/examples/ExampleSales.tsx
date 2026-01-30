import React from 'react';
import { SalesTemplate } from '../../common/components/templates';
import { SearchBar } from '../../common/components/molecules/SearchBar';
import { Button } from '../../common/components/atoms/Button';

/**
 * Example Sales Page
 * 
 * Demonstrates the use of SalesTemplate with product catalog, cart, and customer info.
 */
export const ExampleSales: React.FC = () => {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <SalesTemplate
      catalog={
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-dark-700">
            <SearchBar
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Search products..."
              enableShortcut
            />
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-dark-700 rounded-lg p-4 cursor-pointer hover:bg-dark-600 transition-colors"
                >
                  <div className="aspect-square bg-dark-600 rounded mb-2" />
                  <h3 className="text-sm font-medium text-dark-100">Product {i}</h3>
                  <p className="text-xs text-dark-400">SKU-{i}00{i}</p>
                  <p className="text-sm font-semibold text-primary-400 mt-2">$99.99</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
      cart={
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-dark-700">
            <h2 className="text-lg font-semibold text-dark-50">Shopping Cart</h2>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <p className="text-dark-400 text-center py-8">Cart is empty</p>
          </div>
          <div className="p-4 border-t border-dark-700 space-y-4">
            <div className="flex justify-between text-dark-200">
              <span>Subtotal:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-dark-200">
              <span>Tax:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-dark-50">
              <span>Total:</span>
              <span>$0.00</span>
            </div>
            <Button variant="primary" fullWidth size="lg">
              Checkout
            </Button>
          </div>
        </div>
      }
      customerInfo={
        <div className="p-4">
          <h3 className="text-sm font-semibold text-dark-50 mb-3">Customer</h3>
          <p className="text-sm text-dark-400">No customer selected</p>
          <Button variant="outline" size="sm" className="mt-3" fullWidth>
            Select Customer
          </Button>
        </div>
      }
    />
  );
};

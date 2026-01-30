/**
 * Grid Component Usage Examples
 * 
 * This file demonstrates various ways to use the Grid component.
 * These examples can be used as reference for implementing grid layouts.
 */

import React from 'react';
import { Grid } from './Grid';

// Example 1: Basic Product Grid
export const ProductGridExample = () => {
  const products = [
    { id: 1, name: 'Product 1', price: 19.99, stock: 50 },
    { id: 2, name: 'Product 2', price: 24.99, stock: 30 },
    { id: 3, name: 'Product 3', price: 29.99, stock: 20 },
    { id: 4, name: 'Product 4', price: 34.99, stock: 15 },
    { id: 5, name: 'Product 5', price: 39.99, stock: 10 },
    { id: 6, name: 'Product 6', price: 44.99, stock: 5 },
  ];

  return (
    <div className="p-6">
      <h2 className="text-h2 text-text-primary mb-6">Product Grid</h2>
      <Grid columns={3} gap="responsive">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-background-secondary rounded-lg p-4 border border-border-light hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-text-primary font-semibold mb-2">{product.name}</h3>
            <div className="flex justify-between items-center">
              <span className="text-success font-bold">${product.price.toFixed(2)}</span>
              <span className="text-text-tertiary text-sm">Stock: {product.stock}</span>
            </div>
          </div>
        ))}
      </Grid>
    </div>
  );
};

// Example 2: Dashboard Stats Grid
export const DashboardStatsExample = () => {
  const stats = [
    { label: 'Total Sales', value: '$12,345', trend: '+12.5%', positive: true },
    { label: 'Orders', value: '234', trend: '+8.2%', positive: true },
    { label: 'Customers', value: '1,234', trend: '+15.3%', positive: true },
    { label: 'Inventory', value: '5,678', trend: '-3.1%', positive: false },
  ];

  return (
    <div className="p-6">
      <h2 className="text-h2 text-text-primary mb-6">Dashboard Stats</h2>
      <Grid columns={4} gap="responsive">
        {stats.map((stat, index) => (
          <div key={index} className="bg-background-secondary rounded-lg p-6 border border-border-light">
            <div className="text-text-tertiary text-sm mb-2">{stat.label}</div>
            <div className="text-text-primary text-3xl font-bold mb-1">{stat.value}</div>
            <div className={stat.positive ? 'text-success text-sm' : 'text-warning text-sm'}>
              {stat.trend}
            </div>
          </div>
        ))}
      </Grid>
    </div>
  );
};

// Example 3: Auto-fit Image Gallery
export const ImageGalleryExample = () => {
  const images = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    url: `https://via.placeholder.com/300x200?text=Image+${i + 1}`,
    alt: `Image ${i + 1}`,
  }));

  return (
    <div className="p-6">
      <h2 className="text-h2 text-text-primary mb-6">Image Gallery</h2>
      <Grid autoFit minColumnWidth="md" gap="sm">
        {images.map((image) => (
          <div key={image.id} className="rounded-lg overflow-hidden border border-border-light">
            <img
              src={image.url}
              alt={image.alt}
              className="w-full h-auto object-cover hover:scale-105 transition-transform"
            />
          </div>
        ))}
      </Grid>
    </div>
  );
};

// Example 4: Settings Form Grid
export const SettingsFormExample = () => {
  return (
    <div className="p-6">
      <h2 className="text-h2 text-text-primary mb-6">Settings Form</h2>
      <Grid columns={2} gap="lg">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">First Name</label>
          <input
            type="text"
            className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-border-DEFAULT text-text-primary"
            placeholder="Enter first name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Last Name</label>
          <input
            type="text"
            className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-border-DEFAULT text-text-primary"
            placeholder="Enter last name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
          <input
            type="email"
            className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-border-DEFAULT text-text-primary"
            placeholder="Enter email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">Phone</label>
          <input
            type="tel"
            className="w-full h-11 px-4 rounded-lg bg-background-secondary border-2 border-border-DEFAULT text-text-primary"
            placeholder="Enter phone"
          />
        </div>
      </Grid>
    </div>
  );
};

// Example 5: Responsive Card Grid with Different Column Counts
export const ResponsiveCardExample = () => {
  return (
    <div className="p-6 space-y-12">
      {/* 2-column grid */}
      <div>
        <h2 className="text-h2 text-text-primary mb-6">2-Column Grid</h2>
        <Grid columns={2} gap="responsive">
          <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
            <h3 className="text-text-primary font-semibold mb-2">Card 1</h3>
            <p className="text-text-secondary">Content for card 1</p>
          </div>
          <div className="bg-background-secondary rounded-lg p-6 border border-border-light">
            <h3 className="text-text-primary font-semibold mb-2">Card 2</h3>
            <p className="text-text-secondary">Content for card 2</p>
          </div>
        </Grid>
      </div>

      {/* 3-column grid */}
      <div>
        <h2 className="text-h2 text-text-primary mb-6">3-Column Grid</h2>
        <Grid columns={3} gap="responsive">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-background-secondary rounded-lg p-6 border border-border-light">
              <h3 className="text-text-primary font-semibold mb-2">Card {i + 1}</h3>
              <p className="text-text-secondary">Content for card {i + 1}</p>
            </div>
          ))}
        </Grid>
      </div>

      {/* 4-column grid */}
      <div>
        <h2 className="text-h2 text-text-primary mb-6">4-Column Grid</h2>
        <Grid columns={4} gap="responsive">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-background-secondary rounded-lg p-6 border border-border-light">
              <h3 className="text-text-primary font-semibold mb-2">Card {i + 1}</h3>
              <p className="text-text-secondary">Content for card {i + 1}</p>
            </div>
          ))}
        </Grid>
      </div>
    </div>
  );
};

// Example 6: Mixed Content with Custom Styling
export const MixedContentExample = () => {
  return (
    <div className="p-6">
      <h2 className="text-h2 text-text-primary mb-6">Mixed Content Grid</h2>
      <Grid columns={3} gap="responsive" className="bg-background-primary p-6 rounded-xl">
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-32">
          <h3 className="text-text-primary font-semibold">Short Card</h3>
        </div>
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-48">
          <h3 className="text-text-primary font-semibold mb-2">Medium Card</h3>
          <p className="text-text-secondary">This card has more content and takes up more vertical space.</p>
        </div>
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-32">
          <h3 className="text-text-primary font-semibold">Short Card</h3>
        </div>
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-64">
          <h3 className="text-text-primary font-semibold mb-2">Tall Card</h3>
          <p className="text-text-secondary">
            This card has even more content and takes up significantly more vertical space. It demonstrates
            how the grid handles items with varying heights.
          </p>
        </div>
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-32">
          <h3 className="text-text-primary font-semibold">Short Card</h3>
        </div>
        <div className="bg-background-secondary rounded-lg p-4 border border-border-light h-40">
          <h3 className="text-text-primary font-semibold mb-2">Medium-Short Card</h3>
          <p className="text-text-secondary">Some content here.</p>
        </div>
      </Grid>
    </div>
  );
};

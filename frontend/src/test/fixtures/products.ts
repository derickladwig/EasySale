/**
 * Test fixtures for products
 */

export const mockProduct = {
  id: 'prod-001',
  sku: 'HAT-BLK-001',
  name: 'Black Baseball Hat',
  category: 'headwear',
  price: 19.99,
  cost: 8.5,
  quantity: 100,
  minStock: 10,
  attributes: {
    size: 'One Size',
    color: 'Black',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockAutoPart = {
  id: 'prod-002',
  sku: 'PART-BRK-001',
  name: 'Brake Pad Set',
  category: 'auto-parts',
  price: 89.99,
  cost: 45.0,
  quantity: 25,
  minStock: 5,
  attributes: {
    make: 'Toyota',
    model: 'Camry',
    year: '2020-2023',
    partNumber: 'BP-12345',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockPaint = {
  id: 'prod-003',
  sku: 'PAINT-WHT-001',
  name: 'Arctic White Base Coat',
  category: 'paint',
  price: 45.99,
  cost: 22.0,
  quantity: 50,
  minStock: 10,
  unit: 'liter',
  attributes: {
    colorCode: 'AW-001',
    finish: 'Gloss',
    brand: 'PPG',
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockProducts = [mockProduct, mockAutoPart, mockPaint];

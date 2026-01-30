/**
 * Store and Station Picker Component - Unit Tests
 *
 * Tests store and station selection functionality.
 *
 * Validates Requirements 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoreStationPicker } from './StoreStationPicker';

// Mock the hooks
const mockStores = [
  { id: 'store-1', name: 'Main Store', is_active: true },
  { id: 'store-2', name: 'Downtown Branch', is_active: true },
  { id: 'store-3', name: 'Airport Location', is_active: true },
];

const mockStations = [
  { id: 'station-1', name: 'Register 1', store_id: 'store-1', is_active: true },
  { id: 'station-2', name: 'Register 2', store_id: 'store-1', is_active: true },
  { id: 'station-3', name: 'Register 3', store_id: 'store-1', is_active: true },
  { id: 'station-4', name: 'Back Office', store_id: 'store-1', is_active: true },
];

vi.mock('../../admin/hooks/useStores', () => ({
  useStores: () => ({
    stores: mockStores,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../admin/hooks/useStations', () => ({
  useStations: () => ({
    stations: mockStations,
    isLoading: false,
    error: null,
  }),
}));

// ============================================================================
// Tests
// ============================================================================

describe('StoreStationPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders both store and station selects by default', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    expect(screen.getByTestId('store-select')).toBeTruthy();
    expect(screen.getByTestId('station-select')).toBeTruthy();
  });

  it('renders only store select when showStation is false', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
        showStation={false}
      />
    );

    expect(screen.getByTestId('store-select')).toBeTruthy();
    expect(screen.queryByTestId('station-select')).toBeFalsy();
  });

  it('renders only station select when showStore is false', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
        showStore={false}
      />
    );

    expect(screen.queryByTestId('store-select')).toBeFalsy();
    expect(screen.getByTestId('station-select')).toBeTruthy();
  });

  it('does not render when both showStore and showStation are false', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
        showStore={false}
        showStation={false}
      />
    );

    expect(screen.queryByTestId('store-station-picker')).toBeFalsy();
  });

  it('calls onStoreChange when store selected', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    const storeSelect = screen.getByTestId('store-select') as HTMLSelectElement;
    fireEvent.change(storeSelect, { target: { value: 'store-1' } });

    expect(onStoreChange).toHaveBeenCalledWith('store-1');
  });

  it('calls onStationChange when station selected', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    const stationSelect = screen.getByTestId('station-select') as HTMLSelectElement;
    fireEvent.change(stationSelect, { target: { value: 'station-2' } });

    expect(onStationChange).toHaveBeenCalledWith('station-2');
  });

  it('displays selected store value', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId="store-2"
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    const storeSelect = screen.getByTestId('store-select') as HTMLSelectElement;
    expect(storeSelect.value).toBe('store-2');
  });

  it('displays selected station value', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId="station-3"
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    const stationSelect = screen.getByTestId('station-select') as HTMLSelectElement;
    expect(stationSelect.value).toBe('station-3');
  });

  it('disables selects when disabled prop is true', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
        disabled={true}
      />
    );

    const storeSelect = screen.getByTestId('store-select') as HTMLSelectElement;
    const stationSelect = screen.getByTestId('station-select') as HTMLSelectElement;

    expect(storeSelect.disabled).toBe(true);
    expect(stationSelect.disabled).toBe(true);
  });

  it('displays store options', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    expect(screen.getByText('Main Store')).toBeTruthy();
    expect(screen.getByText('Downtown Branch')).toBeTruthy();
    expect(screen.getByText('Airport Location')).toBeTruthy();
  });

  it('displays station options', () => {
    const onStoreChange = vi.fn();
    const onStationChange = vi.fn();

    render(
      <StoreStationPicker
        storeId=""
        stationId=""
        onStoreChange={onStoreChange}
        onStationChange={onStationChange}
      />
    );

    expect(screen.getByText('Register 1')).toBeTruthy();
    expect(screen.getByText('Register 2')).toBeTruthy();
    expect(screen.getByText('Register 3')).toBeTruthy();
    expect(screen.getByText('Back Office')).toBeTruthy();
  });
});

// Sell Feature - Public API
// This file exports the public interface of the Sell feature

// Export pages
export { SellPage } from './pages/SellPage';

// Export components
export { PaymentModal } from './components/PaymentModal';
export { DiscountModal } from './components/DiscountModal';

// Export hooks
export { useCreateSale, useSale, useSalesList, useVoidSale } from './hooks/useSales';

// Export API
export { salesApi } from './api/salesApi';
export type { Sale, CreateSaleRequest, SaleLineItem } from './api/salesApi';

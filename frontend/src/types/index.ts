/**
 * TypeScript type definitions matching backend API
 * Corresponds to backend_db_requirements_v1.md
 */

// ========== Order Status ==========

/**
 * Order status types
 * - PENDING_PAYMENT: Awaiting payment (just placed)
 * - PAYMENT_UNDER_REVIEW: Payment under review (receipt uploaded)
 * - COMPLETED: Order completed
 */
export type OrderStatus = 'PENDING_PAYMENT' | 'PAYMENT_UNDER_REVIEW' | 'COMPLETED';

// ========== Product Types ==========

/**
 * Product base type (for create/update)
 */
export interface ProductBase {
  sku: string;
  name: string;
  price: number;
  stock_balance: number;
  image_path?: string | null;
}

/**
 * Full product type (with id, for list display)
 */
export interface Product extends ProductBase {
  id: number;
  updated_at?: string;
}

/**
 * Stock status categories (for UI color display)
 */
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';

/**
 * Determine stock status based on quantity
 */
export function getStockStatus(stockBalance: number): StockStatus {
  if (stockBalance === 0) return 'Out of Stock';
  if (stockBalance < 10) return 'Low Stock';
  return 'In Stock';
}

// ========== Order Types ==========

/**
 * Order item request body (when submitting cart)
 * Corresponds to backend OrderItemCreate
 */
export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}

/**
 * Order item response body (includes snapshot price at order time)
 */
export interface OrderItemResponse {
  id: number;
  product_id: number;
  quantity: number;
  price_at_time: number;
}

/**
 * Order creation request body
 * POST /api/v1/orders
 */
export interface OrderCreate {
  items: OrderItemCreate[];
}

/**
 * Order response body
 */
export interface OrderResponse {
  id: string;
  total_amount: number;
  status: OrderStatus;
  created_at?: string;
  items: OrderItemResponse[];
  payment_receipt?: PaymentReceiptResponse | null;
}

// ========== Payment Receipt Types ==========

/**
 * Payment receipt response body
 */
export interface PaymentReceiptResponse {
  id: number;
  order_id: string;
  file_path: string;
  uploaded_at?: string;
}

// ========== API General Types ==========

/**
 * API error response format
 */
export interface ApiError {
  detail: string;
}

// ========== Cart Types (Frontend Only) ==========

/**
 * Cart item (frontend state management)
 * Extends Product with quantity and error flag
 */
export interface CartItem {
  product: Product;
  quantity: number;
  /**
   * Error message set when stock is insufficient during order submission
   */
  error?: string;
}

// ========== File Upload Types ==========

/**
 * File upload progress callback
 */
export type UploadProgressCallback = (percent: number) => void;
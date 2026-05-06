/**
 * API 接口函数
 *
 * 状态流转说明（以创建订单为例）：
 * 1. 组件调用 createOrder(items)
 * 2. 函数内部调用 apiClient.post('/orders', { items })
 * 3. 后端开启事务，扣减库存，创建订单，返回 order_id
 * 4. 如果库存不足，后端返回 400，前端在 client.ts 拦截器中抛出错误
 * 5. 组件 catch 错误，更新 UI 显示哪个商品库存不足
 */

import apiClient from './client';
import type {
  Product,
  OrderCreate,
  OrderResponse,
} from '../types';

/**
 * 获取商品列表
 *
 * 流转路径：
 * GET /api/v1/products → 返回 Product[] → 存入 Zustand store → ProductDashboard 渲染
 *
 * @param search - 可选搜索关键词（按名称或 SKU 搜索）
 * @param skip - 分页偏移量
 * @param limit - 每页数量
 */
export async function fetchProducts(
  search?: string,
  skip: number = 0,
  limit: number = 100
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (search && search.trim()) params.append('search', search.trim());
  params.append('skip', String(skip));
  params.append('limit', String(limit));

  const response = await apiClient.get<Product[]>(`/products?${params.toString()}`);
  return response.data;
}

/**
 * 创建订单（提交购物车）
 *
 * 流转路径：
 * 1. 组件调用 createOrder([{product_id, quantity}, ...])
 * 2. POST /api/v1/orders → 后端事务：扣库存、建订单、建订单项
 * 3. 成功返回 OrderResponse 对象（包含 id）
 * 4. 组件跳转到 /order/:id
 * 5. 如果库存不足 → 400 错误 → 组件 catch，标记具体商品
 *
 * @param items - 订单项列表
 * @returns 订单 ID
 */
export async function createOrder(items: OrderCreate['items']): Promise<string> {
  // 后端直接返回 OrderResponse 对象，不是 { id: "..." }
  const response = await apiClient.post<OrderResponse>('/orders', { items });
  return response.data.id;
}

/**
 * Fetch order details
 *
 * Flow:
 * GET /api/v1/orders/{order_id} → Returns OrderResponse → OrderDetailPage renders
 *
 * Used for:
 * - Navigate to order page after placing order
 * - Confirm order status before payment upload
 * - Poll for order status changes after payment
 *
 * @param orderId - Order UUID
 */
export async function fetchOrder(orderId: string): Promise<OrderResponse> {
  const response = await apiClient.get<OrderResponse>(`/orders/${orderId}`);
  return response.data;
}

/**
 * Fetch orders list
 *
 * Flow:
 * GET /api/v1/orders → Returns OrderResponse[] → OrdersListPage renders
 *
 * @param orderId - Optional: filter by specific order ID
 * @param status - Optional: filter by status (PENDING_PAYMENT, PAYMENT_UNDER_REVIEW, COMPLETED)
 */
export async function fetchOrders(
  orderId?: string,
  status?: string
): Promise<OrderResponse[]> {
  const params = new URLSearchParams();
  if (orderId) params.append('order_id', orderId);
  if (status) params.append('status', status);

  const url = params.toString() ? `/orders?${params.toString()}` : '/orders';
  const response = await apiClient.get<OrderResponse[]>(url);
  return response.data;
}

/**
 * 上传支付凭证
 *
 * 流转路径：
 * 1. 组件调用 uploadPaymentReceipt(orderId, file, onProgress)
 * 2. POST /api/v1/orders/{order_id}/payment (multipart/form-data)
 * 3. 后端验证订单状态，更新为 PAYMENT_UNDER_REVIEW
 * 4. 成功返回 PaymentReceiptResponse
 * 5. 组件更新订单状态，隐藏上传按钮
 *
 * @param orderId - 订单 UUID
 * @param file - 支付凭证文件
 * @param onProgress - 上传进度回调（0-100）
 */
export async function uploadPaymentReceipt(
  orderId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);

  await apiClient.post(`/orders/${orderId}/payment`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    // Axios 上传进度配置
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
}

// ========== Admin Product APIs (Modules D-H) ==========

export interface ProductCreate {
  name: string;
  price: number;
  initial_stock: number;
}

export interface ProductUpdate {
  name: string;
  price: number;
}

export interface StockAdjust {
  adjustment: number;
}

export async function createProduct(data: ProductCreate): Promise<Product[]> {
  const response = await apiClient.post<Product[]>('/admin/products', data);
  return response.data;
}

export async function updateProduct(
  productId: number,
  name: string,
  price: number
): Promise<Product> {
  const response = await apiClient.put<Product>(`/admin/products/${productId}`, { name, price });
  return response.data;
}

export async function uploadProductImage(
  productId: number,
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ image_path: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post<{ image_path: string }>(
    `/admin/products/${productId}/image`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );
  return response.data;
}

export async function adjustStock(
  productId: number,
  adjustment: number
): Promise<Product> {
  const response = await apiClient.patch<Product>(`/admin/products/${productId}/stock`, { adjustment });
  return response.data;
}

export async function softDeleteProduct(productId: number): Promise<void> {
  await apiClient.delete(`/admin/products/${productId}`);
}
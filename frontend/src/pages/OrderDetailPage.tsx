/**
 * OrderDetailPage - Order details and payment upload page
 *
 * State flow:
 *
 * 【Page load】
 * Enter page → useEffect → fetchOrder(orderId) → setOrder(order)
 * → Display order status, item list, payment info
 *
 * 【Upload payment receipt】
 * Select file → Click upload → uploadPaymentReceipt(orderId, file, onProgress)
 * → Show upload progress → Success → Refresh order status → Show PAYMENT_UNDER_REVIEW
 *
 * 【Status display logic】
 * PENDING_PAYMENT → Show upload area
 * PAYMENT_UNDER_REVIEW → Show "Under Review" message, hide upload
 * COMPLETED → Show "Completed" message
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchOrder, uploadPaymentReceipt } from '../api/endpoints';
import type { OrderResponse, OrderStatus } from '../types';

// Backend server URL for static file serving
const getStaticBaseUrl = () => {
  if (import.meta.env.VITE_STATIC_BASE_URL) {
    return import.meta.env.VITE_STATIC_BASE_URL;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000`;
};
const STATIC_BASE_URL = getStaticBaseUrl();

// Construct full URL for static files
const getStaticUrl = (path: string): string => {
  if (!path) return '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${STATIC_BASE_URL}${normalizedPath}`;
};

// Order status config with labels and styles
const orderStatusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    className: 'bg-yellow-100 text-yellow-800',
  },
  PAYMENT_UNDER_REVIEW: {
    label: 'Payment Under Review',
    className: 'bg-blue-100 text-blue-800',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
};

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Local state
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File upload related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Load order data
  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // Initial load
  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (image or PDF)
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please select an image or PDF file');
        return;
      }
      setSelectedFile(file);
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      setUploadError(null);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !orderId) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      await uploadPaymentReceipt(
        orderId,
        selectedFile,
        (percent) => setUploadProgress(percent)
      );

      // After successful upload, reload order (to update status)
      await loadOrder();

      // Clear file selection
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadOrder}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-500">Order not found</div>
      </div>
    );
  }

  // Get status config
  const statusConfig = orderStatusConfig[order.status];
  const canUpload = order.status === 'PENDING_PAYMENT';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation */}
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            ←
          </button>
          <h1 className="text-base font-bold">Order Details</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Order status badge */}
        <div className={clsx(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          statusConfig.className
        )}>
          {statusConfig.label}
        </div>

        {/* Order amount */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="text-sm text-gray-500">Order Total</div>
          <div className="text-2xl font-bold text-blue-600">
            ${order.total_amount.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Created: {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
          </div>
        </div>

        {/* Order item list */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h2 className="font-medium mb-3">Order Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{item.product_name || `Product #${item.product_id}`}</div>
                  <div className="text-sm text-gray-500">
                    ${item.price_at_time.toFixed(2)} × {item.quantity}
                  </div>
                </div>
                <div className="font-medium">
                  ${(item.price_at_time * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment receipt display - show when receipt exists */}
        {order.payment_receipt && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="font-medium mb-3">Payment Receipt</h2>
            <div
              className="border rounded-lg overflow-hidden max-w-md mx-auto cursor-pointer hover:opacity-90"
              onClick={() => setShowReceiptModal(true)}
            >
              <img
                src={getStaticUrl(order.payment_receipt.file_path)}
                alt="Payment Receipt"
                className="w-full h-auto object-contain max-h-64"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const fallback = document.getElementById(`receipt-fallback-${order.id}`);
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <div
                id={`receipt-fallback-${order.id}`}
                className="hidden p-4 text-center text-gray-500"
              >
                <p>Unable to display receipt image.</p>
                <p className="text-sm mt-1">File: {order.payment_receipt.file_path}</p>
              </div>
            </div>
            {order.payment_receipt.uploaded_at && (
              <p className="text-xs text-gray-400 mt-2">
                Uploaded: {new Date(order.payment_receipt.uploaded_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Receipt Image Modal */}
        {showReceiptModal && order.payment_receipt && (
          <>
            <div
              className="fixed inset-0 bg-black/90 z-50"
              onClick={() => setShowReceiptModal(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <button
                onClick={() => setShowReceiptModal(false)}
                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white text-2xl"
              >
                ×
              </button>
              <img
                src={getStaticUrl(order.payment_receipt.file_path)}
                alt="Payment Receipt"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </>
        )}

        {/* Payment receipt upload area */}
        {canUpload && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="font-medium mb-3">Upload Payment Receipt</h2>

            {/* Image preview */}
            {previewUrl && (
              <div className="mb-3 border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-48 object-contain bg-gray-100"
                />
              </div>
            )}

            {/* Upload buttons - Camera and Gallery */}
            <div className="flex gap-2 mb-3">
              {/* Camera button */}
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium text-center cursor-pointer hover:bg-gray-200"
              >
                <span className="block text-lg">📷</span>
                <span className="text-xs">Camera</span>
              </button>

              {/* Gallery button */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium text-center cursor-pointer hover:bg-gray-200"
              >
                <span className="block text-lg">🖼️</span>
                <span className="text-xs">Gallery</span>
              </button>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Selected file info */}
            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="ml-2 p-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            )}

            {/* Upload error */}
            {uploadError && (
              <p className="text-red-600 text-sm mt-2">{uploadError}</p>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className={clsx(
                'mt-4 w-full py-2 rounded-lg font-medium text-white transition-colors',
                !selectedFile || uploading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {uploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        )}

        {/* Non-pending payment status message */}
        {!canUpload && (
          <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-500">
            {order.status === 'PAYMENT_UNDER_REVIEW'
              ? 'Receipt uploaded, under review...'
              : 'Order completed'}
          </div>
        )}
      </div>
    </div>
  );
};
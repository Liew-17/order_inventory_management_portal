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

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchOrder, uploadPaymentReceipt } from '../api/endpoints';
import type { OrderResponse, OrderStatus } from '../types';

// Backend server URL for static file serving
const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:8000';

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

  // Local state
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // File upload related state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
      setUploadError(null);
    }
  };

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
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle drag and drop upload
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please select an image or PDF file');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
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
        <div className="flex items-center gap-3">
          {/* Back button */}
          <Link
            to="/"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </Link>
          <div>
            <h1 className="text-lg font-bold">Order Details</h1>
            <p className="text-sm text-gray-500">Order ID: {order.id}</p>
          </div>
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
            <div className="border rounded-lg overflow-hidden max-w-md mx-auto">
              <img
                src={getStaticUrl(order.payment_receipt.file_path)}
                alt="Payment Receipt"
                className="w-full h-auto object-contain max-h-64"
                onError={(e) => {
                  // Fallback for PDF or if image fails to load
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

        {/* Payment receipt upload area */}
        {canUpload && (
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h2 className="font-medium mb-3">Upload Payment Receipt</h2>

            {/* Drag and drop upload area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className={clsx(
                'border-2 border-dashed rounded-lg p-6 text-center',
                selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              )}
            >
              {selectedFile ? (
                <div>
                  <p className="text-blue-600 font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="mt-2 text-sm text-red-500 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500">Drag file here, or</p>
                  <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
                    Click to select
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-2">
                    Supports JPG, PNG, GIF, PDF
                  </p>
                </div>
              )}
            </div>

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
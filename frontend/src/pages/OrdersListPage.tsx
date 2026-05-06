/**
 * OrdersListPage - Orders list page
 *
 * Features:
 * - Search by Order ID
 * - Filter by status (All, Pending Payment, Under Review, Completed)
 * - Display order cards with ID, total amount, creation time, and status
 * - Click card to navigate to order detail page
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchOrders } from '../api/endpoints';
import type { OrderResponse, OrderStatus } from '../types';

// Status filter options
const statusFilters = [
  { label: 'All', value: null },
  { label: 'Pending', value: 'PENDING_PAYMENT' },
  { label: 'Review', value: 'PAYMENT_UNDER_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
];

// Status config for display
const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800',
  },
  PAYMENT_UNDER_REVIEW: {
    label: 'Review',
    className: 'bg-blue-100 text-blue-800',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
};

export const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();
  const requestIdRef = useRef(0);

  // Local state
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

  // Load orders data
  const loadOrders = useCallback(async (skip = 0, append = false, search?: string, status?: string) => {
    const currentRequestId = ++requestIdRef.current;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await fetchOrders(
        search || undefined,
        status || undefined,
        skip,
        pageSize
      );
      if (currentRequestId !== requestIdRef.current) return; // Ignore stale response
      if (append) {
        setOrders(prev => [...prev, ...data]);
      } else {
        setOrders(data);
      }
      setHasMore(data.length === pageSize);
    } catch (err) {
      if (currentRequestId !== requestIdRef.current) return; // Ignore stale response
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      if (currentRequestId !== requestIdRef.current) return; // Ignore stale response
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Load on mount and when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders(0, false, searchId, selectedStatus || undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchId, selectedStatus]);

  // Handle status filter change
  const handleStatusChange = (status: string | null) => {
    setSelectedStatus(status);
    setSearchId('');
  };

  // Handle load more
  const handleLoadMore = () => {
    loadOrders(orders.length, true, searchId, selectedStatus || undefined);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation */}
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
          >
            ←
          </button>
          <h1 className="text-base font-bold">My Orders</h1>
        </div>

        {/* Search form */}
        <input
          type="text"
          placeholder="Search by Order ID..."
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mt-4">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => handleStatusChange(filter.value)}
              className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                selectedStatus === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="p-4 space-y-4">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => loadOrders(0, false, searchId, selectedStatus || undefined)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No orders found
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status];
              return (
                <div
                  key={order.id}
                  onClick={() => navigate(`/order/${order.id}`)}
                  className="bg-white rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-500 font-mono">{order.id}</p>
                      <p className="text-lg font-bold text-blue-600">
                        ${order.total_amount.toFixed(2)}
                      </p>
                    </div>
                    <span className={clsx(
                      'px-2 py-1 rounded-full text-xs font-medium',
                      status.className
                    )}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleString() : '-'}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="text-center pt-4">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
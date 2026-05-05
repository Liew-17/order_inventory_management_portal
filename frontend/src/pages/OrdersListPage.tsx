/**
 * OrdersListPage - Orders list page
 *
 * Features:
 * - Search by Order ID
 * - Filter by status (All, Pending Payment, Under Review, Completed)
 * - Display order cards with ID, total amount, creation time, and status
 * - Click card to navigate to order detail page
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchOrders } from '../api/endpoints';
import type { OrderResponse, OrderStatus } from '../types';

// Status filter options
const statusFilters = [
  { label: 'All', value: null },
  { label: 'Pending Payment', value: 'PENDING_PAYMENT' },
  { label: 'Under Review', value: 'PAYMENT_UNDER_REVIEW' },
  { label: 'Completed', value: 'COMPLETED' },
];

// Status config for display
const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING_PAYMENT: {
    label: 'Pending Payment',
    className: 'bg-yellow-100 text-yellow-800',
  },
  PAYMENT_UNDER_REVIEW: {
    label: 'Under Review',
    className: 'bg-blue-100 text-blue-800',
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
};

export const OrdersListPage: React.FC = () => {
  const navigate = useNavigate();

  // Local state
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Load orders data
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchOrders(
        searchId || undefined,
        selectedStatus || undefined
      );
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [searchId, selectedStatus]);

  // Load on mount and when filters change
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle search by order ID
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation */}
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex items-center gap-3 mb-4">
          {/* Back button */}
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-bold">My Orders</h1>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setSelectedStatus(filter.value)}
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
              onClick={loadOrders}
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
          </div>
        )}
      </div>
    </div>
  );
};
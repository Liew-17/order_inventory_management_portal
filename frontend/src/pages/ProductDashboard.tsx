/**
 * ProductDashboard - Product listing page
 *
 * State flow:
 *
 * 【Page load】
 * Component mounts → useEffect → fetchProducts() → setProducts(products)
 * → Render ProductCard list
 *
 * 【Search function】
 * User enters search term → debounce 300ms → setSearch(searchTerm)
 * → Trigger useEffect to refetch products (backend filters by name/sku)
 *
 * 【Empty state】
 * products.length === 0 && !loading → Show empty state message
 *
 * 【Error state】
 * fetchProducts fails → setError(error.message) → Show error with retry
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { fetchProducts } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

export const ProductDashboard: React.FC = () => {
  // Local state
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Get cart state from Zustand store (for badge count display)
  const items = useCartStore((state) => state.items);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const toggleDrawer = useCartStore((state) => state.toggleDrawer);

  // Load products data
  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Call API to get product list
      // Supports search by name or sku
      const data = await fetchProducts(search);
      setProducts(data);
    } catch (err) {
      // Error handling: show error message, allow retry
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [search]);

  // Watch for search changes, use debounce to avoid too many requests
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [loadProducts]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top navigation bar */}
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex gap-2 mb-3">
          {/* My Orders button */}
          <Link
            to="/orders"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            My Orders
          </Link>

          {/* Admin Manage Products button */}
          <Link
            to="/admin/products"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            Manage Products
          </Link>

          {/* Spacer to push cart to right */}
          <div className="flex-1" />

          {/* Cart button (with badge showing count) */}
          <button
            onClick={() => toggleDrawer(true)}
            className="relative p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {/* Cart icon (emoji) */}
            <span className="text-xl">🛒</span>

            {/* Count badge */}
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Main content: product grid */}
      <div className="p-4">
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
              onClick={loadProducts}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            {search ? 'No matching products found' : 'No products available'}
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchProducts } from '../api/endpoints';
import type { Product } from '../types';

export function AdminProductListPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts('', 0, 100);
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-900">Product Management</h1>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/admin/products/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add New Product
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
            No products found. Add your first product!
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="space-y-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{product.name}</div>
                  <div className="text-sm text-gray-500 space-x-4">
                    <span>SKU: {product.sku}</span>
                    <span>Price: ${product.price.toFixed(2)}</span>
                    <span>Stock: {product.stock_balance}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-sm font-medium',
                    'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  )}
                >
                  Edit / Manage
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

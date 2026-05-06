import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { fetchProducts, updateProduct, uploadProductImage, adjustStock, softDeleteProduct } from '../api/endpoints';
import type { Product } from '../types';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';

const STATIC_BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || 'http://localhost:8000';

function getImageUrl(imagePath: string | null | undefined): string {
  if (!imagePath) return '';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${STATIC_BASE_URL}${normalizedPath}`;
}

export function AdminProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id!, 10);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProduct = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts('', 0, 100);
      const found = data.find((p) => p.id === productId);
      if (!found) {
        setError('Product not found');
        return;
      }
      setProduct(found);
      setName(found.name);
      setPrice(String(found.price));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setError(null);
    try {
      await updateProduct(productId, name.trim(), parseFloat(price));
      showToast('Product updated successfully', 'success');
      loadProduct();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update product', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    setError(null);
    try {
      await uploadProductImage(productId, file);
      showToast('Image uploaded successfully', 'success');
      loadProduct();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to upload image', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleAdjustStock = async (delta: number) => {
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid quantity', 'error');
      return;
    }
    const adjustment = delta * qty;
    setAdjusting(true);
    setError(null);
    try {
      const updated = await adjustStock(productId, adjustment);
      setProduct(updated);
      setAdjustQty('');
      showToast('Stock adjusted successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Insufficient stock to reduce', 'error');
    } finally {
      setAdjusting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Product not found'}</p>
          <Link to="/admin/products" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  const qty = parseInt(adjustQty, 10) || 0;
  const canReduce = qty > 0 && qty <= product.stock_balance;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-gray-900">Edit Product</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Section 1: Info & Image */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Product Info & Image</h2>

          <form onSubmit={handleSaveInfo} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-500">
              SKU: <span className="font-medium text-gray-700">{product.sku}</span>
            </div>
            <button
              type="submit"
              disabled={savingInfo}
              className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:bg-gray-300"
            >
              {savingInfo ? 'Saving...' : 'Save Info'}
            </button>
          </form>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <div className="bg-gray-100 rounded-md h-40 flex items-center justify-center overflow-hidden mb-2">
              {product.image_path ? (
                <img src={getImageUrl(product.image_path)} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-400 text-sm">No Image</span>
              )}
            </div>
            <label className={clsx(
              'w-full py-2 rounded-lg bg-gray-100 text-gray-700 font-medium text-center cursor-pointer hover:bg-gray-200 block',
              uploadingImage && 'opacity-50 cursor-not-allowed'
            )}>
              {uploadingImage ? 'Uploading...' : 'Change Image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploadingImage} />
            </label>
          </div>
        </div>

        {/* Section 2: Stock Adjustment */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">Stock Adjustment</h2>

          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <div className="text-sm text-gray-500">Current Stock</div>
            <div className="text-3xl font-bold text-blue-600">{product.stock_balance}</div>
          </div>

          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              placeholder="Qty"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleAdjustStock(1)}
              disabled={adjusting || qty <= 0}
              className={clsx(
                'px-4 py-2 rounded-lg font-bold',
                qty <= 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              Add Stock (+)
            </button>
            <button
              onClick={() => handleAdjustStock(-1)}
              disabled={adjusting || !canReduce}
              className={clsx(
                'px-4 py-2 rounded-lg font-bold',
                !canReduce ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
              )}
            >
              Reduce (-)
            </button>
          </div>
          {adjustQty && qty > product.stock_balance && (
            <p className="text-xs text-red-500">Cannot reduce more than current stock ({product.stock_balance})</p>
          )}
        </div>

        {/* Section 3: Danger Zone */}
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4 space-y-3">
          <h2 className="font-semibold text-red-600">Danger Zone</h2>
          <p className="text-sm text-gray-500">Once deleted, this product will no longer appear on the shop dashboard.</p>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
          >
            Delete Product
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Product"
        message="This product will no longer appear on the shop dashboard. This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => {
          setShowDeleteConfirm(false);
          softDeleteProduct(productId)
            .then(() => {
              showToast('Product deleted', 'success');
              navigate('/admin/products');
            })
            .catch((err) => showToast(err instanceof Error ? err.message : 'Failed to delete', 'error'));
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

/**
 * ProductCard - Product card component
 *
 * State flow:
 *
 * 【Stock status display】
 * stock_balance > 10 → Green "In Stock"
 * stock_balance < 10 && > 0 → Orange "Low Stock"
 * stock_balance === 0 → Button disabled, show "Out of Stock"
 *
 * 【Add to cart flow】
 * User clicks "+" button → Opens quantity modal
 * → User adjusts quantity with +/- or direct input
 * → Click "Add to Cart" → cartStore.addItem(product) with specified quantity
 * → Modal closes
 */

import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useCartStore } from '../store/cartStore';
import type { Product, StockStatus } from '../types';

// Stock status function
function getStockStatus(stockBalance: number): StockStatus {
  if (stockBalance === 0) return 'Out of Stock';
  if (stockBalance < 10) return 'Low Stock';
  return 'In Stock';
}

// Stock status color styles
const stockStatusStyles: Record<StockStatus, string> = {
  'In Stock': 'bg-green-100 text-green-800',
  'Low Stock': 'bg-orange-100 text-orange-800',
  'Out of Stock': 'bg-gray-100 text-gray-500',
};

// Backend server URL (for constructing full image URL)
const getStaticBaseUrl = () => {
  if (import.meta.env.VITE_STATIC_BASE_URL) {
    return import.meta.env.VITE_STATIC_BASE_URL;
  }
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:8000`;
};
const STATIC_BASE_URL = getStaticBaseUrl();

// Construct full image path with proper /
const getImageUrl = (imagePath: string | null | undefined): string => {
  if (!imagePath) return '';
  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${STATIC_BASE_URL}${normalizedPath}`;
};

interface ProductCardProps {
  /** Product data */
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const addItem = useCartStore((state) => state.addItem);
  const items = useCartStore((state) => state.items);
  const stockStatus = getStockStatus(product.stock_balance);
  const isOutOfStock = product.stock_balance === 0;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [inputValue, setInputValue] = useState('1');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get current quantity in cart for this product
  const getCartQuantity = () => {
    const cartItem = items.find((item) => item.product.id === product.id);
    return cartItem ? cartItem.quantity : 0;
  };

  // Calculate max quantity user can add (stock - already in cart)
  const getMaxAddable = () => {
    const inCart = getCartQuantity();
    return product.stock_balance - inCart;
  };

  // Open modal and reset quantity
  const handleOpenModal = () => {
    if (isOutOfStock) return;
    setQuantity(1);
    setInputValue('1');
    setShowError(false);
    setErrorMessage('');
    setIsModalOpen(true);
    // Don't focus input - let user click to type if needed
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowError(false);
  };

  // Trigger shake animation
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Handle quantity change from +/- buttons
  const handleQuantityChange = (delta: number) => {
    const maxAddable = getMaxAddable();
    const newQty = Math.max(1, Math.min(quantity + delta, maxAddable));
    setQuantity(newQty);
    setInputValue(String(newQty));

    // Clear error if quantity is now valid
    if (newQty <= maxAddable && newQty >= 1) {
      setShowError(false);
    }
  };

  // Handle direct input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const maxAddable = getMaxAddable();

    // Allow empty input temporarily for typing experience
    if (value === '') {
      setInputValue(value);
      setQuantity(0);
      return;
    }

    // Parse the value
    const parsed = parseInt(value, 10);

    // If not a valid number, don't update
    if (isNaN(parsed)) {
      return;
    }

    // Clamp to valid range immediately
    if (parsed < 1) {
      setInputValue('1');
      setQuantity(1);
    } else if (parsed > maxAddable) {
      setInputValue(String(maxAddable));
      setQuantity(maxAddable);
    } else {
      setInputValue(String(parsed));
      setQuantity(parsed);
    }
    setShowError(false);
  };

  // Handle input blur - reset to valid quantity if invalid
  const handleInputBlur = () => {
    const maxAddable = getMaxAddable();
    if (quantity < 1 || quantity > maxAddable) {
      setQuantity(1);
      setInputValue('1');
      setShowError(false);
    }
  };

  // Confirm add to cart
  const handleConfirmAdd = () => {
    const maxAddable = getMaxAddable();
    const inCart = getCartQuantity();

    // Validate
    if (quantity < 1 || quantity > maxAddable) {
      setErrorMessage(`Cannot add more. Only ${maxAddable} available (${inCart} already in cart)`);
      setShowError(true);
      triggerShake();
      return;
    }

    // Add item to cart with specified quantity
    addItem(product, quantity);
    handleCloseModal();
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col h-full">
        {/* Product image area */}
        <div className="bg-gray-100 rounded-md h-32 mb-3 flex items-center justify-center overflow-hidden shrink-0">
          {product.image_path ? (
            <img
              src={getImageUrl(product.image_path)}
              alt={product.name}
              className="h-full w-full object-cover rounded-md"
            />
          ) : (
            <span className="text-gray-400 text-sm">No Image</span>
          )}
        </div>

        {/* SKU label */}
        <div className="text-xs text-gray-500 mb-1 shrink-0">{product.sku}</div>

        {/* Product name - takes remaining space */}
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price */}
        <div className="text-lg font-bold text-blue-600 mb-2 shrink-0">
          ${product.price.toFixed(2)}
        </div>

        {/* Stock status badge */}
        <div className="mb-3 shrink-0">
          <span className={clsx(
            'inline-block px-2 py-1 rounded-full text-xs font-medium',
            stockStatusStyles[stockStatus]
          )}>
            {stockStatus}
          </span>
          <span className="text-xs text-gray-500 ml-2">
            {product.stock_balance} left
          </span>
        </div>

        {/* Add button - always at bottom */}
        <button
          onClick={handleOpenModal}
          disabled={isOutOfStock}
          className={clsx(
            'w-full py-2 rounded-md font-medium transition-colors mt-auto',
            isOutOfStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
          )}
        >
          {isOutOfStock ? 'Out of Stock' : '+'}
        </button>
      </div>

      {/* Quantity Modal */}
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={handleCloseModal}
          />

          {/* Modal */}
          <div className={clsx(
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            isShaking && 'animate-shake'
          )}>
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900">Add to Cart</h3>
                <p className="text-sm text-gray-500">{product.name}</p>
              </div>

              {/* Price display */}
              <div className="text-sm text-gray-600 mb-4">
                Unit price: <span className="font-medium">${product.price.toFixed(2)}</span>
                <br />
                Available: <span className="font-medium">{product.stock_balance}</span>
                {getCartQuantity() > 0 && (
                  <>
                    <br />
                    Already in cart: <span className="font-medium text-orange-600">{getCartQuantity()}</span>
                    <br />
                    Can add: <span className="font-medium text-green-600">{getMaxAddable()}</span>
                  </>
                )}
              </div>

              {/* Error message */}
              {showError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                  {errorMessage}
                </div>
              )}

              {/* Quantity controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* Decrease button */}
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className={clsx(
                    'w-12 h-12 rounded-full font-bold text-xl transition-colors',
                    quantity <= 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  )}
                >
                  −
                </button>

                {/* Quantity input */}
                <input
                  ref={inputRef}
                  type="number"
                  min="1"
                  max={getMaxAddable()}
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="w-24 h-12 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />

                {/* Increase button */}
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= getMaxAddable()}
                  className={clsx(
                    'w-12 h-12 rounded-full font-bold text-xl transition-colors',
                    quantity >= getMaxAddable()
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  +
                </button>
              </div>

              {/* Total price */}
              <div className="text-center mb-6 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total: </span>
                <span className="text-2xl font-bold text-blue-600">
                  ${(product.price * quantity).toFixed(2)}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-3 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAdd}
                  disabled={quantity < 1 || quantity > getMaxAddable()}
                  className={clsx(
                    'flex-1 py-3 rounded-lg font-bold text-white transition-colors',
                    quantity < 1 || quantity > getMaxAddable()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
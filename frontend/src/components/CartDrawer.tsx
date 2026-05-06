/**
 * CartDrawer - Shopping cart side drawer component
 *
 * State flow:
 *
 * 【Drawer toggle】
 * Click cart icon → cartStore.toggleDrawer(true) → Drawer slides in
 * Click overlay/close button → cartStore.toggleDrawer(false) → Drawer slides out
 *
 * 【Quantity modification】
 * Click +/- → cartStore.updateQuantity(productId, newQty)
 * → Triggers totalAmount recalculation
 *
 * 【Remove item】
 * Click delete → cartStore.removeItem(productId)
 *
 * 【Submit order flow】
 * Click "Confirm Order" → Call createOrder API
 * → Success: cartStore.clearCart() + navigate to /order/:id
 * → Failure (stock insufficient): cartStore.setItemError(productId, error)
 * → UI highlights products with insufficient stock
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useCartStore } from '../store/cartStore';
import { createOrder } from '../api/endpoints';
import type { CartItem } from '../types';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();

  // Get state and actions from store
  const {
    items,
    isDrawerOpen,
    toggleDrawer,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
    setItemError,
    clearItemError,
  } = useCartStore();

  // Local loading state (prevent duplicate submissions)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit order handler
  const handleSubmitOrder = async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Construct API request body: [{product_id, quantity}, ...]
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      // Call createOrder API
      // Success: returns order ID
      const orderId = await createOrder(orderItems);

      // After successful order:
      // 1. Clear cart
      clearCart();
      // 2. Close drawer
      toggleDrawer(false);
      // 3. Navigate to order detail page
      navigate(`/order/${orderId}`);

    } catch (error) {
      // Order failed (usually stock insufficient)
      // Backend returns 400, error format: "Product X stock insufficient"
      const errorMessage = error instanceof Error ? error.message : 'Order failed';
      console.error('Order failed:', errorMessage);

      // Parse error message to identify which product has insufficient stock
      // Error format: "Product 1 stock insufficient (requested: 10, available: 5)"
      const match = errorMessage.match(/Product (\d+)/);
      if (match) {
        const productId = parseInt(match[1], 10);
        setItemError(productId, errorMessage);
      } else {
        // If can't parse, mark all products with error
        items.forEach((item) => {
          setItemError(item.product.id, errorMessage);
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Individual cart item component
  const CartItemRow: React.FC<{ item: CartItem }> = ({ item }) => {
    const handleQuantityChange = (delta: number) => {
      const newQty = item.quantity + delta;

      // Clear error flag when user modifies quantity (user is retrying)
      clearItemError(item.product.id);

      // Update quantity (Zustand store handles <= 0 case, auto-removes item)
      updateQuantity(item.product.id, newQty);
    };

    return (
      <div className={clsx(
        'flex items-center gap-3 p-3 bg-white rounded-lg',
        item.error && 'border-2 border-red-500 bg-red-50' // Highlight on stock error
      )}>
        {/* Product info */}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {item.product.name}
          </div>
          <div className="text-sm text-gray-500">
            ${item.product.price.toFixed(2)} × {item.quantity}
          </div>

          {/* Error message display */}
          {item.error && (
            <div className="text-xs text-red-600 mt-1">
              {item.error}
            </div>
          )}
        </div>

        {/* Quantity control buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuantityChange(-1)}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            -
          </button>
          <span className="w-8 text-center font-medium">
            {item.quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(1)}
            disabled={item.quantity >= item.product.stock_balance}
            className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center',
              item.quantity >= item.product.stock_balance
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
            )}
          >
            +
          </button>
        </div>

        {/* Delete button */}
        <button
          onClick={() => removeItem(item.product.id)}
          className="text-gray-400 hover:text-red-500 p-1"
        >
          ✕
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Overlay - click to close drawer */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => toggleDrawer(false)}
        />
      )}

      {/* Drawer - slides in from right */}
      <div className={clsx(
        'fixed right-0 top-0 h-full w-full max-w-md bg-gray-50 z-50',
        'transform transition-transform duration-300 ease-in-out',
        'flex flex-col shadow-xl',
        isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-base font-bold">Shopping Cart</h2>
          <button
            onClick={() => toggleDrawer(false)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Cart item list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Cart is empty
            </div>
          ) : (
            items.map((item) => (
              <CartItemRow key={item.product.id} item={item} />
            ))
          )}
        </div>

        {/* Bottom checkout section */}
        <div className="p-4 bg-white border-t space-y-4">
          {/* Total amount */}
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Amount</span>
            <span className="text-2xl font-bold text-blue-600">
              ${totalAmount().toFixed(2)}
            </span>
          </div>

          {/* Submit button */}
          <button
            onClick={handleSubmitOrder}
            disabled={items.length === 0 || isSubmitting}
            className={clsx(
              'w-full py-3 rounded-lg font-bold text-white transition-colors',
              items.length === 0 || isSubmitting
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm Order'}
          </button>
        </div>
      </div>
    </>
  );
};
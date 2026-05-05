/**
 * 购物车 Zustand Store
 *
 * 状态流转说明：
 *
 * 【加入购物车】
 * ProductCard 点击 "+" → cartStore.addItem(product) → items 数组添加 CartItem
 *
 * 【修改数量】
 * CartDrawer 点击 +/- → cartStore.updateQuantity(productId, newQty) → 更新对应商品数量
 *
 * 【删除商品】
 * CartDrawer 点击删除 → cartStore.removeItem(productId) → 从 items 数组移除
 *
 * 【清空购物车】
 * 订单创建成功后 → cartStore.clearCart() → items = []
 *
 * 【库存错误标记】
 * createOrder 失败时 → cartStore.setItemError(productId, errorMsg) → 该商品高亮显示
 *
 * 【清除错误】
 * 用户修改数量后 → cartStore.clearItemError(productId) → 清除错误标记
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 持久化到 localStorage
import type { Product, CartItem } from '../types';

interface CartState {
  // ========== 状态定义 ==========

  /** 购物车中的商品列表 */
  items: CartItem[];

  /** 购物车是否展开（控制抽屉开关） */
  isDrawerOpen: boolean;

  // ========== 计算属性（getters）==========

  /** 购物车商品总数量 */
  totalItems: () => number;

  /** 购物车商品总金额（价格 × 数量 之和）*/
  totalAmount: () => number;

  // ========== Actions（状态修改方法）==========

  /** 添加商品到购物车（如果已存在则增加数量）*/
  addItem: (product: Product) => void;

  /** 移除商品从购物车 */
  removeItem: (productId: number) => void;

  /** 更新商品数量 */
  updateQuantity: (productId: number, quantity: number) => void;

  /** 清除购物车（下单成功后调用）*/
  clearCart: () => void;

  /** 设置某个商品的错误信息（库存不足等）*/
  setItemError: (productId: number, error: string) => void;

  /** 清除某个商品的错误信息（用户修改后）*/
  clearItemError: (productId: number) => void;

  /** 展开/收起购物车抽屉 */
  toggleDrawer: (open?: boolean) => void;
}

// 使用 zustand 的 persist 中间件，将购物车状态持久化到 localStorage
// 这样用户刷新页面后购物车内容不会丢失
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // ========== 初始状态 ==========
      items: [],
      isDrawerOpen: false,

      // ========== 计算属性实现 ==========

      totalItems: () => {
        // 累加所有商品的数量
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      totalAmount: () => {
        // 计算总价：每件商品 price × quantity 之和
        return get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      },

      // ========== Actions 实现 ==========

      addItem: (product: Product) => {
        set((state) => {
          // 检查该商品是否已在购物车
          const existingIndex = state.items.findIndex(
            (item) => item.product.id === product.id
          );

          if (existingIndex >= 0) {
            // 已存在：增加数量
            const newItems = [...state.items];
            newItems[existingIndex] = {
              ...newItems[existingIndex],
              quantity: newItems[existingIndex].quantity + 1,
            };
            return { items: newItems };
          } else {
            // 不存在：添加新项
            return {
              items: [
                ...state.items,
                { product, quantity: 1 },
              ],
            };
          }
        });
      },

      removeItem: (productId: number) => {
        set((state) => ({
          // 过滤掉指定商品
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      updateQuantity: (productId: number, quantity: number) => {
        if (quantity <= 0) {
          // 数量 <= 0 时移除商品
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          // 更新指定商品的数量
          items: state.items.map((item) =>
            item.product.id === productId
              ? { ...item, quantity, error: undefined } // 修改数量时清除错误
              : item
          ),
        }));
      },

      clearCart: () => {
        // 清空所有商品
        set({ items: [] });
      },

      setItemError: (productId: number, error: string) => {
        set((state) => ({
          // 设置指定商品的错误信息，用于 UI 高亮
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, error } : item
          ),
        }));
      },

      clearItemError: (productId: number) => {
        set((state) => ({
          // 清除指定商品的错误信息
          items: state.items.map((item) =>
            item.product.id === productId ? { ...item, error: undefined } : item
          ),
        }));
      },

      toggleDrawer: (open?: boolean) => {
        set((state) => ({
          // 如果传入了 open 参数则用它，否则取反当前状态
          isDrawerOpen: open !== undefined ? open : !state.isDrawerOpen,
        }));
      },
    }),
    {
      // 持久化配置：只持久化 items，不持久化 isDrawerOpen
      name: 'cart-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
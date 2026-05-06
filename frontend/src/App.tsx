import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProductDashboard } from './pages/ProductDashboard';
import { OrdersListPage } from './pages/OrdersListPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AdminProductListPage } from './pages/AdminProductListPage';
import { AdminProductNewPage } from './pages/AdminProductNewPage';
import { AdminProductEditPage } from './pages/AdminProductEditPage';
import { CartDrawer } from './components/CartDrawer';

/**
 * App root component
 *
 * Route structure:
 * /                     → ProductDashboard (product listing)
 * /orders               → OrdersListPage (my orders list)
 * /order/:orderId       → OrderDetailPage (order details & payment)
 * /admin/products       → AdminProductListPage (admin product list)
 * /admin/products/new   → AdminProductNewPage (add product form)
 * /admin/products/:id/edit → AdminProductEditPage (edit product & stock)
 *
 * CartDrawer is a global component, always mounted, for showing cart on any page
 */
function App() {
  return (
    <BrowserRouter>
      {/* Global cart drawer (always rendered, controlled by zustand) */}
      <CartDrawer />

      {/* Route configuration */}
      <Routes>
        <Route path="/" element={<ProductDashboard />} />
        <Route path="/orders" element={<OrdersListPage />} />
        <Route path="/order/:orderId" element={<OrderDetailPage />} />
        <Route path="/admin/products" element={<AdminProductListPage />} />
        <Route path="/admin/products/new" element={<AdminProductNewPage />} />
        <Route path="/admin/products/:id/edit" element={<AdminProductEditPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
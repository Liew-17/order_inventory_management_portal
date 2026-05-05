import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProductDashboard } from './pages/ProductDashboard';
import { OrdersListPage } from './pages/OrdersListPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { CartDrawer } from './components/CartDrawer';

/**
 * App root component
 *
 * Route structure:
 * /           → ProductDashboard (product listing)
 * /orders     → OrdersListPage (my orders list)
 * /order/:id  → OrderDetailPage (order details & payment)
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
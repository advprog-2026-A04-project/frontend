import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import NotFoundPage from './pages/NotFoundPage';

// Order feature
import OrderListPage from './features/order/OrderListPage';
import OrderDetailPage from './features/order/OrderDetailPage';

// Voucher-Promo feature
import VoucherListPage from './features/voucher-promo/VoucherListPage';

// Inventory feature
import InventoryPage from './features/inventory/InventoryPage';
import ProductDetailPage from './features/inventory/ProductDetailPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Home redirects to inventory/katalog */}
          <Route index element={<Navigate to="/inventory" replace />} />

          {/* Order routes */}
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />

          {/* Voucher-Promo routes */}
          <Route path="vouchers" element={<VoucherListPage />} />

          {/* Inventory routes */}
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

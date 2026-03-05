import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';

// Auth-Profile feature
import LoginPage from './features/auth-profile/LoginPage';
import RegisterPage from './features/auth-profile/RegisterPage';
import ProfilePage from './features/auth-profile/ProfilePage';

// Order feature
import OrderListPage from './features/order/OrderListPage';
import OrderDetailPage from './features/order/OrderDetailPage';

// Voucher-Promo feature
import VoucherListPage from './features/voucher-promo/VoucherListPage';

// Wallet feature
import WalletPage from './features/wallet/WalletPage';

// Inventory feature
import InventoryPage from './features/inventory/InventoryPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          {/* Home */}
          <Route index element={<HomePage />} />

          {/* Auth-Profile routes */}
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Order routes */}
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:id" element={<OrderDetailPage />} />

          {/* Voucher-Promo routes */}
          <Route path="vouchers" element={<VoucherListPage />} />

          {/* Wallet routes */}
          <Route path="wallet" element={<WalletPage />} />

          {/* Inventory routes */}
          <Route path="inventory" element={<InventoryPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { SessionProvider } from './context/SessionContext';
import AdminPage from './pages/AdminPage';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import JastiperOrdersPage from './pages/JastiperOrdersPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderResultPage from './pages/OrderResultPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import WalletPage from './pages/WalletPage';

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<HomePage />} path="/" />
          <Route element={<CatalogPage />} path="/browse" />
          <Route element={<CatalogPage />} path="/products" />
          <Route element={<ProductDetailPage />} path="/product/:productId" />
          <Route element={<ProductDetailPage />} path="/products/:productId" />
          <Route element={<RegisterPage />} path="/register" />
          <Route element={<LoginPage />} path="/login" />

          <Route element={<ProtectedRoute />}>
            <Route element={<CheckoutPage />} path="/checkout" />
            <Route element={<WalletPage />} path="/wallet" />
            <Route element={<OrdersPage />} path="/orders" />
            <Route element={<OrderDetailPage />} path="/orders/:orderId" />
            <Route element={<OrderResultPage />} path="/success" />
            <Route element={<ProfilePage />} path="/profile" />
          </Route>

          <Route element={<ProtectedRoute roles={['JASTIPER', 'ADMIN']} />}>
            <Route element={<JastiperOrdersPage />} path="/jastiper/orders" />
          </Route>

          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route element={<AdminPage />} path="/admin" />
          </Route>

          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;
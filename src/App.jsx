import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import ProtectedRoute from './components/ProtectedRoute';
import { SessionProvider } from './context/SessionContext';
import CatalogPage from './pages/CatalogPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import OrderResultPage from './pages/OrderResultPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailPage from './pages/ProductDetailPage';
import RegisterPage from './pages/RegisterPage';
import WalletPage from './pages/WalletPage';

function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />} path="/">
            <Route element={<HomePage />} index />
            <Route element={<RegisterPage />} path="register" />
            <Route element={<LoginPage />} path="login" />

            <Route element={<ProtectedRoute />}>
              <Route element={<CatalogPage />} path="products" />
              <Route element={<ProductDetailPage />} path="products/:productId" />
              <Route element={<CheckoutPage />} path="checkout" />
              <Route element={<WalletPage />} path="wallet" />
              <Route element={<OrdersPage />} path="orders" />
              <Route element={<OrderResultPage />} path="orders/:orderId" />
            </Route>

            <Route element={<NotFoundPage />} path="*" />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}

export default App;

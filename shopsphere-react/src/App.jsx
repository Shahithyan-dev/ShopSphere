import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CelebrationProvider, useCelebration } from './context/CelebrationContext';
import ProtectedRoute from './components/ProtectedRoute';
import CelebrationOverlay from './components/CelebrationOverlay';

import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ShopPage from './pages/ShopPage';
import AdminPage from './pages/AdminPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import AddressPage from './pages/AddressPage';

function AppContent() {
  const { triggerCelebration } = useCelebration();

  return (
    <>
      {triggerCelebration && <CelebrationOverlay />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <ShopPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/:id"
          element={
            <ProtectedRoute>
              <ProductDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout-address"
          element={
            <ProtectedRoute>
              <AddressPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <CelebrationProvider>
          <CartProvider>
            <AppContent />
          </CartProvider>
        </CelebrationProvider>
      </AuthProvider>
    </HashRouter>
  );
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OtpGate from './OtpGate';

// Wrap a page with this to require login (and optionally admin status)
// before rendering it. Mirrors the redirect logic the old vanilla-JS pages
// did manually with window.location.href checks.
//
// OtpGate is layered in here too: once logged in (by any method — password,
// Google, or Facebook), if the account hasn't verified a phone number yet,
// OtpGate renders the verification screen instead of the actual page. This
// makes first-time OTP verification apply uniformly no matter how someone
// signed in, without duplicating that check on every page.
export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/shop" replace />;
  }

  return <OtpGate>{children}</OtpGate>;
}

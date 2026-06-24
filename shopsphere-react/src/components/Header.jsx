import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Header.css';
import { MdLogout } from "react-icons/md";

export default function Header({ search, onSearchChange, onCartClick }) {
  const { user, logout } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <>
      <div className="top-bar">
        <span>✨ Free delivery on orders over ₹499 · Festive Sale now live</span>
      </div>

      <header className="main-header">
        <div className="header-inner">

          <Link to="/shop" className="logo">
            <span className="logo-icon">🌐</span>
            <span className="logo-text">ShopSphere</span>
          </Link>

          {onSearchChange && (
            <div className="search-bar">
              <input
                type="text"
                placeholder="Search for products, brands and more"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              <button>🔍</button>
            </div>
          )}

          <div className="header-actions">

            {/* User Info */}
            <div className="account-info">
              <span className="account-icon">👤</span>
              <span>{user?.username}</span>

              {user?.isAdmin && (
                <Link
                  to="/admin"
                  className="admin-link"
                >
                  (Admin)
                </Link>
              )}
            </div>

            {/* My Orders Link */}
            {user && !user.isAdmin && (
              <Link to="/orders" className="my-orders-link">
                <span>📦</span>
                <span className="mobile-hide"> My Orders</span>
              </Link>
            )}

            {/* Cart */}
            {onCartClick && (
              <button className="cart-btn" onClick={onCartClick}>
                <span>🛒</span>
                <span className="mobile-hide">Cart</span>
                <span className="cart-count">{totalCount}</span>
              </button>
            )}

            <button className="logout-btn" onClick={handleLogout}>
              <MdLogout size={18} />
              <span className="mobile-hide">Logout</span>
            </button>

          </div>
        </div>
      </header>
    </>
  );
}
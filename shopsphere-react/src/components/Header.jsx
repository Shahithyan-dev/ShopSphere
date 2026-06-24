import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getProducts } from '../api/client';
import './Header.css';
import { MdLogout } from "react-icons/md";

export default function Header({ search, onSearchChange, onCartClick }) {
  const { user, logout } = useAuth();
  const { totalCount } = useCart();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // Click outside to close recommendations
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions when search query changes
  useEffect(() => {
    if (!search || search.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await getProducts({ search: search.trim() });
        if (res.success) {
          // Limit to 5 suggestions
          setSuggestions(res.products.slice(0, 5));
          setShowSuggestions(true);
        }
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [search]);

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
            <div className="search-container" ref={containerRef}>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search for products, brands and more"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                />
                <button>🔍</button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="search-suggestions">
                  {suggestions.map((product) => (
                    <div
                      key={product.id}
                      className="suggestion-item"
                      onClick={() => {
                        onSearchChange('');
                        setShowSuggestions(false);
                        navigate(`/product/${product.id}`);
                      }}
                    >
                      <span className="suggestion-emoji">{product.image_emoji || '🛒'}</span>
                      <div className="suggestion-info">
                        <span className="suggestion-name">{product.name}</span>
                        <span className="suggestion-category">{product.category}</span>
                      </div>
                      <span className="suggestion-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              )}
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
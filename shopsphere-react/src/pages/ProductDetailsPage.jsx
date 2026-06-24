import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/Header';
import { ProductVisual } from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import { getProductById } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './ProductDetailsPage.css';

export default function ProductDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const data = await getProductById(id);
        if (data.success) {
          setProduct(data.product);
        } else {
          setError(data.message || 'Failed to load product');
        }
      } catch (err) {
        console.error(err);
        setError('Server error loading product');
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      return;
    }
    if (user?.isAdmin) {
      alert("Admin accounts cannot add items to the cart.");
      return;
    }
    const res = await addItem(product.id, 1);
    if (res && res.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  if (loading) {
    return (
      <div className="product-page-container">
        <Header onCartClick={() => setCartOpen(true)} />
        <div className="loader-container"><div className="spinner"></div></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-page-container">
        <Header onCartClick={() => setCartOpen(true)} />
        <div className="error-banner">{error || 'Product not found'}</div>
        <Link to="/shop" className="back-link" style={{margin: '0 auto', display: 'block', width: 'fit-content', marginTop: 20}}>← Back to Shop</Link>
      </div>
    );
  }

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <div className="product-page-container">
      <Header onCartClick={() => setCartOpen(true)} />
      
      <main className="product-details-main">
        <div className="breadcrumbs">
          <Link to="/shop">Shop</Link>
          <span className="crumb-sep">/</span>
          <span>{product.category}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">{product.name}</span>
        </div>

        <div className="product-details-content">
          <div className="product-details-image">
            <ProductVisual product={product} />
          </div>
          
          <div className="product-details-info">
            <div className="pd-category">{product.category}</div>
            <h1 className="pd-name">{product.name}</h1>
            <div className="pd-rating">⭐ {product.rating} <span className="pd-reviews">(128 reviews)</span></div>
            
            <div className="pd-price-row">
              <span className="pd-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
              {product.original_price && (
                <span className="pd-original-price">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
              )}
              {discount > 0 && <span className="pd-discount">{discount}% off</span>}
            </div>
            
            <p className="pd-description">{product.description}</p>
            
            <div className="pd-stock-status">
              {product.stock > 0 ? (
                <span className="in-stock">● In stock ({product.stock} units)</span>
              ) : (
                <span className="out-of-stock">● Out of stock</span>
              )}
            </div>
            
            <button
              className={`pd-add-btn ${added ? 'added' : ''}`}
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
            >
              {added ? 'Added ✓' : 'Add to Cart'}
            </button>

            {/* Extra details the user requested */}
            <div className="pd-extra-details">
              <div className="pd-detail-item">
                <h3>🚚 Fast Delivery</h3>
                <p>Get it delivered within 2-3 business days across major cities.</p>
              </div>
              <div className="pd-detail-item">
                <h3>🔄 14-Day Returns</h3>
                <p>Not satisfied? Return it within 14 days for a full refund, no questions asked.</p>
              </div>
              <div className="pd-detail-item">
                <h3>🛡️ Warranty Info</h3>
                <p>Includes a standard 1-year manufacturer warranty for peace of mind.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

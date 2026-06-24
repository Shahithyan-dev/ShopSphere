import { useState } from 'react';
import { ProductVisual } from './ProductCard';
import './ProductModal.css';

export default function ProductModal({ product, onClose, onAddToCart }) {
  const [added, setAdded] = useState(false);

  if (!product) return null;

  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const handleAdd = async () => {
    const res = await onAddToCart(product.id);
    if (res && res.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 1200);
    }
  };

  return (
    <>
      <div className="modal-overlay open" onClick={onClose} />
      <div className="product-modal open">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="modal-body">
          <div className="modal-image"><ProductVisual product={product} /></div>
          <div className="modal-info">
            <div className="product-category">{product.category}</div>
            <h2 className="modal-product-name">{product.name}</h2>
            <div className="product-rating">⭐ {product.rating}</div>
            <p className="modal-description">{product.description}</p>
            <div className="product-price-row">
              <span className="product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
              {product.original_price && (
                <span className="product-original-price">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
              )}
              {discount > 0 && <span className="product-discount">{discount}% off</span>}
            </div>
            <div className="modal-stock">
              {product.stock > 0 ? `In stock: ${product.stock} units` : 'Out of stock'}
            </div>
            <button
              className={`add-to-cart-btn modal-add-btn ${added ? 'added' : ''}`}
              onClick={handleAdd}
            >
              {added ? 'Added ✓' : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

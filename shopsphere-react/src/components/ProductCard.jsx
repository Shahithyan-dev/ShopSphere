import { useState } from 'react';
import './ProductCard.css';

function ProductVisual({ product }) {
  const [imgFailed, setImgFailed] = useState(false);
  if (product.image_url && !imgFailed) {
    return (
      <img
        src={product.image_url}
        alt={product.name}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <span>{product.image_emoji || '🛒'}</span>;
}

export default function ProductCard({ product, onAddToCart, onViewProduct }) {
  const [added, setAdded] = useState(false);

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
    <div className="product-card">
      <div className="product-image"><ProductVisual product={product} /></div>
      <div className="product-category">{product.category}</div>
      <div className="product-name">{product.name}</div>
      <div className="product-rating">⭐ {product.rating}</div>
      <div className="product-price-row">
        <span className="product-price">₹{Number(product.price).toLocaleString('en-IN')}</span>
        {product.original_price && (
          <span className="product-original-price">₹{Number(product.original_price).toLocaleString('en-IN')}</span>
        )}
        {discount > 0 && <span className="product-discount">{discount}% off</span>}
      </div>
      <button className={`add-to-cart-btn ${added ? 'added' : ''}`} onClick={handleAdd}>
        {added ? 'Added ✓' : 'Add to Cart'}
      </button>
      <button className="view-product-btn" onClick={() => onViewProduct(product)}>
        View Product
      </button>
    </div>
  );
}

export { ProductVisual };

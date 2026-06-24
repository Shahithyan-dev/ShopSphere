import { ProductVisual } from './ProductCard';
import './TopRatedSection.css';

export default function TopRatedSection({ title, products, onViewProduct }) {
  if (!products || products.length === 0) return null;

  return (
    <section className="top-rated-section">
      <div className="top-rated-heading">
        <h2>{title}</h2>
        <span className="top-rated-badge">⭐ TOP RATED</span>
      </div>
      <div className="top-rated-scroll">
        {products.map((product) => (
          <div className="top-rated-card" key={product.id} onClick={() => onViewProduct(product)}>
            <div className="top-rated-image"><ProductVisual product={product} /></div>
            <div className="top-rated-name">{product.name}</div>
            <div className="top-rated-rating">⭐ {product.rating}</div>
            <div className="top-rated-price">₹{Number(product.price).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

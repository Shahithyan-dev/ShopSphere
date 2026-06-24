import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import TopRatedSection from '../components/TopRatedSection';
import { getProducts, getCategories, getTopRated } from '../api/client';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './ShopPage.css';

const HERO_SLIDES = [
  {
    className: 'slide-1',
    title: 'Everything you need, all in one cart',
    text: 'Electronics, appliances, fashion & more — shop it all in one place.'
  },
  {
    className: 'slide-2',
    title: 'Tech that keeps up with you',
    text: 'Top deals on smartphones, laptops, and audio gear this week.'
  },
  {
    className: 'slide-3',
    title: 'Refresh your wardrobe',
    text: 'New season fashion arrivals, styled for every occasion.'
  }
];

export default function ShopPage() {
  const { user } = useAuth();
  const { addItem, refreshCart } = useCart();

  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [topRatedOverall, setTopRatedOverall] = useState([]);
  const [topRatedByCategory, setTopRatedByCategory] = useState({});
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  // --- Initial data load ---
  useEffect(() => {
    refreshCart();
    getCategories().then((data) => { if (data.success) setCategories(data.categories); });
    getTopRated({ limit: 10 }).then((data) => { if (data.success) setTopRatedOverall(data.products); });
    getTopRated({ grouped: 1, limit: 8 }).then((data) => { if (data.success) setTopRatedByCategory(data.grouped); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Product list load (re-runs when category/search changes) ---
  const loadProducts = useCallback(async () => {
    const params = {};
    if (currentCategory !== 'All') params.category = currentCategory;
    if (search) params.search = search;
    const data = await getProducts(params);
    if (data.success) setProducts(data.products);
  }, [currentCategory, search]);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, search ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [loadProducts, search]);

  // --- Hero carousel auto-rotate ---
  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleAddToCart = async (productId) => {
    if (!user) {
      alert("Please log in to add items to your cart.");
      return { success: false };
    }
    if (user?.isAdmin) {
      alert("Admin accounts cannot add items to the cart. Please log in as a customer.");
      return { success: false };
    }
    const res = await addItem(productId, 1);
    return res;
  };

  return (
    <div>
      <Header search={search} onSearchChange={setSearch} onCartClick={() => setCartOpen(true)} />

      <nav className="category-strip">
        <button
          className={`category-pill ${currentCategory === 'All' ? 'active' : ''}`}
          onClick={() => setCurrentCategory('All')}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            className={`category-pill ${currentCategory === cat ? 'active' : ''}`}
            onClick={() => setCurrentCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div className="breadcrumbs">
        <span>Home</span>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{currentCategory === 'All' ? 'All Products' : currentCategory}</span>
      </div>

      <section className="hero-banner">
        <div className="hero-carousel">
          {HERO_SLIDES.map((slide, i) => (
            <div key={i} className={`hero-slide ${slide.className} ${i === slideIndex ? 'active' : ''}`}>
              <div>
                <h1>{slide.title}</h1>
                <p>{slide.text}</p>
              </div>
            </div>
          ))}
          <div className="hero-dots">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === slideIndex ? 'active' : ''}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Top rated overall — shown regardless of category filter */}
      <TopRatedSection
        title="Top Rated Across ShopSphere"
        products={topRatedOverall}
        onViewProduct={(product) => navigate(`/product/${product.id}`)}
      />

      {/* Top rated per category — one row per category, shown on the "All" view */}
      {currentCategory === 'All' && !search &&
        Object.entries(topRatedByCategory).map(([cat, items]) => (
          <TopRatedSection
            key={cat}
            title={`Top Rated in ${cat}`}
            products={items}
            onViewProduct={(product) => navigate(`/product/${product.id}`)}
          />
        ))
      }

      <main className="product-section">
        <div className="section-heading">
          <h2>{currentCategory === 'All' ? 'All Products' : currentCategory}</h2>
          <span className="result-count">{products.length} item{products.length !== 1 ? 's' : ''}</span>
        </div>

        {products.length === 0 ? (
          <p className="empty-state">No products found. Try a different search or category.</p>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
                onViewProduct={(product) => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="site-footer">
        <p>&copy; 2026 ShopSphere. Built for learning purposes — not a real store.</p>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

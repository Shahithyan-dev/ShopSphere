import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProductVisual } from '../components/ProductCard';
import {
  getProducts, getCategories,
  adminCreateProduct, adminUpdateProduct, adminDeleteProduct,
  adminGetOrders, adminUpdateOrderStatus, adminSendDeliveryOtp, adminVerifyDeliveryOtp
} from '../api/client';
import OtpModal from '../components/OtpModal';
import './AdminPage.css';

const emptyForm = {
  name: '', category: '', price: '', original_price: '',
  rating: '4.0', stock: '100', image_emoji: '', image_url: '', description: ''
};

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'orders'
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });

  // OTP delivery verification state
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const loadProducts = useCallback(async () => {
    const params = {};
    if (categoryFilter !== 'All') params.category = categoryFilter;
    if (search) params.search = search;
    const data = await getProducts(params);
    if (data.success) setProducts(data.products);
  }, [categoryFilter, search]);

  const loadCategories = useCallback(async () => {
    const data = await getCategories();
    if (data.success) setCategories(data.categories);
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const data = await adminGetOrders();
    if (data.success) setOrders(data.orders);
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadProducts, search ? 350 : 0);
    return () => clearTimeout(timeout);
  }, [loadProducts, search]);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    const data = await adminUpdateOrderStatus(orderId, newStatus);
    if (data.success) {
      loadOrders();
    } else {
      alert(data.message || 'Failed to update order status.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormStatus({ message: '', type: '' });
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: product.price,
      original_price: product.original_price || '',
      rating: product.rating || '4.0',
      stock: product.stock,
      image_emoji: product.image_emoji || '',
      image_url: product.image_url || '',
      description: product.description || ''
    });
    setFormStatus({ message: '', type: '' });
    setFormOpen(true);
  };

  const updateField = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : null,
      rating: form.rating ? parseFloat(form.rating) : 4.0,
      stock: form.stock ? parseInt(form.stock, 10) : 100,
      image_emoji: form.image_emoji.trim() || '🛒',
      image_url: form.image_url.trim() || null,
      description: form.description.trim()
    };

    const data = editingId
      ? await adminUpdateProduct(editingId, payload)
      : await adminCreateProduct(payload);

    if (data.success) {
      setFormStatus({ message: editingId ? 'Product updated!' : 'Product added!', type: 'success' });
      loadProducts();
      loadCategories();
      setTimeout(() => setFormOpen(false), 700);
    } else {
      setFormStatus({ message: data.message || 'Something went wrong.', type: 'error' });
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    const data = await adminDeleteProduct(product.id);
    if (data.success) loadProducts();
    else alert(data.message || 'Could not delete product.');
  };

  return (
    <div>
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-logo">🌐 ShopSphere <span>Admin</span></div>
          <div className="admin-header-actions">
            <Link to="/shop" className="back-to-shop-link">← Back to Shop</Link>
            <span>Logged in as {user?.username} (Admin)</span>
            <button className="admin-logout-btn" onClick={handleLogout}>Log Out</button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        {/* Tab Selection */}
        <div className="admin-tabs">
          <button
            className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            📦 Products List
          </button>
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 Accept & Manage Orders
          </button>
        </div>

        {activeTab === 'products' ? (
          <>
            <div className="admin-toolbar">
              <h1>Manage Products</h1>
              <button className="primary-btn" onClick={openAddForm}>+ Add Product</button>
            </div>

            <div className="admin-filter-row">
              <input
                type="text"
                placeholder="Search products by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="table-wrapper">
              <table className="products-table">
                <thead>
                  <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Rating</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td><div className="table-thumb"><ProductVisual product={product} /></div></td>
                      <td className="table-product-name">{product.name}</td>
                      <td><span className="category-badge">{product.category}</span></td>
                      <td>₹{Number(product.price).toLocaleString('en-IN')}</td>
                      <td>{product.stock}</td>
                      <td>⭐ {product.rating}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-btn" onClick={() => openEditForm(product)}>Edit</button>
                          <button className="delete-btn" onClick={() => handleDelete(product)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {products.length === 0 && <p className="empty-state">No products found.</p>}
          </>
        ) : (
          <div className="admin-orders-section">
            <div className="admin-toolbar">
              <h1>Accept & Manage Orders</h1>
              <button
                type="button"
                className="refresh-orders-btn"
                onClick={loadOrders}
                disabled={ordersLoading}
              >
                {ordersLoading ? 'Refreshing...' : '🔄 Refresh List'}
              </button>
            </div>

            {ordersLoading ? (
              <div className="loader-container">
                <div className="spinner"></div>
                <p>Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <p className="empty-state">No orders placed yet.</p>
            ) : (
              <div className="admin-orders-list">
                {orders.map((order) => (
                  <div className="admin-order-card" key={order.id}>
                    <div className="admin-order-card-header">
                      <div className="admin-order-meta">
                        <span className="admin-order-id-label">ORDER ID</span>
                        <span className="admin-order-id-val">{order.razorpay_order_id}</span>
                        <span className="admin-order-customer">
                          Buyer: <strong>{order.user_id?.username || 'Unknown'}</strong> ({order.user_id?.email || 'N/A'})
                        </span>
                        <span className="admin-order-date">
                          Placed on: {new Date(order.created_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="admin-order-actions-right">
                        <span className={`status-badge ${order.status}`}>
                          {order.status === 'paid' ? 'Paid (Pending)' : order.status}
                        </span>
                      </div>
                    </div>

                    <div className="admin-order-body">
                      {/* Products Summary */}
                      <div className="admin-order-products">
                        <h4>Items Summary</h4>
                        {order.items && order.items.map((item) => (
                          <div className="admin-order-product-row" key={item.id}>
                            <span className="admin-item-visual">
                              <ProductVisual product={{ image_emoji: '🛒', ...item }} />
                            </span>
                            <span className="admin-item-name">{item.product_name}</span>
                            <span className="admin-item-qty">Qty: {item.quantity}</span>
                            <span className="admin-item-cost">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Delivery Details */}
                      <div className="admin-order-delivery">
                        <h4>Delivery Details</h4>
                        {order.delivery_address ? (
                          <p className="admin-address-text">
                            <strong>Address:</strong> {order.delivery_address}
                          </p>
                        ) : (
                          <p className="admin-address-text text-muted">No address provided</p>
                        )}

                        {order.delivery_location && order.delivery_location.latitude ? (
                          <p className="admin-coords-text">
                            <strong>GPS Coordinates:</strong> {order.delivery_location.latitude}, {order.delivery_location.longitude}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_location.latitude},${order.delivery_location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-maps-link"
                            >
                              📍 View on Google Maps
                            </a>
                          </p>
                        ) : (
                          <p className="admin-coords-text text-muted">No GPS coordinates captured</p>
                        )}
                      </div>
                    </div>

                    <div className="admin-order-footer">
                      <div className="admin-order-total">
                        Total Amount: <strong>₹{Number(order.amount).toLocaleString('en-IN')}</strong>
                      </div>

                      {/* Order Accept/Ship/Deliver State Controls */}
                      <div className="admin-status-controls">
                        {order.status === 'paid' && (
                          <div className="btn-group">
                            <button
                              className="accept-order-btn"
                              onClick={() => handleUpdateStatus(order.id, 'accepted')}
                            >
                              ✓ Accept Order
                            </button>
                            <button
                              className="reject-order-btn"
                              onClick={() => handleUpdateStatus(order.id, 'rejected')}
                            >
                              ✕ Reject Order
                            </button>
                          </div>
                        )}

                        {order.status === 'accepted' && (
                          <button
                            className="ship-order-btn"
                            onClick={() => handleUpdateStatus(order.id, 'shipped')}
                          >
                            🚚 Mark as Shipped
                          </button>
                        )}

                        {order.status === 'shipped' && (
                          <button
                            className="deliver-order-btn"
                            onClick={async () => {
                              // Send OTP to customer first
                              const sendRes = await adminSendDeliveryOtp(order.id);
                              if (sendRes.success) {
                                setSelectedOrderId(order.id);
                                setOtpModalOpen(true);
                              } else {
                                alert(sendRes.message || 'Failed to send OTP.');
                              }
                            }}
                          >
                            📩 Send OTP & Deliver
                          </button>
                        )}

                        {order.status === 'delivered' && (
                          <span className="order-completed-text">✓ Order Delivered Successfully</span>
                        )}

                        {order.status === 'rejected' && (
                          <span className="order-rejected-text">✕ Order Rejected</span>
                        )}

                        {order.status === 'failed' && (
                          <span className="order-failed-text">✕ Payment Failed</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {formOpen && (
        <>
          <div className="modal-overlay open" onClick={() => setFormOpen(false)} />
          <div className="form-modal open">
            <button className="modal-close" onClick={() => setFormOpen(false)} aria-label="Close">✕</button>
            <h2>{editingId ? 'Edit Product' : 'Add Product'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Product Name *</label>
                  <input type="text" required value={form.name} onChange={updateField('name')} />
                </div>
                <div className="input-group">
                  <label>Category *</label>
                  <input type="text" required placeholder="e.g. Electronics" value={form.category} onChange={updateField('category')} />
                </div>
                <div className="input-group">
                  <label>Price (₹) *</label>
                  <input type="number" step="0.01" min="0" required value={form.price} onChange={updateField('price')} />
                </div>
                <div className="input-group">
                  <label>Original Price (₹)</label>
                  <input type="number" step="0.01" min="0" value={form.original_price} onChange={updateField('original_price')} />
                </div>
                <div className="input-group">
                  <label>Rating (0–5)</label>
                  <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={updateField('rating')} />
                </div>
                <div className="input-group">
                  <label>Stock Quantity</label>
                  <input type="number" min="0" value={form.stock} onChange={updateField('stock')} />
                </div>
                <div className="input-group">
                  <label>Emoji Icon (fallback)</label>
                  <input type="text" placeholder="🛒" maxLength={4} value={form.image_emoji} onChange={updateField('image_emoji')} />
                </div>
                <div className="input-group full-width">
                  <label>Image URL</label>
                  <input type="text" placeholder="https://..." value={form.image_url} onChange={updateField('image_url')} />
                </div>
                <div className="input-group full-width">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={updateField('description')} />
                </div>
              </div>

              {formStatus.message && <p className={`status-message ${formStatus.type}`}>{formStatus.message}</p>}

              <div className="form-actions">
                <button type="button" className="secondary-btn" onClick={() => setFormOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn">Save Product</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

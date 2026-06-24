import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { getOrders, cancelOrder } from '../api/client';
import { ProductVisual } from '../components/ProductCard';
import CartDrawer from '../components/CartDrawer';
import './OrdersPage.css';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  // Hook up timer tick to force refresh calculation on cancelable orders
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  async function loadOrders() {
    try {
      const data = await getOrders();
      if (data.success) {
        setOrders(data.orders);
      } else {
        setError(data.message || 'Failed to retrieve orders.');
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Server error fetching orders.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? All items will be cancelled and stock will be returned.")) {
      return;
    }
    setCancellingId(orderId);
    try {
      const res = await cancelOrder(orderId);
      if (res.success) {
        alert("Order cancelled successfully!");
        await loadOrders();
      } else {
        alert(res.message || "Failed to cancel order.");
      }
    } catch (err) {
      console.error("Cancel order error:", err);
      alert("Error cancelling order.");
    } finally {
      setCancellingId(null);
    }
  };

  const isCancelable = (order) => {
    if (['cancelled', 'shipped', 'delivered', 'failed', 'rejected'].includes(order.status)) {
      return false;
    }
    const createdTime = new Date(order.created_at).getTime();
    const timeDiffMs = Date.now() - createdTime;
    const hoursElapsed = timeDiffMs / (1000 * 60 * 60);
    return hoursElapsed < 30;
  };

  const getRemainingTimeStr = (order) => {
    const createdTime = new Date(order.created_at).getTime();
    const expiryTime = createdTime + (30 * 60 * 60 * 1000);
    const remainingMs = expiryTime - Date.now();
    if (remainingMs <= 0) return '';
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Cancel window: ${hours}h ${minutes}m left`;
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'created': return 0;
      case 'paid': return 1;
      case 'accepted': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -2;
      case 'rejected': return -1;
      default: return 1;
    }
  };

  const getStatusLabel = (status) => {
    if (status === 'paid') return 'Paid & Pending';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="orders-page-container">
      <Header onCartClick={() => setCartOpen(true)} />

      <main className="orders-main">
        <div className="orders-header">
          <Link to="/shop" className="back-link">← Back to Shop</Link>
          <h1>My Orders</h1>
          <p>Track shipment status and view details of your purchases.</p>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : orders.length === 0 ? (
          <div className="orders-empty-state">
            <span className="empty-icon">📦</span>
            <h2>No orders found</h2>
            <p>You haven't placed any orders yet. Start shopping to fill your shelf!</p>
            <Link to="/shop" className="primary-btn">Go to Shop</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const currentStep = getStatusStep(order.status);
              return (
                <div className="order-card" key={order.id}>
                  <div className="order-card-header">
                    <div className="order-meta">
                      <span className="order-id-label">ORDER ID</span>
                      <span className="order-id-val">{order.razorpay_order_id}</span>
                      <span className="order-date">
                        Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className={`status-badge ${order.status}`}>
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="order-items-list">
                    {order.items && order.items.map((item) => (
                      <div className="order-item-row" key={item.id}>
                        <div className="order-item-emoji">
                          <ProductVisual product={{ image_emoji: '🛒', ...item }} />
                        </div>
                        <div className="order-item-details">
                          <div className="item-name">{item.product_name}</div>
                          <div className="item-price">
                            ₹{Number(item.price).toLocaleString('en-IN')} x {item.quantity}
                          </div>
                        </div>
                        <div className="item-total-cost">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary & Shipping Details */}
                  <div className="order-card-footer">
                    <div className="shipping-details">
                      {order.delivery_address && (
                        <div className="detail-item">
                          <strong>📍 Delivery Address:</strong>
                          <span className="address-text">{order.delivery_address}</span>
                        </div>
                      )}
                      {order.delivery_location && order.delivery_location.latitude && (
                        <div className="detail-item">
                          <strong>📍 GPS Coordinates:</strong>
                          <span>
                            {order.delivery_location.latitude}, {order.delivery_location.longitude}
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${order.delivery_location.latitude},${order.delivery_location.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="maps-link"
                            >
                              (View on Map)
                            </a>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="order-summary-box">
                      <div className="summary-row">
                        <span>Items Total</span>
                        <span>₹{Number(order.amount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="summary-row grand-total">
                        <span>Grand Total</span>
                        <span>₹{Number(order.amount).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Progress Tracker */}
                  {order.status !== 'rejected' && order.status !== 'failed' && order.status !== 'cancelled' && (
                    <div className="tracker-timeline">
                      <div className={`timeline-step ${currentStep >= 1 ? 'completed' : ''} ${currentStep === 1 ? 'active' : ''}`}>
                        <div className="step-circle">✓</div>
                        <div className="step-label">Paid</div>
                      </div>
                      <div className={`timeline-step ${currentStep >= 2 ? 'completed' : ''} ${currentStep === 2 ? 'active' : ''}`}>
                        <div className="step-circle">✓</div>
                        <div className="step-label">Accepted</div>
                      </div>
                      <div className={`timeline-step ${currentStep >= 3 ? 'completed' : ''} ${currentStep === 3 ? 'active' : ''}`}>
                        <div className="step-circle">✓</div>
                        <div className="step-label">Shipped</div>
                      </div>
                      <div className={`timeline-step ${currentStep >= 4 ? 'completed' : ''} ${currentStep === 4 ? 'active' : ''}`}>
                        <div className="step-circle">✓</div>
                        <div className="step-label">Delivered</div>
                      </div>
                    </div>
                  )}

                  {isCancelable(order) && (
                    <div className="order-cancel-section">
                      <span className="cancel-timer-text">⏰ {getRemainingTimeStr(order)}</span>
                      <button
                        className="cancel-order-btn"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    </div>
                  )}

                  {order.status === 'cancelled' && (
                    <div className="cancelled-alert">
                      🚫 This order was cancelled by you. If payment was made, it will be refunded automatically.
                    </div>
                  )}

                  {order.status === 'rejected' && (
                    <div className="rejected-alert">
                      ⚠️ This order was rejected by the seller. If paid, your refund will be processed shortly.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}

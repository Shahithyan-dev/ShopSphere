import { useState, useEffect } from 'react';
import { ProductVisual } from './ProductCard';
import { useCart } from '../context/CartContext';
import { useCheckout } from '../hooks/useCheckout';
import './CartDrawer.css';

export default function CartDrawer({ open, onClose }) {
  const { items, totalPrice, removeItem } = useCart();
  const { status, startCheckout, resetStatus } = useCheckout();

  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart' | 'delivery'
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Reset steps and statuses when closed or on successful checkouts
  useEffect(() => {
    if (!open) {
      setCheckoutStep('cart');
      resetStatus();
    }
  }, [open, resetStatus]);

  useEffect(() => {
    if (status.stage === 'success') {
      setCheckoutStep('cart');
      setDeliveryAddress('');
      setLatitude('');
      setLongitude('');
    }
  }, [status.stage]);

  const handleGetLocation = () => {
    setGpsLoading(true);
    setGpsError('');
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      (error) => {
        console.error('Error getting geolocation:', error);
        setGpsError('Failed to grab GPS location automatically.');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleCheckout = () => {
    if (checkoutStep === 'cart') {
      setCheckoutStep('delivery');
      return;
    }
    if (!deliveryAddress.trim()) {
      alert('Please enter a delivery address.');
      return;
    }

    const payload = {
      delivery_address: deliveryAddress.trim(),
      delivery_location: (latitude && longitude) ? {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      } : null
    };

    resetStatus();
    startCheckout(payload);
  };

  return (
    <>
      <div className={`cart-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`cart-drawer ${open ? 'open' : ''}`}>
        <div className="cart-drawer-header">
          <h3>{checkoutStep === 'cart' ? 'Your Cart' : 'Delivery Location'}</h3>
          <button onClick={onClose} aria-label="Close cart">✕</button>
        </div>

        {checkoutStep === 'cart' ? (
          <div className="cart-items">
            {items.length === 0 ? (
              <p className="cart-empty-msg">Your cart is empty. Start adding some great finds!</p>
            ) : (
              items.map((item) => (
                <div className="cart-item" key={item.cart_id}>
                  <div className="cart-item-emoji"><ProductVisual product={item} /></div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-qty">Qty: {item.quantity}</div>
                  </div>
                  <div className="cart-item-price">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </div>
                  <button className="remove-item-btn" onClick={() => removeItem(item.cart_id)}>
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="delivery-form">
            <div className="form-group">
              <label>Delivery Address *</label>
              <textarea
                placeholder="Enter complete shipping address..."
                rows="4"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <div className="gps-header">
                <label>GPS Coordinates (Optional)</label>
                <button
                  type="button"
                  className="gps-btn"
                  onClick={handleGetLocation}
                  disabled={gpsLoading}
                >
                  {gpsLoading ? 'Getting location...' : '📍 Auto-Detect'}
                </button>
              </div>

              <div className="coordinates-inputs">
                <input
                  type="number"
                  placeholder="Latitude"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <input
                  type="number"
                  placeholder="Longitude"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
              </div>
              {gpsError && <p className="gps-error">{gpsError}</p>}
              {!gpsError && latitude && longitude && (
                <p className="gps-success">✓ Coordinates captured: {latitude}, {longitude}</p>
              )}
            </div>
          </div>
        )}

        <div className="cart-footer">
          <div className="cart-total-row">
            <span>Total</span>
            <span>₹{totalPrice.toLocaleString('en-IN')}</span>
          </div>

          {status.message && (
            <p className={`checkout-status ${status.stage}`}>{status.message}</p>
          )}

          <div className="checkout-action-row">
            {checkoutStep === 'delivery' && (
              <button
                className="secondary-checkout-btn"
                onClick={() => setCheckoutStep('cart')}
                disabled={status.stage === 'processing'}
              >
                Back to Cart
              </button>
            )}
            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={items.length === 0 || status.stage === 'processing'}
            >
              {status.stage === 'processing'
                ? 'Processing...'
                : checkoutStep === 'cart'
                ? 'Proceed to Checkout'
                : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

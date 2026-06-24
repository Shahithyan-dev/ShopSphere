import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useCheckout } from '../hooks/useCheckout';
import './AddressPage.css';

export default function AddressPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId, quantity, productName, price } = location.state || {};
  const { status, startDirectCheckout } = useCheckout();

  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');

  if (!productId) {
    return (
      <div className="address-page-container">
        <Header />
        <div className="address-card" style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>No product selected</h2>
          <button className="primary-btn" onClick={() => navigate('/shop')} style={{ marginTop: '20px' }}>
            Go to Shop
          </button>
        </div>
      </div>
    );
  }

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

  const handlePay = async (e) => {
    e.preventDefault();
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

    try {
      const success = await startDirectCheckout(productId, quantity || 1, payload);
      if (success) {
        navigate('/orders');
      }
    } catch (err) {
      console.error(err);
      alert('Checkout process failed.');
    }
  };

  return (
    <div className="address-page-container">
      <Header />
      <main className="address-main">
        <div className="address-card">
          <h2>Shipping & Delivery Details</h2>
          
          <div className="order-summary-box">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Product:</span>
              <strong>{productName}</strong>
            </div>
            <div className="summary-row">
              <span>Qty:</span>
              <strong>{quantity || 1}</strong>
            </div>
            <div className="summary-row">
              <span>Total Price:</span>
              <strong className="summary-total">₹{Number(price * (quantity || 1)).toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <form onSubmit={handlePay} className="delivery-form">
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

            {status.message && (
              <p className={`checkout-status ${status.stage}`}>{status.message}</p>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="back-btn"
                onClick={() => navigate(`/product/${productId}`)}
                disabled={status.stage === 'processing'}
              >
                Back to Product
              </button>
              <button
                type="submit"
                className="pay-btn"
                disabled={status.stage === 'processing'}
              >
                {status.stage === 'processing' ? 'Processing...' : 'Confirm & Pay Now'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

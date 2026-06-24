// src/components/OtpModal.jsx
import { useState } from 'react';
import { adminVerifyDeliveryOtp } from '../api/client';
import './OtpModal.css';

export default function OtpModal({ orderId, onClose, onSuccess }) {
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState({ message: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setStatus({ message: 'Enter the OTP sent to the customer.', type: 'error' });
      return;
    }
    setSubmitting(true);
    const res = await adminVerifyDeliveryOtp(orderId, otp.trim());
    if (res.success) {
      setStatus({ message: 'Delivery confirmed!', type: 'success' });
      if (onSuccess) onSuccess();
      // close after short delay
      setTimeout(onClose, 1200);
    } else {
      setStatus({ message: res.message || 'OTP verification failed.', type: 'error' });
    }
    setSubmitting(false);
  };

  return (
    <div className="otp-modal-overlay" onClick={onClose}>
      <div className="otp-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Enter Delivery OTP</h2>
        <p>Ask the customer for the 6‑digit OTP sent to their phone.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="6‑digit code"
            disabled={submitting}
          />
          <button type="submit" disabled={submitting} className="primary-btn">
            {submitting ? 'Verifying…' : 'Verify OTP'}
          </button>
          <button type="button" onClick={onClose} className="secondary-btn" disabled={submitting}>
            Cancel
          </button>
        </form>
        {status.message && (
          <p className={`status-message ${status.type}`}>{status.message}</p>
        )}
      </div>
    </div>
  );
}

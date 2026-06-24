import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { requestOtp, verifyOtp } from '../api/client';
import './OtpGate.css';

const RESEND_COOLDOWN_SECONDS = 30;

// Wrap protected content with this. If the logged-in user hasn't verified
// their phone yet, this renders a full-screen OTP step instead of the
// children — once verification succeeds, it calls refreshSession() and lets
// the real page through. Applies the same way regardless of whether the
// person logged in with a password, Google, or Facebook.
export default function OtpGate({ children }) {
  const { user, refreshSession } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState('enter-phone'); // enter-phone | enter-code
  const [status, setStatus] = useState({ message: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownInterval = useRef(null);

  // Counts down the resend cooldown once a second, and cleans up on unmount.
  useEffect(() => {
    if (resendCooldown <= 0) {
      clearInterval(cooldownInterval.current);
      return;
    }
    cooldownInterval.current = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(cooldownInterval.current);
  }, [resendCooldown > 0]);

  if (!user || user.phoneVerified) {
    return children;
  }

  const sendCode = async (phoneNumber, { isResend } = {}) => {
    setSubmitting(true);
    setStatus({ message: '', type: '' });

    const data = await requestOtp(phoneNumber);
    if (data.success) {
      setStage('enter-code');
      setStatus({ message: isResend ? 'New code sent! Check your phone.' : 'Code sent! Check your phone.', type: 'success' });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setStatus({ message: data.message || 'Could not send code.', type: 'error' });
    }
    setSubmitting(false);
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      setStatus({ message: 'Please enter your phone number.', type: 'error' });
      return;
    }
    await sendCode(phone.trim());
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || submitting) return;
    setCode('');
    await sendCode(phone.trim(), { isResend: true });
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setStatus({ message: 'Please enter the code you received.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setStatus({ message: '', type: '' });

    const data = await verifyOtp(code.trim());
    if (data.success) {
      setStatus({ message: 'Verified! Loading...', type: 'success' });
      await refreshSession();
    } else {
      setStatus({ message: data.message || 'Invalid code.', type: 'error' });
    }
    setSubmitting(false);
  };

  return (
    <div className="otp-gate">
      <div className="otp-card">
        <div className="brand-heading">🌐 ShopSphere</div>
        <h1>Verify Your Phone</h1>
        <p className="otp-subtitle">
          For your security, we verify your phone number once on first login.
        </p>

        {stage === 'enter-phone' ? (
          <form onSubmit={handleSendCode}>
            <div className="input-group">
              <label htmlFor="otp-phone">Phone Number</label>
              <input
                id="otp-phone"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <span className="otp-hint">Include your country code, e.g. +91 for India.</span>
            </div>
            <button type="submit" className="otp-btn" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="input-group">
              <label htmlFor="otp-code">Verification Code</label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <span className="otp-hint">Sent to {phone}. Code expires in 10 minutes.</span>
            </div>
            <button type="submit" className="otp-btn" disabled={submitting}>
              {submitting ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              className="otp-secondary-btn"
              onClick={handleResend}
              disabled={resendCooldown > 0 || submitting}
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
            </button>

            <button
              type="button"
              className="otp-secondary-btn"
              onClick={() => { setStage('enter-phone'); setCode(''); setStatus({ message: '', type: '' }); setResendCooldown(0); }}
            >
              Use a different number
            </button>
          </form>
        )}

        {status.message && <p className={`otp-status ${status.type}`}>{status.message}</p>}
      </div>
    </div>
  );
}

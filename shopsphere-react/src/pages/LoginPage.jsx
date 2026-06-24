import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login } from '../api/client';
import { useAuth } from '../context/AuthContext';
import './AuthPages.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSession } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ message: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  // If Google/Facebook OAuth failed, the backend redirects back here
  // with ?error=... — surface that as a status message.
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError === 'google_failed') {
      setStatus({ message: 'Google sign-in was cancelled or failed. Please try again.', type: 'error' });
    } else if (oauthError === 'facebook_failed') {
      setStatus({ message: 'Facebook sign-in was cancelled or failed. Please try again.', type: 'error' });
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!identifier.trim()) newErrors.identifier = 'Username or email is required.';
    if (!password.trim()) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setStatus({ message: '', type: '' });

    try {
      const data = await login(identifier.trim(), password.trim());
      if (data.success) {
        setStatus({ message: 'Login successful! Redirecting...', type: 'success' });
        await refreshSession();
        // Admins land on the admin panel directly; everyone else goes to the shop.
        setTimeout(() => navigate(data.user.isAdmin ? '/admin' : '/shop'), 600);
      } else {
        setStatus({ message: data.message || 'Login failed.', type: 'error' });
      }
    } catch {
      setStatus({ message: 'Could not connect to the server. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="brand-heading">🌐 ShopSphere</div>
        <h1>Welcome Back</h1>
        <p className="subtitle">Please login to your account</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="identifier">Username or Email</label>
            <input
              id="identifier"
              type="text"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setErrors((p) => ({ ...p, identifier: '' })); }}
              className={errors.identifier ? 'invalid' : ''}
            />
            <span className="error-message">{errors.identifier}</span>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
                className={errors.password ? 'invalid' : ''}
              />
              <button type="button" className="toggle-btn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="error-message">{errors.password}</span>
          </div>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Login'}
          </button>

          {status.message && <p className={`status-message ${status.type}`}>{status.message}</p>}
        </form>

        <div className="divider"><span>or continue with</span></div>

        <div className="social-login-row">
          <a href="/api/auth/google" className="social-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.61z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.87-3.04.87-2.34 0-4.32-1.58-5.03-3.71H.97v2.33C2.45 16.06 5.48 18 9 18z"/>
              <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.97A8.96 8.96 0 0 0 0 9c0 1.45.35 2.82.97 4.05l3-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 1.94.97 4.95l3 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            <span>Continue with Google</span>
          </a>

          <a href="/api/auth/facebook" className="social-btn">
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.41 8.89v-6.29H5.31V9h2.28V6.84c0-2.25 1.34-3.49 3.39-3.49.98 0 2 .18 2 .18v2.2h-1.13c-1.11 0-1.46.69-1.46 1.4V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9z"/>
            </svg>
            <span>Continue with Facebook</span>
          </a>
        </div>

        <p className="signup-text">Don't have an account? <Link to="/signup">Sign up</Link></p>
      </div>
    </div>
  );
}

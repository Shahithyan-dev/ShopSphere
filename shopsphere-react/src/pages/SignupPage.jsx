import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../api/client';
import './AuthPages.css';

export default function SignupPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ message: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const update = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (form.username.trim().length < 3) newErrors.username = 'Username must be at least 3 characters.';
    if (!isValidEmail(form.email.trim())) newErrors.email = 'Please enter a valid email address.';
    if (form.password.trim().length < 6) newErrors.password = 'Password must be at least 6 characters.';
    if (form.confirmPassword.trim() !== form.password.trim()) newErrors.confirmPassword = 'Passwords do not match.';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);
    setStatus({ message: '', type: '' });

    try {
      const data = await signup(form.username.trim(), form.email.trim(), form.password.trim());
      if (data.success) {
        setStatus({ message: 'Account created! Redirecting to login...', type: 'success' });
        setTimeout(() => navigate('/login'), 1000);
      } else {
        setStatus({ message: data.message || 'Sign up failed.', type: 'error' });
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
        <h1>Create Account</h1>
        <p className="subtitle">Sign up to get started</p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Choose a username"
              value={form.username}
              onChange={update('username')}
              className={errors.username ? 'invalid' : ''}
            />
            <span className="error-message">{errors.username}</span>
          </div>

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              placeholder="Enter your email"
              value={form.email}
              onChange={update('email')}
              className={errors.email ? 'invalid' : ''}
            />
            <span className="error-message">{errors.email}</span>
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password (min 6 characters)"
                value={form.password}
                onChange={update('password')}
                className={errors.password ? 'invalid' : ''}
              />
              <button type="button" className="toggle-btn" onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <span className="error-message">{errors.password}</span>
          </div>

          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              className={errors.confirmPassword ? 'invalid' : ''}
            />
            <span className="error-message">{errors.confirmPassword}</span>
          </div>

          <button type="submit" className="login-btn" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>

          {status.message && <p className={`status-message ${status.type}`}>{status.message}</p>}
        </form>

        <p className="signup-text">Already have an account? <Link to="/login">Login</Link></p>
      </div>
    </div>
  );
}

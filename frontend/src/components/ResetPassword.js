import React, { useState } from 'react';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';
import './Auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); // success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setMessage('Invalid reset link');
        setStatus('error');
        return;
      }

      const response = await fetch('http://localhost:8000/api/auth/reset-password/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {status === 'success' ? (
          <div>
            <div className="auth-success-icon">
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 className="auth-title">
              Password Reset Successfully!
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
              Redirecting to login...
            </p>
          </div>
        ) : (
          <>
            <div className="auth-logo" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Lock size={32} color="white" />
            </div>

            <h2 className="auth-title">
              Reset Your Password
            </h2>
            <p className="auth-subtitle">
              Enter your new password below
            </p>

            {message && status === 'error' && (
              <div className="auth-message error" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-label">
                  New Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="auth-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="auth-button"
              >
                {loading ? (
                  <>
                    Resetting... <div className="spinner" />
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

import React, { useState } from 'react';
import { Upload, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import './Auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (data.success) {
        setSent(true);
        setMessage(data.message);
      } else {
        setMessage(data.errors?.email?.[0] || data.error || 'Failed to send reset email');
      }
    } catch (error) {
      setMessage('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo/Icon */}
        <div className="auth-logo">
          <Upload size={36} color="white" />
        </div>

        {sent ? (
          <div>
            <div className="auth-success-icon">
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 className="auth-title">
              Check Your Email
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="auth-button"
            >
              <ArrowLeft size={18} />
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <h1 className="auth-title">
              Forgot Password?
            </h1>
            <p className="auth-subtitle">
              Enter your email and we'll send you a reset link
            </p>

            {message && (
              <div className="auth-message error">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-label">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
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
                    Sending... <div className="spinner" />
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>

            <div className="auth-back-section">
              <button
                onClick={() => navigate('/signin')}
                className="auth-link-button"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

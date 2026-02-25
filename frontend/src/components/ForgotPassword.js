import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import './Auth.css';

const ForgotPassword = () => {
  const { t } = useTranslation();
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
        setMessage(data.message || t('forgotPassword.sentMessage'));
      } else {
        setMessage(data.errors?.email?.[0] || data.error || t('forgotPassword.failedSend'));
      }
    } catch (error) {
      setMessage(t('forgotPassword.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Logo/Icon */}
        <div className="auth-logo">
          <img
            src="/WhatsApp%20Image%202026-02-25%20at%206.08.01%20AM.jpeg"
            alt="AI Embroidery Files"
          />
        </div>

        {sent ? (
          <div>
            <div className="auth-success-icon">
              <CheckCircle size={40} color="#10b981" />
            </div>
            <h2 className="auth-title">
              {t('forgotPassword.checkEmail')}
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <button
              onClick={() => navigate('/signin')}
              className="auth-button"
            >
              <ArrowLeft size={18} />
              {t('forgotPassword.backToSignIn')}
            </button>
          </div>
        ) : (
          <>
            <h1 className="auth-title">
              {t('forgotPassword.title')}
            </h1>
            <p className="auth-subtitle">
              {t('forgotPassword.subtitle')}
            </p>

            {message && (
              <div className="auth-message error">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="auth-input-group">
                <label className="auth-label">
                  {t('forgotPassword.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('forgotPassword.emailPlaceholder')}
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
                    {t('forgotPassword.sending')} <div className="spinner" />
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {t('forgotPassword.sendResetLink')}
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
                {t('forgotPassword.backToSignIn')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

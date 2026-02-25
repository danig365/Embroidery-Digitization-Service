import React, { useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import './Auth.css';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(''); // success, error

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (password.length < 8) {
      setMessage(t('resetPassword.passwordLength'));
      return;
    }

    if (password !== confirmPassword) {
      setMessage(t('resetPassword.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setMessage(t('resetPassword.invalidLink'));
        setStatus('error');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message || t('resetPassword.successMessage'));
        
        // Redirect after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.error || t('resetPassword.resetFailed'));
      }
    } catch (error) {
      setStatus('error');
      setMessage(t('resetPassword.networkError'));
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
              {t('resetPassword.successTitle')}
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
              {t('resetPassword.redirecting')}
            </p>
          </div>
        ) : (
          <>
            <div className="auth-logo">
              <img
                src="/WhatsApp%20Image%202026-02-25%20at%206.08.01%20AM.jpeg"
                alt="AI Embroidery Files"
              />
            </div>

            <h2 className="auth-title">
              {t('resetPassword.title')}
            </h2>
            <p className="auth-subtitle">
              {t('resetPassword.subtitle')}
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
                  {t('resetPassword.newPassword')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('resetPassword.newPasswordPlaceholder')}
                  required
                  minLength={8}
                  className="auth-input"
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-label">
                  {t('resetPassword.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('resetPassword.confirmPasswordPlaceholder')}
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
                    {t('resetPassword.resetting')} <div className="spinner" />
                  </>
                ) : (
                  t('resetPassword.resetPassword')
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

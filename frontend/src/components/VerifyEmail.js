import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import './Auth.css';

const VerifyEmail = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage(t('verifyEmail.invalidLink'));
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message || t('verifyEmail.successMessage'));
          setUserData(data.user);
          
          // Auto login
          localStorage.setItem('access_token', data.tokens.access);
          localStorage.setItem('refresh_token', data.tokens.refresh);
          
          // Redirect after 5 seconds
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 5000);
        } else {
          setStatus('error');
          setMessage(data.error || t('verifyEmail.failedMessage'));
        }
      } catch (error) {
        setStatus('error');
        setMessage(t('verifyEmail.networkError'));
      }
    };

    verifyEmail();
  }, [t]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        {status === 'verifying' && (
          <div>
            <Loader2 size={64} style={{ 
              color: '#8b5cf6',
              margin: '0 auto 24px',
              animation: 'spin 1s linear infinite'
            }} />
            <h2 className="auth-title">
              {t('verifyEmail.verifyingTitle')}
            </h2>
            <p className="auth-subtitle">
              {t('verifyEmail.verifyingSubtitle')}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="auth-success-icon">
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2 className="auth-title" style={{ fontSize: '28px', fontWeight: '700' }}>
              {t('verifyEmail.successTitle')}
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            {userData && (
              <div style={{
                background: '#f0fdf4',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <p style={{ color: '#065f46', fontSize: '14px', margin: 0 }}>
                  {t('verifyEmail.welcome', { username: userData.username })}<br/>
                  {t('verifyEmail.tokensInfo', { tokens: userData.tokens })}
                </p>
              </div>
            )}
            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
              {t('verifyEmail.redirecting')}
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="auth-success-icon" style={{ background: '#fee2e2' }}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h2 className="auth-title">
              {t('verifyEmail.failedTitle')}
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="auth-button"
            >
              {t('verifyEmail.returnLogin')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
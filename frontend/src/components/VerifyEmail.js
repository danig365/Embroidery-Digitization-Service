import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './Auth.css';

const VerifyEmail = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/auth/verify-email/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        });

        const data = await response.json();

        if (data.success) {
          setStatus('success');
          setMessage(data.message);
          setUserData(data.user);
          
          // Auto login
          localStorage.setItem('access_token', data.tokens.access);
          localStorage.setItem('refresh_token', data.tokens.refresh);
          
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
        setMessage('Failed to verify email. Please try again.');
      }
    };

    verifyEmail();
  }, []);

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
              Verifying Your Email
            </h2>
            <p className="auth-subtitle">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="auth-success-icon">
              <CheckCircle size={48} color="#10b981" />
            </div>
            <h2 className="auth-title" style={{ fontSize: '28px', fontWeight: '700' }}>
              Email Verified! 🎉
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
                  Welcome, <strong>{userData.username}</strong>!<br/>
                  You have <strong>{userData.tokens} tokens</strong> to start creating.
                </p>
              </div>
            )}
            <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
              Redirecting you to the app...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="auth-success-icon" style={{ background: '#fee2e2' }}>
              <AlertCircle size={48} color="#ef4444" />
            </div>
            <h2 className="auth-title">
              Verification Failed
            </h2>
            <p className="auth-subtitle">
              {message}
            </p>
            <button
              onClick={() => window.location.href = '/'}
              className="auth-button"
            >
              Return to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
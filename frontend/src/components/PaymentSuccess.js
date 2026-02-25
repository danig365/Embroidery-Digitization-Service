import React, { useEffect, useState } from 'react';
import { CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../config';
import { getTokenCosts } from '../services/api';
import './Auth.css';

const PaymentSuccess = () => {
  const { t } = useTranslation();
  const [verifying, setVerifying] = useState(true);
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState('');
  const [tokenCosts, setTokenCosts] = useState({
    ai_image_generation: 2,
    order_placement: 1
  });

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session_id');

      if (!sessionId) {
        setError(t('paymentSuccess.noSessionId'));
        setVerifying(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/payment/verify/?session_id=${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });

        const data = await response.json();

        if (data.success && data.paid) {
          setTokens(data.tokens);
          // Load token costs
          try {
            const costsData = await getTokenCosts();
            if (costsData && costsData.costs) {
              setTokenCosts(costsData.costs);
            }
          } catch (costError) {
            console.error("Failed to load token costs:", costError);
          }
        } else {
          setError(t('paymentSuccess.verifyFailed'));
        }
      } catch (err) {
        setError(t('paymentSuccess.verifyError'));
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [t]);

  if (verifying) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <Loader2 size={40} style={{ 
            animation: 'spin 1s linear infinite',
            color: '#8b5cf6',
            margin: '0 auto 16px'
          }} />
          <h2 className="auth-title">{t('paymentSuccess.verifyingTitle')}</h2>
          <p className="auth-subtitle">{t('paymentSuccess.verifyingSubtitle')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-success-icon" style={{ background: '#fee2e2' }}>
            <span style={{ fontSize: '24px' }}>❌</span>
          </div>
          <h2 className="auth-title">{t('paymentSuccess.errorTitle')}</h2>
          <p className="auth-subtitle">{error}</p>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="auth-button"
          >
            <ArrowLeft size={16} />
            {t('paymentSuccess.returnToApp')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-success-icon">
          <CheckCircle size={40} color="white" />
        </div>
        
        <h1 className="auth-title">{t('paymentSuccess.title')}</h1>
        
        <p className="auth-subtitle">{t('paymentSuccess.subtitle')}</p>

        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #d1fae5 100%)',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '11px', color: '#065f46', marginBottom: '6px' }}>
            {t('paymentSuccess.tokenBalance')}
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#10b981' }}>
            {tokens}
          </div>
          <div style={{ fontSize: '11px', color: '#065f46' }}>
            {t('paymentSuccess.tokens')}
          </div>
        </div>

        <div style={{
          background: '#f9fafb',
          borderRadius: '10px',
          padding: '12px',
          marginBottom: '16px',
          textAlign: 'left'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', margin: 0 }}>
            {t('paymentSuccess.whatCanDo')}
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            fontSize: '11px',
            color: '#374151'
          }}>
            <li style={{ padding: '6px 0', borderBottom: '1px solid #e5e7eb' }}>
              {t('paymentSuccess.aiImages', { count: tokenCosts.ai_image_generation })}
            </li>
            <li style={{ padding: '6px 0' }}>
              {t('paymentSuccess.placeOrder', { count: tokenCosts.order_placement })}
            </li>
          </ul>
        </div>

        <button
          onClick={() => window.location.href = '/dashboard'}
          className="auth-button"
        >
          <ArrowLeft size={16} />
          {t('paymentSuccess.startCreating')}
        </button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
import React from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import './Auth.css';

const PaymentCancel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* Cancel Icon */}
        <div className="auth-success-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
          <XCircle size={40} style={{ color: "#ef4444", strokeWidth: 2 }} />
        </div>

        {/* Cancel Message */}
        <h1 className="auth-title">{t('paymentCancel.title')}</h1>

        <p className="auth-subtitle">
          {t('paymentCancel.subtitle')}
        </p>

        {/* Info Box */}
        <div style={{
          padding: '12px',
          background: '#f9fafb',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '12px'
          }}>
            <HelpCircle
              size={18}
              style={{ color: '#667eea', flexShrink: 0, marginTop: '2px' }}
            />
            <div>
              <div style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '6px'
              }}>
                {t('paymentCancel.whatHappened')}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                lineHeight: '1.5'
              }}>
                {t('paymentCancel.details')}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={() => navigate("/buy-tokens")}
            className="auth-button"
          >
            <RefreshCw size={16} />
            {t('paymentCancel.tryAgain')}
          </button>

          <button
            onClick={() => navigate("/dashboard")}
            style={{
              width: '100%',
              padding: '12px 12px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minHeight: '44px',
              transition: 'all 0.3s ease'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.background = '#e5e7eb';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.background = '#f3f4f6';
            }}
          >
            <ArrowLeft size={16} />
            {t('paymentCancel.backToDashboard')}
          </button>
        </div>

        {/* Help Text */}
        <div style={{
          marginTop: '16px',
          fontSize: '11px',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          {t('paymentCancel.needHelp')} {" "}
          <a
            href="mailto:support@embroidery-studio.com"
            style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600'
            }}
          >
            {t('paymentCancel.contactSupport')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;

import React from 'react';
import { useTranslation } from 'react-i18next';
import './LoadingSpinner.css';

/**
 * Loading Spinner Component
 * Displays a beautiful gradient spinner with optional text
 * Matches the site's purple theme
 */
export const LoadingSpinner = ({ text = "Loading...", size = "medium", inline = false }) => {
  const { t } = useTranslation();
  const displayText = text === "Loading..." ? t('common.loading') : text;

  return (
    <div className={`loading-spinner-wrapper ${inline ? 'inline' : 'block'}`}>
      <div className={`loading-spinner ${size}`}></div>
      {displayText && <p className="loading-text">{displayText}</p>}
    </div>
  );
};

/**
 * Loading Overlay Component
 * Full-screen semi-transparent overlay with spinner
 * Used when loading data that blocks user interaction
 */
export const LoadingOverlay = ({ visible = false, text = "Loading..." }) => {
  const { t } = useTranslation();
  const displayText = text === "Loading..." ? t('common.loading') : text;

  if (!visible) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-spinner-large"></div>
        {displayText && <p className="loading-overlay-text">{displayText}</p>}
      </div>
    </div>
  );
};

/**
 * Inline Loading Indicator
 * Small spinner that appears inline with buttons or text
 */
export const InlineLoader = ({ size = "small" }) => {
  return <div className={`inline-loader ${size}`}></div>;
};

export default LoadingSpinner;

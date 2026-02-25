import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config";
import "./SignIn.css";

function SignIn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const googleButtonRef = useRef(null);

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setShowResendVerification(false);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("access_token", data.tokens.access);
        localStorage.setItem("refresh_token", data.tokens.refresh);
        if (data.user && data.user.id) {
          localStorage.setItem("user_id", data.user.id);
        }
        
        if (formData.rememberMe) {
          localStorage.setItem("remember_me", "true");
        }

        setMessage(t("signin.loginSuccess"));
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        if (data.email_not_verified) {
          setMessage(`⚠️ ${data.error}`);
          setShowResendVerification(true);
          setUserEmail(data.email);
        } else {
          setMessage(`❌ ${data.error || t("signin.invalidCredentials")}`);
        }
      }
    } catch (error) {
      setMessage(t("signin.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/resend-verification/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: userEmail }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessage(t("signin.verificationSent"));
        setShowResendVerification(false);
      } else {
        setMessage(`❌ ${data.error || t("signin.failedResend")}`);
      }
    } catch (error) {
      setMessage(t("signin.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (googleCredential) => {
    if (!googleCredential) {
      setMessage(`❌ ${t("signin.googleAuthFailed")}`);
      return;
    }

    setLoading(true);
    setMessage("");
    setShowResendVerification(false);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: googleCredential,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("access_token", data.tokens.access);
        localStorage.setItem("refresh_token", data.tokens.refresh);
        if (data.user && data.user.id) {
          localStorage.setItem("user_id", data.user.id);
        }
        setMessage(t("signin.loginSuccess"));
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        setMessage(`❌ ${data.error || t("signin.googleAuthFailed")}`);
      }
    } catch (error) {
      setMessage(`❌ ${t("signin.googleAuthFailed")}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setMessage(`❌ ${t("signin.googleConfigMissing")}`);
      return;
    }

    const initializeGoogleButton = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => handleGoogleAuth(response?.credential),
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogleButton();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleButton;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [GOOGLE_CLIENT_ID]);

  return (
    <div className="signin-container">
      <div className="signin-card">
        {/* Logo/Icon */}
        <div className="signin-logo">
          <img
            src="/WhatsApp%20Image%202026-02-25%20at%206.08.01%20AM.jpeg"
            alt="AI Embroidery Files"
          />
        </div>

        <h1 className="signin-title">{t("signin.title")}</h1>
        <p className="signin-subtitle">
          {t("signin.subtitle")}
        </p>

        {message && (
          <div
            className="signin-message"
            style={{
              background: message.includes("✅")
                ? "#d1fae5"
                : message.includes("ℹ️")
                ? "#dbeafe"
                : "#fee2e2",
              color: message.includes("✅")
                ? "#065f46"
                : message.includes("ℹ️")
                ? "#1e40af"
                : "#991b1b",
              border: `1px solid ${
                message.includes("✅")
                  ? "#6ee7b7"
                  : message.includes("ℹ️")
                  ? "#93c5fd"
                  : "#fca5a5"
              }`,
            }}
          >
            {message}
          </div>
        )}

        {showResendVerification && (
          <div
            style={{
              padding: "14px 16px",
              background: "#fef3c7",
              borderRadius: "12px",
              marginBottom: "24px",
              textAlign: "center",
              border: "1px solid #fcd34d",
            }}
          >
            <button
              onClick={handleResendVerification}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                color: "#92400e",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                textDecoration: "underline",
                fontSize: "14px",
              }}
            >
              {t("signin.resendVerification")}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="signin-form">
          {/* Email/Username */}
          <div className="signin-input-group">
            <label className="signin-label">
              {t("signin.emailOrUsername")}
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder={t("signin.emailPlaceholder")}
              required
              className="signin-input"
            />
          </div>

          {/* Password */}
          <div className="signin-input-group">
            <label className="signin-label">
              {t("signin.password")}
            </label>
            <div className="signin-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="signin-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="signin-password-toggle"
                aria-label={showPassword ? t("signin.hidePassword") : t("signin.showPassword")}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="signin-remember-row">
            <label className="signin-checkbox-label">
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                style={{
                  width: "16px",
                  height: "16px",
                  cursor: "pointer",
                  accentColor: "#3b82f6",
                }}
              />
              {t("signin.rememberMe")}
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="signin-forgot-link"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              {t("signin.forgotPassword")}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="signin-button"
          >
            {loading ? (
              <>
                {t("signin.signingIn")} <div className="spinner" />
              </>
            ) : (
              <>
                {t("signin.signIn")} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="signin-divider">
          <div className="signin-divider-line"></div>
          <span>{t("signin.orContinueWith")}</span>
          <div className="signin-divider-line"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="signin-oauth-buttons">
          <div className="signin-google-button-wrapper" ref={googleButtonRef} />
        </div>

        {/* Sign Up Link */}
        <div className="signin-signup-link">
          <span>{t("signin.noAccount")}</span>
          <button
            onClick={() => navigate("/signup")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            className="signin-forgot-link"
          >
            {t("signin.signUpFree")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

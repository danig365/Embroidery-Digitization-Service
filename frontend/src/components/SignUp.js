import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../config";
import "./SignUp.css";

function SignUp() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
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

    if (!formData.agreeToTerms) {
      setMessage(t("signup.agreeTermsError"));
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage(t("signup.passwordMismatch"));
      setLoading(false);
      return;
    }

    // Auto-generate username from email or full name
    const generatedUsername = formData.email.split('@')[0] || 
                              formData.fullName.replace(/\s+/g, '').toLowerCase() || 
                              'user' + Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.fullName,
          username: generatedUsername,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(
          t("signup.success")
        );
        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      } else {
        const errorMessages = data.errors
          ? Object.entries(data.errors)
              .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
              .join("\n")
          : data.error || t("signup.registrationFailed");
        setMessage("❌ " + errorMessages);
      }
    } catch (error) {
      setMessage(t("signup.genericError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async (googleCredential) => {
    if (!googleCredential) {
      setMessage(`❌ ${t("signup.googleAuthFailed")}`);
      return;
    }

    setLoading(true);
    setMessage("");

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
        setMessage(`❌ ${data.error || t("signup.googleAuthFailed")}`);
      }
    } catch (error) {
      setMessage(`❌ ${t("signup.googleAuthFailed")}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setMessage(`❌ ${t("signup.googleConfigMissing")}`);
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
        text: "signup_with",
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
    <div className="signup-container">
      <div className="signup-card">
        {/* Logo/Icon */}
        <div className="signup-logo">
          <img
            src="/WhatsApp%20Image%202026-02-25%20at%206.08.01%20AM.jpeg"
            alt="AI Embroidery Files"
          />
        </div>

        <h1 className="signup-title">
          {t("signup.title")}
        </h1>
        <p className="signup-subtitle">
          {t("signup.subtitle")}
        </p>

        {message && (
          <div
            className="signup-message"
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

        <form onSubmit={handleSubmit} className="signup-form">
          {/* Full Name */}
          <div className="signup-input-group">
            <label className="signup-label">
              {t("signup.fullName")}
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder={t("signup.fullNamePlaceholder")}
              required
              className="signup-input"
            />
          </div>

          {/* Email */}
          <div className="signup-input-group">
            <label className="signup-label">
              {t("signup.email")}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t("signup.emailPlaceholder")}
              required
              className="signup-input"
            />
          </div>

          {/* Password */}
          <div className="signup-input-group">
            <label className="signup-label">
              {t("signup.password")}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength="8"
              className="signup-input"
            />
            <p
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#6b7280",
              }}
            >
              {t("signup.passwordHint")}
            </p>
          </div>

          {/* Confirm Password */}
          <div className="signup-input-group">
            <label className="signup-label">
              {t("signup.confirmPassword")}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength="8"
              className="signup-input"
            />
          </div>

          {/* Hidden Username field for backend compatibility */}
          <input
            type="hidden"
            name="username"
            value={formData.email.split('@')[0] || formData.fullName.replace(/\s+/g, '').toLowerCase()}
          />

          {/* Terms Checkbox */}
          <div style={{ marginBottom: "24px" }}>
            <label className="signup-checkbox-label">
              <input
                type="checkbox"
                name="agreeToTerms"
                checked={formData.agreeToTerms}
                onChange={handleChange}
              />
              <span>
                {t("signup.agreeTo")} {" "}
                <span style={{ color: "#3b82f6", cursor: "pointer" }}>
                  {t("signup.terms")}
                </span>{" "}
                {t("signup.and")} {" "}
                <span style={{ color: "#3b82f6", cursor: "pointer" }}>
                  {t("signup.privacy")}
                </span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="signup-button"
          >
            {loading ? (
              <>
                {t("signup.creating")} <div className="spinner" />
              </>
            ) : (
              <>
                {t("signup.createAccount")} <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="signup-divider">
          <div className="signup-divider-line"></div>
          <span>{t("signup.orSignUpWith")}</span>
          <div className="signup-divider-line"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="signup-oauth-buttons">
          <div className="signup-google-button-wrapper" ref={googleButtonRef} />
        </div>

        {/* Sign In Link */}
        <div className="signup-signin-link">
          <span>{t("signup.alreadyHaveAccount")}</span>
          <button
            onClick={() => navigate("/signin")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            className="signup-signin-link"
          >
            {t("signup.signIn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

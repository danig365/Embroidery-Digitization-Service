import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, Chrome, Github } from "lucide-react";
import "./SignIn.css";

function SignIn() {
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
      const response = await fetch("http://localhost:8000/api/auth/login/", {
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
        
        if (formData.rememberMe) {
          localStorage.setItem("remember_me", "true");
        }

        setMessage("✅ Login successful! Redirecting...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else {
        if (data.email_not_verified) {
          setMessage("⚠️ " + data.error);
          setShowResendVerification(true);
          setUserEmail(data.email);
        } else {
          setMessage("❌ " + (data.error || "Invalid credentials"));
        }
      }
    } catch (error) {
      setMessage("❌ An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/api/auth/resend-verification/",
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
        setMessage("✅ Verification email sent! Please check your inbox.");
        setShowResendVerification(false);
      } else {
        setMessage("❌ " + (data.error || "Failed to resend email"));
      }
    } catch (error) {
      setMessage("❌ An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthPlaceholder = (provider) => {
    setMessage(`ℹ️ ${provider} sign-in coming soon!`);
  };

  return (
    <div className="signin-container">
      <div className="signin-card">
        {/* Logo/Icon */}
        <div className="signin-logo">
          <Upload size={36} color="white" />
        </div>

        <h1 className="signin-title">Welcome back</h1>
        <p className="signin-subtitle">
          Sign in to your account to continue creating
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
              Click here to resend verification email
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="signin-form">
          {/* Email/Username */}
          <div className="signin-input-group">
            <label className="signin-label">
              Email or Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="email@example.com or username"
              required
              className="signin-input"
            />
          </div>

          {/* Password */}
          <div className="signin-input-group">
            <label className="signin-label">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              className="signin-input"
            />
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
              Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="signin-forgot-link"
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              Forgot your password?
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
                Signing In... <div className="spinner" />
              </>
            ) : (
              <>
                Sign in <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="signin-divider">
          <div className="signin-divider-line"></div>
          <span>Or continue with</span>
          <div className="signin-divider-line"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="signin-oauth-buttons">
          <button
            type="button"
            onClick={() => handleOAuthPlaceholder("Google")}
            className="signin-oauth-button"
          >
            <Chrome size={18} />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuthPlaceholder("GitHub")}
            className="signin-oauth-button"
          >
            <Github size={18} />
            GitHub
          </button>
        </div>

        {/* Sign Up Link */}
        <div className="signin-signup-link">
          <span>Don't have an account? </span>
          <button
            onClick={() => navigate("/signup")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            className="signin-forgot-link"
          >
            Sign up for free
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignIn;

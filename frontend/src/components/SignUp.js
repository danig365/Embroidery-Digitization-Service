import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, ArrowRight, Chrome, Github } from "lucide-react";
import "./SignUp.css";

function SignUp() {
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
      setMessage("⚠️ Please agree to the Terms and Privacy Policy");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setMessage("⚠️ Passwords do not match");
      setLoading(false);
      return;
    }

    // Auto-generate username from email or full name
    const generatedUsername = formData.email.split('@')[0] || 
                              formData.fullName.replace(/\s+/g, '').toLowerCase() || 
                              'user' + Date.now();

    try {
      const response = await fetch("http://localhost:8000/api/auth/register/", {
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
          "✅ Registration successful! Please check your email to verify your account."
        );
        setTimeout(() => {
          navigate("/signin");
        }, 2000);
      } else {
        const errorMessages = data.errors
          ? Object.entries(data.errors)
              .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
              .join("\n")
          : data.error || "Registration failed";
        setMessage("❌ " + errorMessages);
      }
    } catch (error) {
      setMessage("❌ An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthPlaceholder = (provider) => {
    setMessage(`ℹ️ ${provider} sign-up coming soon!`);
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        {/* Logo/Icon */}
        <div className="signup-logo">
          <Upload size={36} color="white" />
        </div>

        <h1 className="signup-title">
          Create your account
        </h1>
        <p className="signup-subtitle">
          Start digitizing your embroidery designs today
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
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="John Doe"
              required
              className="signup-input"
            />
          </div>

          {/* Email */}
          <div className="signup-input-group">
            <label className="signup-label">
              Email address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="signup-input"
            />
          </div>

          {/* Password */}
          <div className="signup-input-group">
            <label className="signup-label">
              Password
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
              Must be at least 8 characters long
            </p>
          </div>

          {/* Confirm Password */}
          <div className="signup-input-group">
            <label className="signup-label">
              Confirm Password
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
                I agree to the{" "}
                <span style={{ color: "#3b82f6", cursor: "pointer" }}>
                  Terms
                </span>{" "}
                and{" "}
                <span style={{ color: "#3b82f6", cursor: "pointer" }}>
                  Privacy Policy
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
                Creating Account... <div className="spinner" />
              </>
            ) : (
              <>
                Create Account <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="signup-divider">
          <div className="signup-divider-line"></div>
          <span>Or sign up with</span>
          <div className="signup-divider-line"></div>
        </div>

        {/* OAuth Buttons */}
        <div className="signup-oauth-buttons">
          <button
            type="button"
            onClick={() => handleOAuthPlaceholder("Google")}
            className="signup-oauth-button"
          >
            <Chrome size={18} />
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuthPlaceholder("GitHub")}
            className="signup-oauth-button"
          >
            <Github size={18} />
            GitHub
          </button>
        </div>

        {/* Sign In Link */}
        <div className="signup-signin-link">
          <span>Already have an account? </span>
          <button
            onClick={() => navigate("/signin")}
            style={{ background: "none", border: "none", cursor: "pointer" }}
            className="signup-signin-link"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignUp;

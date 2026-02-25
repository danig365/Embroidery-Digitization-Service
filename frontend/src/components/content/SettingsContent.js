import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  User, Mail, Lock, Save, Loader2, Eye, EyeOff, 
  Palette, ShoppingBag, Coins, Calendar,
  TrendingUp, TrendingDown, LogOut
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import './ContentStyles.css';

function SettingsContent({ isAdmin = false }) {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [stats, setStats] = useState({
    totalDesigns: 0,
    totalOrders: 0,
    tokenBalance: 0,
    memberSince: "",
    emailVerified: false,
  });

  const [transactions, setTransactions] = useState([]);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    loadUserProfile();
    loadTransactions();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const user = data.user || data.profile;
        setFormData({
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          email: user.email || "",
          current_password: "",
          new_password: "",
          confirm_password: "",
        });

        setStats({
          totalDesigns: data.stats?.total_designs || 0,
          totalOrders: data.stats?.total_orders || 0,
          tokenBalance: data.profile?.tokens || user.tokens || 0,
          memberSince: user.date_joined || user.created_at || "",
          emailVerified: data.profile?.email_verified || user.email_verified || false,
        });
      } else {
        setMessage(`❌ ${data.error || t("settings.failedLoadProfile")}`);
      }
    } catch (error) {
      setMessage(t("settings.failedLoadProfileRetry"));
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/transactions/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
      };

      const response = await fetch(`${API_BASE_URL}/auth/profile/update/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(t("settings.profileUpdated"));
      } else {
        setMessage(`❌ ${data.error || t("settings.failedUpdateProfile")}`);
      }
    } catch (error) {
      setMessage(t("settings.failedUpdateProfileRetry"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (formData.new_password !== formData.confirm_password) {
      setMessage(t("settings.passwordsNoMatch"));
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/change-password/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: formData.current_password,
          new_password: formData.new_password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(t("settings.passwordChanged"));
        setFormData({
          ...formData,
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      } else {
        setMessage(`❌ ${data.error || t("settings.failedChangePassword")}`);
      }
    } catch (error) {
      setMessage(t("settings.failedChangePasswordRetry"));
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/signin";
  };

  const formatDate = (dateString) => {
    if (!dateString) return t("common.na");
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language.startsWith("fr") ? "fr-FR" : "en-US", { month: "long", year: "numeric" });
  };

  const formatTransactionDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language.startsWith("fr") ? "fr-FR" : "en-US", { 
      month: "short", 
      day: "numeric", 
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "300px" }}>
        <Loader2 size={32} color="#3b82f6" className="spin" />
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="content-header">
        {/* Header */}
        <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "6px", margin: 0 }}>
          {t("settings.title")}
        </h1>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
          {t("settings.subtitle")}
        </p>
      </div>

      <div className="content-main">

        {/* Profile Statistics */}
        {!isAdmin && (
        <div style={{ marginBottom: "16px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
            {t("settings.profileStats")}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px" }}>
            {/* Total Designs */}
            <div style={{ 
              background: "white", 
              padding: "12px", 
              borderRadius: "12px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                  padding: "8px", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Palette size={16} color="white" />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px", margin: 0 }}>{t("settings.totalDesigns")}</p>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", margin: 0 }}>{stats.totalDesigns}</p>
            </div>

            {/* Total Orders */}
            <div style={{ 
              background: "white", 
              padding: "12px", 
              borderRadius: "12px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                  padding: "8px", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <ShoppingBag size={16} color="white" />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px", margin: 0 }}>{t("settings.totalOrders")}</p>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "#111827", margin: 0 }}>{stats.totalOrders}</p>
            </div>

            {/* Token Balance - Prominent */}
            <div style={{ 
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
              padding: "12px", 
              borderRadius: "12px", 
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ 
                  background: "rgba(255, 255, 255, 0.2)", 
                  padding: "8px", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Coins size={16} color="white" />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.9)", marginBottom: "3px", margin: 0 }}>{t("settings.tokenBalance")}</p>
              <p style={{ fontSize: "18px", fontWeight: "bold", color: "white", margin: 0 }}>{stats.tokenBalance}</p>
            </div>

            {/* Member Since */}
            <div style={{ 
              background: "white", 
              padding: "12px", 
              borderRadius: "12px", 
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ 
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
                  padding: "8px", 
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Calendar size={16} color="white" />
                </div>
              </div>
              <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "3px", margin: 0 }}>{t("settings.memberSince")}</p>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>{formatDate(stats.memberSince)}</p>
            </div>
          </div>
        </div>
        )}

        {/* Message */}
        {message && (
          <div
            style={{
              padding: "10px 12px",
              background: message.includes("❌") ? "#fee2e2" : "#d1fae5",
              color: message.includes("❌") ? "#991b1b" : "#065f46",
              borderRadius: "8px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px"
            }}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                color: "inherit",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Profile & Password Section Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginBottom: "16px" }}>
          
        {/* Profile Information */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <User size={16} color="#374151" />
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
              {t("settings.profileInfo")}
            </h2>
            {stats.emailVerified ? (
              <span style={{ 
                background: "#d1fae5", 
                color: "#065f46", 
                padding: "4px 12px", 
                borderRadius: "12px", 
                fontSize: "11px", 
                fontWeight: "500",
                marginLeft: "auto"
              }}>
                {t("settings.verified")}
              </span>
            ) : (
              <span style={{ 
                background: "#fef3c7", 
                color: "#92400e", 
                padding: "4px 12px", 
                borderRadius: "12px", 
                fontSize: "11px", 
                fontWeight: "500",
                marginLeft: "auto"
              }}>
                {t("settings.unverified")}
              </span>
            )}
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                  {t("settings.firstName")}
                </label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                  {t("settings.lastName")}
                </label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                <Mail size={12} style={{ display: "inline", marginRight: "6px" }} />
                {t("settings.emailAddress")}
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 12px",
                background: saving ? "#93c5fd" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {t("settings.saving")}
                </>
              ) : (
                <>
                  <Save size={16} />
                  {t("settings.saveChanges")}
                </>
              )}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Lock size={16} color="#374151" />
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
              {t("settings.changePassword")}
            </h2>
          </div>

          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                {t("settings.currentPassword")}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    paddingRight: "36px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  {showPassword ? <EyeOff size={14} color="#9ca3af" /> : <Eye size={14} color="#9ca3af" />}
                </button>
              </div>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                {t("settings.newPassword")}
              </label>
              <input
                type="password"
                name="new_password"
                value={formData.new_password}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px" }}>
                {t("settings.confirmNewPassword")}
              </label>
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !formData.current_password || !formData.new_password || !formData.confirm_password}
              style={{
                padding: "10px 12px",
                background: saving || !formData.current_password || !formData.new_password || !formData.confirm_password ? "#93c5fd" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: saving || !formData.current_password || !formData.new_password || !formData.confirm_password ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="spin" />
                  {t("settings.updating")}
                </>
              ) : (
                <>
                  <Lock size={14} />
                  {t("settings.updatePassword")}
                </>
              )}
            </button>
          </form>
        </div>
        </div>

        {/* Transaction History */}
        {!isAdmin && (
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Coins size={16} color="#374151" />
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
              {t("settings.transactionHistory")}
            </h2>
          </div>

          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 15px", color: "#9ca3af" }}>
              <Coins size={40} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "12px", margin: 0 }}>{t("settings.noTransactions")}</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("settings.date")}
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("settings.type")}
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("settings.amount")}
                    </th>
                    <th style={{ textAlign: "left", padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("settings.description")}
                    </th>
                    <th style={{ textAlign: "right", padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("settings.balanceAfter")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 6px", fontSize: "11px", color: "#374151" }}>
                        {formatTransactionDate(transaction.created_at || transaction.date)}
                      </td>
                      <td style={{ padding: "8px 6px" }}>
                        <span style={{ 
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 6px", 
                          borderRadius: "6px", 
                          fontSize: "10px", 
                          fontWeight: "500",
                          background: transaction.type === "purchase" ? "#d1fae5" : transaction.type === "refund" ? "#dbeafe" : "#fee2e2",
                          color: transaction.type === "purchase" ? "#065f46" : transaction.type === "refund" ? "#1e40af" : "#991b1b"
                        }}>
                          {transaction.type === "purchase" ? (
                            <TrendingUp size={12} />
                          ) : transaction.type === "refund" ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td style={{ 
                        padding: "8px 6px", 
                        fontSize: "11px", 
                        fontWeight: "600",
                        textAlign: "right",
                        color: transaction.amount >= 0 ? "#059669" : "#dc2626"
                      }}>
                        {transaction.amount >= 0 ? "+" : ""}{transaction.amount}
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: "10px", color: "#6b7280" }}>
                        {transaction.description || t("common.na")}
                      </td>
                      <td style={{ padding: "8px 6px", fontSize: "11px", fontWeight: "600", color: "#111827", textAlign: "right" }}>
                        {transaction.balance_after || t("common.na")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* Account Actions */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: 0 }}>
              {t("settings.accountActions")}
            </h2>
          </div>

          <button
            onClick={handleSignOut}
            style={{
              padding: "10px 12px",
              background: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <LogOut size={14} />
            {t("settings.signOut")}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
}

export default SettingsContent;

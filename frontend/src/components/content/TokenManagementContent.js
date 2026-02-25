import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Star, 
  Search,
  Loader2,
  X
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import './ContentStyles.css';

function TokenManagementContent() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    tokens: "",
    price: "",
    description: "",
    features: "",
    savings_percentage: "0",
    is_popular: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      // Load packages
      const pkgResponse = await fetch(`${API_BASE_URL}/token-packages/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pkgData = await pkgResponse.json();
      if (pkgData.success) {
        setPackages(pkgData.packages || []);
      }

      // Load stats
      const statsResponse = await fetch(`${API_BASE_URL}/token-packages/stats/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setStats(statsData);
      }
    } catch (error) {
      setMessage(t("tokenMgmt.failedLoad"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg) => {
    setEditingId(pkg.id);
    setFormData({
      name: pkg.name,
      tokens: pkg.tokens.toString(),
      price: pkg.price.toString(),
      description: pkg.description || "",
      features: (pkg.features || []).join(", "),
      savings_percentage: pkg.savings_percentage?.toString() || "0",
      is_popular: pkg.is_popular || false,
    });
    setShowForm(true);
  };

  const handleNewPackage = () => {
    setEditingId(null);
    setFormData({
      name: "",
      tokens: "",
      price: "",
      description: "",
      features: "",
      savings_percentage: "0",
      is_popular: false,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("access_token");
      
      const payload = {
        name: formData.name,
        tokens: parseInt(formData.tokens),
        price: parseFloat(formData.price),
        description: formData.description,
        features: formData.features.split(",").map(f => f.trim()).filter(f => f),
        savings_percentage: parseFloat(formData.savings_percentage) || 0,
        is_popular: formData.is_popular,
      };

      const url = editingId 
        ? `${API_BASE_URL}/token-packages/${editingId}/`
        : `${API_BASE_URL}/token-packages/`;

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(editingId ? t("tokenMgmt.updatedSuccess") : t("tokenMgmt.createdSuccess"));
        setShowForm(false);
        loadData();
      } else {
        setMessage(`❌ ${data.error || t("tokenMgmt.failedSave")}`);
      }
    } catch (error) {
      setMessage(t("tokenMgmt.failedSaveRetry"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (packageId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/token-packages/${packageId}/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t("tokenMgmt.deletedSuccess"));
        setDeleteConfirm(null);
        loadData();
      } else {
        setMessage(`❌ ${data.error || t("tokenMgmt.failedDelete")}`);
      }
    } catch (error) {
      setMessage(t("tokenMgmt.failedDeleteRetry"));
    }
  };

  const handleSetPopular = async (packageId) => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/token-packages/${packageId}/popularity/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessage(t("tokenMgmt.popularUpdated"));
        loadData();
      } else {
        setMessage(`❌ ${data.error || t("tokenMgmt.failedUpdate")}`);
      }
    } catch (error) {
      setMessage(t("tokenMgmt.failedPopularUpdate"));
    }
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <LoadingOverlay visible={loading} text={t("tokenMgmt.loading")} />
      <div style={{ padding: "24px", height: "100%", overflowY: "auto", background: "#F9FAFB" }}>
        <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
                {t("tokenMgmt.title")}
              </h1>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>
                {t("tokenMgmt.subtitle")}
              </p>
            </div>
            <button
              onClick={handleNewPackage}
              style={{
                padding: "10px 16px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Plus size={18} />
              {t("tokenMgmt.newPackage")}
            </button>
          </div>

          {/* Message */}
          {message && (
            <div
              style={{
                padding: "12px 16px",
                background: message.includes("❌") ? "#fee2e2" : "#d1fae5",
                color: message.includes("❌") ? "#991b1b" : "#065f46",
                borderRadius: "8px",
                marginBottom: "24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{message}</span>
              <button
                onClick={() => setMessage("")}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "inherit",
                  fontSize: "18px",
                }}
              >
                ×
              </button>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>{t("tokenMgmt.totalTokensSold")}</div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
                  {stats.total_tokens_sold?.toLocaleString()}
                </div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>{t("tokenMgmt.totalPurchases")}</div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
                  {stats.total_purchases}
                </div>
              </div>
              <div style={{ background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>{t("tokenMgmt.totalRevenue")}</div>
                <div style={{ fontSize: "28px", fontWeight: "700", color: "#111827" }}>
                  ${parseFloat(stats.total_revenue || 0).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div style={{ background: "white", borderRadius: "12px", padding: "20px", marginBottom: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ position: "relative" }}>
              <Search size={18} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder={t("tokenMgmt.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 40px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "14px",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Packages Table */}
          <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.package")}</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("buyTokens.tokens")}</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.price")}</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.savings")}</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.purchases")}</th>
                    <th style={{ padding: "16px", textAlign: "left", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.revenue")}</th>
                    <th style={{ padding: "16px", textAlign: "center", fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase" }}>{t("tokenMgmt.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
                        {t("tokenMgmt.noneFound")}
                      </td>
                    </tr>
                  ) : (
                    filteredPackages.map(pkg => (
                      <tr key={pkg.id} style={{ borderBottom: "1px solid #e5e7eb", hover: { background: "#f9fafb" } }}>
                        <td style={{ padding: "16px" }}>
                          <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{pkg.name}</div>
                          {pkg.description && (
                            <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "4px" }}>{pkg.description}</div>
                          )}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#111827" }}>{pkg.tokens.toLocaleString()}</td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#111827", fontWeight: "600" }}>${parseFloat(pkg.price).toFixed(2)}</td>
                        <td style={{ padding: "16px", fontSize: "14px", color: parseFloat(pkg.savings_percentage) > 0 ? "#059669" : "#6b7280" }}>
                          {parseFloat(pkg.savings_percentage) > 0 ? `${parseFloat(pkg.savings_percentage).toFixed(0)}%` : "—"}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#111827" }}>
                          {stats?.package_stats?.[pkg.id]?.purchase_count || 0}
                        </td>
                        <td style={{ padding: "16px", fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                          ${parseFloat(stats?.package_stats?.[pkg.id]?.revenue || 0).toFixed(2)}
                        </td>
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleSetPopular(pkg.id)}
                              title={pkg.is_popular ? t("tokenMgmt.unmarkPopular") : t("tokenMgmt.markPopular")}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: pkg.is_popular ? "#fbbf24" : "#d1d5db",
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) => e.target.style.color = "#fbbf24"}
                              onMouseLeave={(e) => e.target.style.color = pkg.is_popular ? "#fbbf24" : "#d1d5db"}
                            >
                              <Star size={18} fill="currentColor" />
                            </button>
                            <button
                              onClick={() => handleEdit(pkg)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6b7280",
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) => e.target.style.color = "#3b82f6"}
                              onMouseLeave={(e) => e.target.style.color = "#6b7280"}
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(pkg.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "6px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#6b7280",
                                transition: "color 0.2s",
                              }}
                              onMouseEnter={(e) => e.target.style.color = "#ef4444"}
                              onMouseLeave={(e) => e.target.style.color = "#6b7280"}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                {editingId ? t("tokenMgmt.editPackage") : t("tokenMgmt.createPackage")}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0" }}
              >
                <X size={24} color="#6b7280" />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("tokenMgmt.packageName")} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  placeholder={t("tokenMgmt.packageNamePlaceholder")}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                    {t("buyTokens.tokens")} *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.tokens}
                    onChange={(e) => setFormData({ ...formData, tokens: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                    {t("tokenMgmt.priceUsd")} *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("tokenMgmt.description")}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  placeholder={t("tokenMgmt.briefDescription")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("tokenMgmt.featuresComma")}
                </label>
                <input
                  type="text"
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                  placeholder={t("tokenMgmt.featuresPlaceholder")}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("tokenMgmt.savingsPercentage")}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.savings_percentage}
                  onChange={(e) => setFormData({ ...formData, savings_percentage: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={formData.is_popular}
                  onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "14px", color: "#374151" }}>{t("tokenMgmt.markMostPopular")}</span>
              </label>

              <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {t("myDesigns.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: submitting ? "#93c5fd" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {t("settings.saving")}
                    </>
                  ) : (
                    t("tokenMgmt.savePackage")
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "400px",
            width: "90%",
          }}>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>
              {t("tokenMgmt.deletePackageQuestion")}
            </h2>
            <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
              {t("tokenMgmt.deleteConfirm")}
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {t("myDesigns.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                style={{
                  flex: 1,
                  padding: "12px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {t("myDesigns.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}

export default TokenManagementContent;

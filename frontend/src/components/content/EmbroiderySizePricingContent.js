import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, AlertCircle, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from "../../config";

function EmbroiderySizePricingContent() {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [newTier, setNewTier] = useState({
    size_cm: "",
    price_in_tokens: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadPricingTiers();
  }, []);

  const loadPricingTiers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${API_BASE_URL}/admin/embroidery-size-pricing/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setTiers(data.tiers);
      } else {
        setError(data.error || t("sizePricing.failedLoad"));
      }
    } catch (err) {
      setError(t("sizePricing.failedLoad"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = async () => {
    if (!newTier.size_cm || !newTier.price_in_tokens) {
      setError(t("sizePricing.fillAllFields"));
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch(
        `${API_BASE_URL}/admin/embroidery-size-pricing/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            size_cm: parseInt(newTier.size_cm),
            price_in_tokens: parseInt(newTier.price_in_tokens),
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess(
          t("sizePricing.addedSuccess", {
            size: newTier.size_cm,
            price: newTier.price_in_tokens,
          })
        );
        setNewTier({ size_cm: "", price_in_tokens: "" });
        await loadPricingTiers();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || t("sizePricing.failedAdd"));
      }
    } catch (err) {
      setError(t("sizePricing.failedAdd"));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTier = async (tierId) => {
    if (!window.confirm(t("sizePricing.deleteConfirm"))) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch(
        `${API_BASE_URL}/admin/embroidery-size-pricing/${tierId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess(t("sizePricing.deletedSuccess"));
        await loadPricingTiers();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || t("sizePricing.failedDelete"));
      }
    } catch (err) {
      setError(t("sizePricing.failedDelete"));
      console.error(err);
    } finally {
      setSaving(false);
      setDeletingId(null);
    }
  };

  const handleUpdateTier = async (tierId, updatedSize, updatedPrice) => {
    if (!updatedSize || !updatedPrice) {
      setError(t("sizePricing.fillAllFields"));
      return;
    }

    try {
      setSaving(true);
      setError("");
      const response = await fetch(
        `${API_BASE_URL}/admin/embroidery-size-pricing/${tierId}/`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            size_cm: parseInt(updatedSize),
            price_in_tokens: parseInt(updatedPrice),
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuccess(t("sizePricing.updatedSuccess"));
        setEditingId(null);
        await loadPricingTiers();
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(data.error || t("sizePricing.failedUpdate"));
      }
    } catch (err) {
      setError(t("sizePricing.failedUpdate"));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="content-header">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "12px",
            marginBottom: "12px",
          }}
        >
          <Zap size={24} style={{ color: "white" }} />
        </div>

        <h1
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          {t("sizePricing.title")}
        </h1>

        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0" }}>
          {t("sizePricing.subtitle")}
        </p>
      </div>

      <div className="content-main">
        {/* Info Box */}
        <div
          style={{
            padding: "12px",
            background: "#dbeafe",
            border: "1px solid #93c5fd",
            borderRadius: "8px",
            marginBottom: "16px",
            display: "flex",
            gap: "8px",
          }}
        >
          <AlertCircle size={18} style={{ color: "#1e40af", flexShrink: 0 }} />
          <div style={{ fontSize: "12px", color: "#1e40af" }}>
            <strong>{t("sizePricing.howItWorks")}</strong> {t("sizePricing.howItWorksDetail")}
            {" "}
            {t("sizePricing.example")}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "8px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            style={{
              padding: "10px 12px",
              background: "#dcfce7",
              color: "#166534",
              borderRadius: "8px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            {success}
          </div>
        )}

        {/* Add New Tier */}
        <div
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "14px",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "12px",
              margin: "0 0 12px 0",
            }}
          >
            {t("sizePricing.addNewTier")}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: "8px",
              alignItems: "end",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                {t("sizePricing.sizeCm")}
              </label>
              <input
                type="number"
                min="5"
                max="40"
                value={newTier.size_cm}
                onChange={(e) =>
                  setNewTier({ ...newTier, size_cm: e.target.value })
                }
                placeholder={t("sizePricing.sizePlaceholder")}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#6b7280",
                  marginBottom: "4px",
                }}
              >
                {t("sizePricing.priceTokens")}
              </label>
              <input
                type="number"
                min="1"
                value={newTier.price_in_tokens}
                onChange={(e) =>
                  setNewTier({ ...newTier, price_in_tokens: e.target.value })
                }
                placeholder={t("sizePricing.pricePlaceholder")}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={handleAddTier}
              disabled={saving}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                background: saving ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "600",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={14} />
              {saving ? t("sizePricing.adding") : t("sizePricing.addTier")}
            </button>
          </div>
        </div>

        {/* Existing Tiers */}
        <div>
          <h3
            style={{
              fontSize: "13px",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "12px",
              margin: "0 0 12px 0",
            }}
          >
            {t("sizePricing.currentTiers")}
            {tiers.length > 0 && (
              <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "8px" }}>
                {t("sizePricing.tierCount", { count: tiers.length })}
              </span>
            )}
          </h3>

          {loading ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  border: "3px solid #e5e7eb",
                  borderTopColor: "#3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto",
                }}
              />
            </div>
          ) : tiers.length === 0 ? (
            <div
              style={{
                padding: "20px",
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: "8px",
                color: "#6b7280",
                fontSize: "12px",
              }}
            >
              {t("sizePricing.noneConfigured")}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "12px",
              }}
            >
              {tiers.map((tier) => (
                <PricingTierCard
                  key={tier.id}
                  tier={tier}
                  isEditing={editingId === tier.id}
                  isDeleting={deletingId === tier.id}
                  onEdit={(size, price) =>
                    handleUpdateTier(tier.id, size, price)
                  }
                  onDelete={() => handleDeleteTier(tier.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onStartEdit={() => setEditingId(tier.id)}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

function PricingTierCard({
  tier,
  isEditing,
  isDeleting,
  onEdit,
  onDelete,
  onCancelEdit,
  onStartEdit,
  saving,
}) {
  const { t } = useTranslation();
  const [editSize, setEditSize] = useState(tier.size_cm);
  const [editPrice, setEditPrice] = useState(tier.price_in_tokens);

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "12px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {isEditing ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" }}>{t("sizePricing.sizeCm")}</label>
              <input
                type="number"
                value={editSize}
                onChange={(e) => setEditSize(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#6b7280", marginBottom: "4px" }}>{t("sizePricing.priceTokens")}</label>
              <input
                type="number"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "12px",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onEdit(editSize, editPrice)}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: saving ? "#9ca3af" : "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Save size={12} />
              {t("sizePricing.save")}
            </button>
            <button
              onClick={onCancelEdit}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              {t("sizePricing.cancel")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 0",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
              {tier.size_cm}cm
            </span>
            <span style={{ color: "#d1d5db" }}>→</span>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#667eea" }}>
              {tier.price_in_tokens}
            </span>
            <span style={{ fontSize: "12px", color: "#6b7280" }}>{t("sizePricing.tokens")}</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={onStartEdit}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "600",
              }}
            >
              {t("sizePricing.edit")}
            </button>
            <button
              onClick={onDelete}
              disabled={saving}
              style={{
                flex: 1,
                padding: "8px 10px",
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fca5a5",
                borderRadius: "6px",
                cursor: saving ? "not-allowed" : "pointer",
                fontSize: "11px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <Trash2 size={12} />
              {isDeleting ? t("sizePricing.deleting") : t("sizePricing.delete")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default EmbroiderySizePricingContent;

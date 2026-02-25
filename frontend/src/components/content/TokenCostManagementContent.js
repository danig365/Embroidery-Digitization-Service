import { useState, useEffect } from "react";
import { Save, Loader2, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from '../../config';

function TokenCostManagementContent() {
  const { t } = useTranslation();
  const [costs, setCosts] = useState({
    ai_image_generation: 2,
    order_placement: 1,
    embroidery_preview: 1,
    text_addition: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [originalCosts, setOriginalCosts] = useState({});

  useEffect(() => {
    loadTokenCosts();
  }, []);

  const loadTokenCosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin/token-costs/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setCosts(data.costs);
        setOriginalCosts(data.costs);
      } else {
        setMessage(`❌ ${data.error || t("tokenCost.failedLoad")}`);
      }
    } catch (error) {
      setMessage(t("tokenCost.failedLoadDefaults"));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    const numValue = parseInt(value) || 0;
    if (numValue < 0) return; // Don't allow negative
    setCosts({ ...costs, [key]: numValue });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/admin/token-costs/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(costs),
      });

      const data = await response.json();
      if (data.success) {
        setMessage(t("tokenCost.updated"));
        setOriginalCosts(costs);
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ ${data.error || t("tokenCost.failedUpdate")}`);
      }
    } catch (error) {
      setMessage(t("tokenCost.failedUpdateRetry"));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(costs) !== JSON.stringify(originalCosts);

  const costItems = [
    {
      key: "ai_image_generation",
      label: t("tokenCost.aiImageGeneration"),
      description: t("tokenCost.aiImageGenerationDesc"),
      icon: "🤖",
    },
    {
      key: "order_placement",
      label: t("tokenCost.orderPlacement"),
      description: t("tokenCost.orderPlacementDesc"),
      icon: "📦",
    },
  ];

  return (
    <div style={{ padding: "24px", height: "100%", overflowY: "auto" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
            {t("tokenCost.title")}
          </h1>
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            {t("tokenCost.subtitle")}
          </p>
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
                padding: "0",
                color: "inherit",
                fontSize: "18px",
              }}
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Loader2 size={48} color="#667eea" style={{ margin: "0 auto 16px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: "16px", color: "#6b7280" }}>{t("tokenCost.loading")}</p>
          </div>
        ) : (
          <>
            {/* Cost Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "32px" }}>
              {costItems.map((item) => (
                <div
                  key={item.key}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: "2px solid #e5e7eb",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "16px" }}>
                    <span style={{ fontSize: "32px" }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                        {item.label}
                      </h3>
                      <p style={{ fontSize: "13px", color: "#6b7280", margin: "0" }}>
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Input */}
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                      {t("tokenCost.tokenCost")}
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="number"
                        min="0"
                        value={costs[item.key]}
                        onChange={(e) => handleChange(item.key, e.target.value)}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "16px",
                          fontWeight: "600",
                          outline: "none",
                          color: "#667eea",
                        }}
                      />
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          borderRadius: "6px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontWeight: "700",
                          fontSize: "18px",
                        }}
                      >
                        {costs[item.key]}
                      </div>
                    </div>
                    {costs[item.key] !== originalCosts[item.key] && (
                      <p style={{ fontSize: "11px", color: "#f59e0b", marginTop: "6px", margin: "6px 0 0 0" }}>
                        {t("tokenCost.changedFrom", { from: originalCosts[item.key], to: costs[item.key] })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div style={{ background: "#eff6ff", borderRadius: "12px", padding: "20px", marginBottom: "24px", border: "1px solid #bfdbfe" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e40af", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <DollarSign size={20} />
                {t("tokenCost.costSummary")}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {costItems.map((item) => (
                  <div key={item.key} style={{ fontSize: "13px", color: "#1e40af" }}>
                    <span style={{ fontWeight: "600" }}>{item.label}:</span>{" "}
                    <span style={{ fontSize: "18px", fontWeight: "700", color: "#667eea" }}>{costs[item.key]}</span> {t("buyTokens.tokens").toLowerCase()}
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: "flex", gap: "12px" }}>
              {hasChanges && (
                <button
                  onClick={() => {
                    setCosts(originalCosts);
                    setMessage("");
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {t("tokenCost.resetChanges")}
                </button>
              )}
              <button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                style={{
                  flex: hasChanges ? 0 : 1,
                  padding: "12px 24px",
                  background: hasChanges ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#d1d5db",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: hasChanges && !saving ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {saving ? (
                  <>
                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                    {t("settings.saving")}
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    {hasChanges ? t("settings.saveChanges") : t("tokenCost.noChanges")}
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div style={{ marginTop: "32px", padding: "16px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "8px" }}>
                💡 {t("tokenCost.howItWorks")}
              </h4>
              <ul style={{ fontSize: "13px", color: "#92400e", margin: "0", paddingLeft: "20px" }}>
                <li>{t("tokenCost.how1")}</li>
                <li>{t("tokenCost.how2")}</li>
                <li>{t("tokenCost.how3")}</li>
                <li>{t("tokenCost.how4")}</li>
              </ul>
            </div>
          </>
        )}
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

export default TokenCostManagementContent;

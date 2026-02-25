import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  Settings as SettingsIcon,
  Loader2,
  ShoppingCart,
  Save,
  Trash2,
  Plus,
  X,
  Search,
} from "lucide-react";
import { API_BASE_URL, buildImageUrl } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import { getTokenCosts } from '../../services/api';
import './NewDesignContent.css';

function NewDesignContent({ onTokenUpdate }) {
  const { t } = useTranslation();
  // Active tab state
  const [activeTab, setActiveTab] = useState(0);

  // Design state
  const [designId, setDesignId] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [normalImage, setNormalImage] = useState(null);
  const [embroideryPreview, setEmbroideryPreview] = useState(null);

  // Token Costs - Only AI generation and order placement
  const [tokenCosts, setTokenCosts] = useState({
    ai_image_generation: 2,
    order_placement: 1
  });

  // AI Generation fields
  const [aiPrompt, setAiPrompt] = useState("");

  // Machine Settings
  const [selectedMachineBrand, setSelectedMachineBrand] = useState("Brother");
  const [selectedFormat, setSelectedFormat] = useState("pes");
  const [embroiderySizeCm, setEmbroiderySizeCm] = useState(10);

  // Machine brands with their supported formats
  const machineBrands = {
    "Brother": { formats: ["pes", "pec"] },
    "Janome": { formats: ["jef", "sew"] },
    "Husqvarna": { formats: ["vip", "vp3", "hus"] },
    "Elna": { formats: ["jef", "exp"] },
    "Pfaff": { formats: ["vp3", "exp", "pes"] },
    "Tajima": { formats: ["dst", "jef", "exp"] },
    "Barudan": { formats: ["dsb", "dst", "exp"] },
    "Singer": { formats: ["xxx", "vip"] },
    "Babylock": { formats: ["pes", "dst"] },
    "Melco": { formats: ["exp", "dst"] },
    "Fortron": { formats: ["fdr"] },
    "Sunstar": { formats: ["stx"] },
    "Inbro": { formats: ["emt"] },
    "Compucon": { formats: ["cmd"] },
    "Happy": { formats: ["tap"] },
    "ZSK": { formats: ["dsz"] },
    "Bernina": { formats: ["pes", "exp"] }
  };

  const formatInfo = {
    "pes": "PES (Brother/Babylock)",
    "pec": "PEC (Brother)",
    "jef": "JEF (Janome/Elna)",
    "sew": "SEW (Janome)",
    "vip": "VIP (Husqvarna/Viking/Singer)",
    "vp3": "VP3 (Husqvarna/Pfaff)",
    "hus": "HUS (Husqvarna)",
    "exp": "EXP (Melco/Elna/Pfaff/Tajima)",
    "dst": "DST (Tajima/Barudan/Baby Lock/Melco)",
    "dsb": "DSB (Barudan)",
    "xxx": "XXX (Singer)",
    "fdr": "FDR (Fortron)",
    "stx": "STX (Sunstar)",
    "emt": "EMT (Inbro)",
    "cmd": "CMD (Compucon)",
    "tap": "TAP (Happy)",
    "dsz": "DSZ (ZSK)"
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load token costs and restore design state on component mount
  useEffect(() => {
    const loadTokenCosts = async () => {
      try {
        const data = await getTokenCosts();
        if (data && data.costs) {
          setTokenCosts(data.costs);
        }
      } catch (error) {
        console.error("Failed to load token costs:", error);
      }
    };
    
    const restoreDesignState = async () => {
      try {
        // Restore from localStorage if available
        const savedDesignId = localStorage.getItem("currentDesignId");
        const savedMachineBrand = localStorage.getItem("selectedMachineBrand");
        const savedFormat = localStorage.getItem("selectedFormat");
        const savedSize = localStorage.getItem("embroiderySizeCm");
        
        if (savedDesignId) {
          setDesignId(savedDesignId);
          
          // Fetch the design to restore images
          const response = await fetch(`${API_BASE_URL}/designs/${savedDesignId}/`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            const design = data.design || data;
            
            // Restore images
            if (design.embroidery_preview) {
              setEmbroideryPreview(buildImageUrl(design.embroidery_preview));
            }
            if (design.normal_image) {
              setNormalImage(buildImageUrl(design.normal_image));
            }
          }
        }
        
        if (savedMachineBrand) setSelectedMachineBrand(savedMachineBrand);
        if (savedFormat) setSelectedFormat(savedFormat);
        if (savedSize) setEmbroiderySizeCm(parseInt(savedSize));
      } catch (error) {
        console.error("Failed to restore design state:", error);
      }
    };
    
    loadTokenCosts();
    restoreDesignState();
  }, []);

  // Tab 1: Generate AI Image
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setMessage(t("newDesign.pleaseEnterPrompt"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/generate-ai-image/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design_id: designId || undefined,
          prompt: aiPrompt,
          machine_brand: selectedMachineBrand,
          requested_format: selectedFormat,
          embroidery_size_cm: embroiderySizeCm,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDesignId(data.design.id);
        
        // Save design state to localStorage
        localStorage.setItem("currentDesignId", data.design.id);
        localStorage.setItem("selectedMachineBrand", selectedMachineBrand);
        localStorage.setItem("selectedFormat", selectedFormat);
        localStorage.setItem("embroiderySizeCm", embroiderySizeCm);
        
        // Set embroidery preview (only image generated)
        if (data.design.embroidery_preview) {
          const embroideryUrl = buildImageUrl(data.design.embroidery_preview);
          setEmbroideryPreview(embroideryUrl);
        }
        
        if (onTokenUpdate) onTokenUpdate();
        setMessage(t("newDesign.generatedWithCost", { cost: tokenCosts.ai_image_generation }));
      } else {
        setMessage(`❌ ${data.error || t("newDesign.generationFailed")}`);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      setMessage(t("newDesign.generationFailedRetry"));
    } finally {
      setLoading(false);
    }
  };

  // Generate Embroidery Preview
  const handleGenerateEmbroideryPreview = async () => {
    if (!designId) {
      setMessage(t("newDesign.uploadOrGenerateFirst"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/generate-embroidery-preview/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design_id: designId,
        }),
      });

      const data = await response.json();
      
      console.log("🎨 Preview Response:", data);
      console.log("   embroidery_preview raw:", data.design?.embroidery_preview);

      if (response.ok && data.success) {
        const previewUrl = buildImageUrl(data.design.embroidery_preview);
        
        console.log("   embroidery_preview final:", previewUrl);
        setEmbroideryPreview(previewUrl);
        
        if (onTokenUpdate) onTokenUpdate();
        setMessage(t("newDesign.previewGenerated"));
      } else {
        setMessage(`❌ ${data.error || t("newDesign.previewGenerationFailed")}`);
      }
    } catch (error) {
      console.error("Preview generation error:", error);
      setMessage(t("newDesign.previewGenerationFailedRetry"));
    } finally {
      setLoading(false);
    }
  };

  // Save Design
  const handleSaveDesign = async () => {
    if (!designId) {
      setMessage(t("newDesign.noDesignToSave"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/${designId}/update/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "My Design",
          // Machine Settings
          machine_brand: selectedMachineBrand,
          requested_format: selectedFormat,
          // Embroidery Size
          embroidery_size_cm: embroiderySizeCm,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage(t("newDesign.designSaved"));
      } else {
        setMessage(`❌ ${data.error || t("newDesign.saveFailed")}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage(t("newDesign.saveFailedRetry"));
    } finally {
      setLoading(false);
    }
  };

  // Add to Cart
  const handleAddToCart = async () => {
    if (!designId) {
      setMessage(t("newDesign.noDesignToCart"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // Step 1: Save the current machine settings to the design
      const saveResponse = await fetch(`${API_BASE_URL}/designs/${designId}/update/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "My Design",
          // Machine Settings
          machine_brand: selectedMachineBrand,
          requested_format: selectedFormat,
          // Embroidery Size
          embroidery_size_cm: embroiderySizeCm,
        }),
      });

      const saveData = await saveResponse.json();
      
      if (!saveResponse.ok || !saveData.success) {
        setMessage(`❌ ${saveData.error || t("newDesign.failedSaveDesign")}`);
        setLoading(false);
        return;
      }

      // Step 2: Add to cart (now with saved machine settings)
      const response = await fetch(`${API_BASE_URL}/cart/add/${designId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (onTokenUpdate) onTokenUpdate();
        setMessage(t("newDesign.addedToCart"));
      } else {
        setMessage(`❌ ${data.error || t("newDesign.failedAddToCart")}`);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      setMessage(t("newDesign.failedAddToCartRetry"));
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDesignId(null);
    setUploadedImage(null);
    setNormalImage(null);
    setEmbroideryPreview(null);
    setAiPrompt("");
    setMessage(t("newDesign.canvasCleared"));
    
    // Clear localStorage
    localStorage.removeItem("currentDesignId");
    localStorage.removeItem("selectedMachineBrand");
    localStorage.removeItem("selectedFormat");
    localStorage.removeItem("embroiderySizeCm");
  };

  const tabs = [
    { id: 0, name: t("newDesign.tabGenerateWithAi"), icon: Sparkles },
    { id: 1, name: t("newDesign.tabMachineSettings"), icon: SettingsIcon },
  ];

  return (
    <>
      <LoadingOverlay visible={loading} text={t("newDesign.processing")}/>
      <div className="new-design-wrapper">
        {/* Canvas Area */}
        <div className="design-canvas-area">
          {/* Tab Navigation */}
        <div className="design-tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`design-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Canvas/Content Area */}
        <div className="design-content-area">
          {/* Tab Content */}
          {activeTab === 0 && (
            // Tab 1: Generate with AI
            <div style={{ width: "100%", maxWidth: "800px" }}>
              {embroideryPreview ? (
                <div>
                  <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "center" }}>
                      <img
                        src={embroideryPreview}
                        alt={t("newDesign.embroideryPreviewAlt")}
                        style={{
                          maxWidth: "350px",
                          maxHeight: "350px",
                          borderRadius: "10px",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                        }}
                      />
                      <p style={{ marginTop: "10px", color: "#6B7280", fontSize: "13px", fontWeight: "500" }}>
                        {t("newDesign.embroideryPreview")}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Sparkles size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
                    {t("newDesign.generateWithAi")}
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "8px" }}>
                    {t("newDesign.enterPrompt")}
                  </p>
                </div>
              )}
            </div>
          )}





          {activeTab === 1 && (
            // Tab 2: Machine Settings - Display embroidery preview from AI generation
            <div style={{ textAlign: "center", width: "100%", maxWidth: "800px" }}>
              {embroideryPreview ? (
                <>
                  <img
                    src={embroideryPreview}
                    alt="Embroidery preview"
                    style={{
                      width: "100%",
                      maxWidth: "400px",
                      borderRadius: "12px",
                      border: "2px solid #E5E7EB",
                      padding: "12px",
                      background: "#F9FAFB",
                    }}
                  />
                  <p style={{ color: "#6B7280", fontSize: "13px", marginTop: "12px" }}>
                    {t("newDesign.reviewAndConfigure")}
                  </p>
                </>
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <SettingsIcon size={48} color="#D1D5DB" style={{ margin: "0 auto 20px" }} />
                  <p style={{ color: "#9CA3AF", fontSize: "14px" }}>
                    {t("newDesign.generateFirstToPreview")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Bar */}
        {message && (
          <div className={`design-message-bar ${message.includes("❌") ? 'error' : message.includes("⚠️") ? 'warning' : 'success'}`}>
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
                color: "inherit",
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="design-right-panel">
        <div className="design-panel-content">
          {/* Tab 1: AI Generation Controls */}
          {activeTab === 0 && (
            <>
              <Section icon={Sparkles} title={t("newDesign.aiGeneration")}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  {t("newDesign.prompt")}
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t("newDesign.describePlaceholder")}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    fontFamily: "inherit",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                />





                <button
                  onClick={handleGenerateAI}
                  disabled={loading || !aiPrompt.trim()}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: loading || !aiPrompt.trim() ? "#93C5FD" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: loading || !aiPrompt.trim() ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {t("newDesign.generating")}
                    </>
                  ) : (normalImage && embroideryPreview) ? (
                    <>
                      <Sparkles size={16} />
                      {t("newDesign.retryWithTokens", { count: tokenCosts.ai_image_generation })}
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      {t("newDesign.generateWithTokens", { count: tokenCosts.ai_image_generation })}
                    </>
                  )}
                </button>
              </Section>
            </>
          )}

          {/* Tab 2: Advanced Settings Controls */}
          {activeTab === 1 && (
            <>
              <Section icon={SettingsIcon} title={t("newDesign.machineSettings")}>
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  {t("newDesign.machineBrand")}
                </label>
                <select
                  value={selectedMachineBrand}
                  onChange={(e) => {
                    setSelectedMachineBrand(e.target.value);
                    localStorage.setItem("selectedMachineBrand", e.target.value);
                    const formats = machineBrands[e.target.value].formats;
                    setSelectedFormat(formats[0]);
                    localStorage.setItem("selectedFormat", formats[0]);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {Object.keys(machineBrands).map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  {t("newDesign.fileFormat")}
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => {
                    setSelectedFormat(e.target.value);
                    localStorage.setItem("selectedFormat", e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "8px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {machineBrands[selectedMachineBrand].formats.map((format) => (
                    <option key={format} value={format}>
                      {formatInfo[format]}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "12px" }}>
                  {t("newDesign.selectFormatSupport", { brand: selectedMachineBrand })}
                </p>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>{t("newDesign.embroiderySize")}</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{t("newDesign.sizeCm", { size: embroiderySizeCm })}</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={embroiderySizeCm}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setEmbroiderySizeCm(size);
                    localStorage.setItem("embroiderySizeCm", size);
                  }}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
                <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "16px", fontStyle: "italic" }}>
                  {t("newDesign.sizeCostHint")}
                </p>
              </Section>
            </>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="design-panel-actions">
          <button
            onClick={handleSaveDesign}
            disabled={loading || !designId}
            className="design-action-btn primary"
          >
            <Save size={16} />
            {t("newDesign.saveDesign")}
          </button>

          {activeTab === 0 ? (
            // Tab 0: Generate with AI - Show Next button
            <button
              onClick={() => setActiveTab(1)}
              disabled={loading || !designId}
              className="design-action-btn gradient"
            >
              <SettingsIcon size={16} />
              {t("newDesign.next")}
            </button>
          ) : (
            // Tab 1: Machine Settings - Show Add to Cart button
            <button
              onClick={handleAddToCart}
              disabled={loading || !designId}
              className="design-action-btn gradient"
            >
              <ShoppingCart size={16} />
              {t("newDesign.addToCart")}
            </button>
          )}

          <div className="design-action-buttons-row">
            <button
              onClick={handleClear}
              disabled={loading}
              className="design-action-btn secondary"
            >
              <Trash2 size={14} />
              {t("newDesign.clear")}
            </button>
          </div>
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
    </>
  );
}

// Helper Components
function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <Icon size={16} color="#6B7280" />
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Input({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        fontSize: "13px",
        marginBottom: "12px",
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

function InfoText({ children }) {
  return (
    <p style={{ fontSize: "12px", color: "#6B7280", margin: "8px 0" }}>
      {children}
    </p>
  );
}

function SettingRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>{label}</label>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: "44px",
        height: "24px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: checked ? "#667eea" : "#D1D5DB",
          transition: "0.3s",
          borderRadius: "24px",
        }}
      >
        <span
          style={{
            position: "absolute",
            height: "18px",
            width: "18px",
            left: checked ? "23px" : "3px",
            bottom: "3px",
            background: "white",
            transition: "0.3s",
            borderRadius: "50%",
          }}
        />
      </span>
    </label>
  );
}

export default NewDesignContent;

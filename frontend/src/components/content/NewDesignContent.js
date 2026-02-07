import React, { useState, useRef, useEffect } from "react";
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

  // Advanced Settings
  const [stitchDensity, setStitchDensity] = useState(5);
  const [stitchType, setStitchType] = useState("Satin");
  const [designWidth, setDesignWidth] = useState(100);
  const [designHeight, setDesignHeight] = useState(100);
  const [hoopSize, setHoopSize] = useState("100x100mm");
  const [rotation, setRotation] = useState(0);
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [underlay, setUnderlay] = useState(true);
  const [jumpTrim, setJumpTrim] = useState(true);
  const [embroiderySizeCm, setEmbroiderySizeCm] = useState(10);


  const stitchTypes = ["Satin", "Fill", "Running", "Bean"];
  const hoopSizes = ["100x100mm", "130x180mm", "200x200mm", "Custom"];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Load token costs on component mount
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
    loadTokenCosts();
  }, []);

  // Tab 1: Generate AI Image
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setMessage("❌ Please enter a prompt");
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
          // EMBROIDERY SETTINGS - FULL DETAILS
          stitch_density: stitchDensity,
          stitch_type: stitchType,
          auto_trim: true,
          underlay: underlay,
          jump_trim: jumpTrim,
          // CANVAS SETTINGS
          canvas_width: 1200,
          canvas_height: 1200,
          design_width: designWidth,
          design_height: designHeight,
          hoop_size: hoopSize,
          rotation: rotation,
          mirror_horizontal: mirrorH,
          mirror_vertical: mirrorV,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDesignId(data.design.id);
        
        // Handle normal_image URL
        const normalImageUrl = buildImageUrl(data.design.normal_image);
        setNormalImage(normalImageUrl);
        
        // Also set embroidery preview if it was generated
        if (data.design.embroidery_preview) {
          const embroideryUrl = buildImageUrl(data.design.embroidery_preview);
          setEmbroideryPreview(embroideryUrl);
        }
        
        if (onTokenUpdate) onTokenUpdate();
        setMessage(`✅ AI images generated! Both normal and embroidery preview created. Cost: ${tokenCosts.ai_image_generation} tokens`);
      } else {
        setMessage(`❌ ${data.error || "Generation failed"}`);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      setMessage("❌ Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Embroidery Preview
  const handleGenerateEmbroideryPreview = async () => {
    if (!designId) {
      setMessage("❌ Upload or generate an image first");
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
        setMessage(`✅ Embroidery preview generated!`);
      } else {
        setMessage(`❌ ${data.error || "Preview generation failed"}`);
      }
    } catch (error) {
      console.error("Preview generation error:", error);
      setMessage("❌ Preview generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save Design
  const handleSaveDesign = async () => {
    if (!designId) {
      setMessage("⚠️ No design to save");
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
          // Embroidery Settings
          stitch_type: stitchType,
          stitch_density: stitchDensity,
          auto_trim: true,
          underlay: underlay,
          jump_trim: jumpTrim,
          // Canvas/Design Settings
          design_width: designWidth,
          design_height: designHeight,
          hoop_size: hoopSize,
          rotation: rotation,
          mirror_horizontal: mirrorH,
          mirror_vertical: mirrorV,
          // Embroidery Size
          embroidery_size_cm: embroiderySizeCm,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("✅ Design saved successfully!");
      } else {
        setMessage(`❌ ${data.error || "Save failed"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage("❌ Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add to Cart
  const handleAddToCart = async () => {
    if (!designId) {
      setMessage("⚠️ No design to add to cart");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
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
        setMessage(`✅ Added to cart!`);
      } else {
        setMessage(`❌ ${data.error || "Failed to add to cart"}`);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      setMessage("❌ Failed to add to cart. Please try again.");
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
    setMessage("✅ Canvas cleared");
  };

  const tabs = [
    { id: 0, name: "Generate with AI", icon: Sparkles },
    { id: 1, name: "Advanced Settings", icon: SettingsIcon },
  ];

  return (
    <>
      <LoadingOverlay visible={loading} text="Processing your design..." />
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
              {normalImage || embroideryPreview ? (
                <div>
                  <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                    {normalImage && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={normalImage}
                          alt="Normal"
                          style={{
                            maxWidth: "350px",
                            maxHeight: "350px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        />
                        <p style={{ marginTop: "10px", color: "#6B7280", fontSize: "13px", fontWeight: "500" }}>
                          Normal Image
                        </p>
                      </div>
                    )}
                    {embroideryPreview && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={embroideryPreview}
                          alt="Embroidery Preview"
                          style={{
                            maxWidth: "350px",
                            maxHeight: "350px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        />
                        <p style={{ marginTop: "10px", color: "#6B7280", fontSize: "13px", fontWeight: "500" }}>
                          Embroidery Preview
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Sparkles size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
                    Generate with AI
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "8px" }}>
                    Enter your prompt to generate an image
                  </p>
                </div>
              )}
            </div>
          )}





          {activeTab === 1 && (
            // Tab 2: Advanced Settings
            <div style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
              <SettingsIcon size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                Advanced Settings
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>
                Configure detailed embroidery parameters
              </p>
              <div style={{ marginTop: "20px", textAlign: "left" }}>
                <SettingRow label="Stitch Type" value={stitchType} />
                <SettingRow label="Stitch Density" value={`${stitchDensity} stitches/inch`} />
                <SettingRow label="Dimensions" value={`${designWidth} × ${designHeight} mm`} />
                <SettingRow label="Hoop Size" value={hoopSize} />
                <SettingRow label="Rotation" value={`${rotation}°`} />
                <SettingRow label="Mirror H/V" value={`${mirrorH ? "✓" : "✗"} / ${mirrorV ? "✓" : "✗"}`} />
                <SettingRow label="Underlay" value={underlay ? "Enabled" : "Disabled"} />
                <SettingRow label="Jump Trim" value={jumpTrim ? "Enabled" : "Disabled"} />
              </div>
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
              <Section icon={Sparkles} title="AI Generation">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Prompt
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
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
                      Generating...
                    </>
                  ) : (normalImage && embroideryPreview) ? (
                    <>
                      <Sparkles size={16} />
                      Retry ({tokenCosts.ai_image_generation} Tokens)
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate ({tokenCosts.ai_image_generation} Tokens)
                    </>
                  )}
                </button>
              </Section>
            </>
          )}

          {/* Tab 2: Advanced Settings Controls */}
          {activeTab === 1 && (
            <>
              <Section icon={SettingsIcon} title="Stitch Configuration">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Stitch Type
                </label>
                <select
                  value={stitchType}
                  onChange={(e) => setStitchType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {stitchTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

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
                  <span>Stitch Density</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{stitchDensity} stitches/inch</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={stitchDensity}
                  onChange={(e) => setStitchDensity(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
              </Section>

              <Section icon={SettingsIcon} title="Design Dimensions">
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={designWidth}
                      onChange={(e) => setDesignWidth(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={designHeight}
                      onChange={(e) => setDesignHeight(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Hoop Size
                </label>
                <select
                  value={hoopSize}
                  onChange={(e) => setHoopSize(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {hoopSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

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
                  <span>Embroidery Size</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{embroiderySizeCm} cm</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={embroiderySizeCm}
                  onChange={(e) => setEmbroiderySizeCm(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
                <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "16px", fontStyle: "italic" }}>
                  Affects the cost of embroidery. Larger sizes cost more tokens.
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
                  <span>Rotation</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{rotation}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
              </Section>

              <Section icon={SettingsIcon} title="Additional Options">
                <ToggleRow label="Mirror Horizontal" checked={mirrorH} onChange={setMirrorH} />
                <ToggleRow label="Mirror Vertical" checked={mirrorV} onChange={setMirrorV} />
                <ToggleRow label="Underlay" checked={underlay} onChange={setUnderlay} />
                <ToggleRow label="Jump Stitch Trimming" checked={jumpTrim} onChange={setJumpTrim} />
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
            Save Design
          </button>

          <button
            onClick={handleAddToCart}
            disabled={loading || !designId}
            className="design-action-btn gradient"
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>

          <div className="design-action-buttons-row">
            <button
              onClick={handleClear}
              disabled={loading}
              className="design-action-btn secondary"
            >
              <Trash2 size={14} />
              Clear
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

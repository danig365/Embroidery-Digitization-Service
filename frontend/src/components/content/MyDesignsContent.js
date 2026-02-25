import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  Grid3x3,
  List,
  Trash2,
  Eye,
  Loader2,
  Calendar,
  Image as ImageIcon,
  X,
  ShoppingCart,
} from "lucide-react";
import { API_BASE_URL, buildImageUrl } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import './MyDesignsContent.css';

function MyDesignsContent({ onCartUpdate }) {
  const { t, i18n } = useTranslation();
  const [designs, setDesigns] = useState([]);
  const [filteredDesigns, setFilteredDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [designToDelete, setDesignToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [designToView, setDesignToView] = useState(null);

  const statusConfig = {
    draft: { label: t("myDesigns.status.draft"), color: "#6b7280", bg: "#f3f4f6" },
    ready: { label: t("myDesigns.status.ready"), color: "#2563eb", bg: "#dbeafe" },
    processing: { label: t("myDesigns.status.processing"), color: "#f59e0b", bg: "#fef3c7" },
    completed: { label: t("myDesigns.status.completed"), color: "#059669", bg: "#d1fae5" },
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  useEffect(() => {
    filterDesigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, searchQuery, statusFilter]);

  const loadDesigns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/designs/list/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setDesigns(data.designs);
      } else {
        setMessage(`❌ ${data.error || t("myDesigns.failedLoad")}`);
      }
    } catch (error) {
      setMessage(t("myDesigns.failedLoadRetry"));
    } finally {
      setLoading(false);
    }
  };

  const filterDesigns = () => {
    let filtered = [...designs];

    if (statusFilter !== "all") {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.prompt?.toLowerCase().includes(query) ||
          d.text_content?.toLowerCase().includes(query)
      );
    }

    setFilteredDesigns(filtered);
  };

  const handleView = (design) => {
    setDesignToView(design);
    setShowViewModal(true);
  };

  const handleDeleteClick = (design) => {
    setDesignToDelete(design);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!designToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/designs/${designToDelete.id}/delete/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setMessage(t("myDesigns.deletedSuccess"));
        setDesigns(designs.filter((d) => d.id !== designToDelete.id));
        setShowDeleteModal(false);
        setDesignToDelete(null);
      } else {
        setMessage(`❌ ${data.error || t("myDesigns.failedDelete")}`);
      }
    } catch (error) {
      setMessage(t("myDesigns.failedDeleteRetry"));
    } finally {
      setDeleting(false);
    }
  };

  const handleAddToCart = async (design) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/add/${design.id}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`✅ ${data.message}`);
        if (onCartUpdate) onCartUpdate();
      } else {
        setMessage(`❌ ${data.error || t("myDesigns.failedAddToCart")}`);
      }
    } catch (error) {
      setMessage(t("myDesigns.failedAddToCartRetry"));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language.startsWith("fr") ? "fr-FR" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const DesignCard = ({ design }) => {
    const status = statusConfig[design.status] || statusConfig.draft;

    return (
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          transition: "all 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
          e.currentTarget.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <div
          onClick={() => handleView(design)}
          style={{
            height: viewMode === "grid" ? "200px" : "120px",
            background: "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {design.normal_image || design.embroidery_preview ? (
            <img
              src={design.embroidery_preview || design.normal_image}
              alt={design.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <ImageIcon size={48} style={{ color: "#d1d5db" }} />
          )}

          <div
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              padding: "6px 12px",
              background: status.bg,
              color: status.color,
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {status.label}
          </div>

          <div
            style={{
              position: "absolute",
              top: "12px",
              left: "12px",
              padding: "6px 10px",
              background: "rgba(0, 0, 0, 0.7)",
              color: "white",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: "600",
            }}
          >
            {design.status === "completed" ? "2" : "0"}Ƭ
          </div>
        </div>

        <div style={{ padding: "16px" }}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "8px",
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {design.name}
          </h3>

          {design.prompt && (
            <p
              style={{
                fontSize: "13px",
                color: "#6b7280",
                marginBottom: "12px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {design.prompt}
            </p>
          )}

          <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
            <Calendar size={14} style={{ marginRight: "6px", color: "#9ca3af" }} />
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>
              {formatDate(design.created_at)}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <ActionButton icon={Eye} onClick={() => handleView(design)} title={t("myDesigns.view")} />
            <ActionButton
              icon={ShoppingCart}
              onClick={() => handleAddToCart(design)}
              title={t("myDesigns.addToCart")}
              cart
            />
            <ActionButton
              icon={Trash2}
              onClick={() => handleDeleteClick(design)}
              title={t("myDesigns.delete")}
              danger
            />
          </div>
        </div>
      </div>
    );
  };

  const ActionButton = ({ icon: Icon, onClick, title, danger, cart }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        padding: "8px",
        background: danger ? "#fef2f2" : cart ? "#eff6ff" : "#f3f4f6",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: danger ? "#dc2626" : cart ? "#2563eb" : "#374151",
      }}
      title={title}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <>
      <LoadingOverlay visible={loading} text={t("myDesigns.loading") } />
      <div style={{ padding: "24px", height: "100%", overflowY: "auto", background: "#F9FAFB" }}>
        {/* Controls */}
        <div
          style={{
            display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: "250px", maxWidth: "400px" }}>
          <Search
            size={18}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}
          />
          <input
            type="text"
              placeholder={t("myDesigns.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "14px",
              cursor: "pointer",
              background: "white",
            }}
          >
            <option value="all">{t("myDesigns.allStatus")}</option>
            <option value="draft">{t("myDesigns.status.draft")}</option>
            <option value="ready">{t("myDesigns.status.ready")}</option>
            <option value="processing">{t("myDesigns.status.processing")}</option>
            <option value="completed">{t("myDesigns.status.completed")}</option>
          </select>

          {/* View Mode */}
          <div style={{ display: "flex", gap: "4px", background: "#f3f4f6", padding: "4px", borderRadius: "8px" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "8px 12px",
                background: viewMode === "grid" ? "white" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                color: viewMode === "grid" ? "#111827" : "#6b7280",
                boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "8px 12px",
                background: viewMode === "list" ? "white" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                color: viewMode === "list" ? "#111827" : "#6b7280",
                boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            background: message.includes("❌")
              ? "#fee2e2"
              : message.includes("📋")
              ? "#fef3c7"
              : "#d1fae5",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: message.includes("❌") ? "#991b1b" : message.includes("📋") ? "#92400e" : "#065f46",
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
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Designs Grid/List */}
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
          <Loader2 size={40} color="#3b82f6" className="spin" />
        </div>
      ) : filteredDesigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#6b7280" }}>
          <ImageIcon size={64} style={{ margin: "0 auto 20px", opacity: 0.3 }} />
          <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "8px" }}>{t("myDesigns.noneFound")}</h3>
          <p style={{ fontSize: "14px" }}>
            {searchQuery || statusFilter !== "all"
              ? t("myDesigns.tryAdjustFilters")
              : t("myDesigns.createFirst")}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr",
            gap: "20px",
          }}
        >
          {filteredDesigns.map((design) => (
            <DesignCard key={design.id} design={design} />
          ))}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && designToView && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setShowViewModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "900px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "8px" }}>
                  {designToView.name}
                </h2>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      background: statusConfig[designToView.status]?.bg || "#f3f4f6",
                      color: statusConfig[designToView.status]?.color || "#6b7280",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    {statusConfig[designToView.status]?.label || t("myDesigns.status.draft")}
                  </span>
                  <span style={{ fontSize: "13px", color: "#9ca3af" }}>
                    {formatDate(designToView.created_at)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "28px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: 0,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              {/* Images */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: designToView.embroidery_preview && designToView.normal_image ? "1fr 1fr" : "1fr",
                    gap: "16px",
                  }}
                >
                  {designToView.normal_image && (
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.normalImage")}
                      </label>
                      <img
                        src={designToView.normal_image}
                        alt="Normal"
                        style={{
                          width: "100%",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>
                  )}
                  {designToView.embroidery_preview && (
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.embroideryPreview")}
                      </label>
                      <img
                        src={designToView.embroidery_preview}
                        alt="Embroidery Preview"
                        style={{
                          width: "100%",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>
                  )}
                  {designToView.uploaded_image && !designToView.normal_image && !designToView.embroidery_preview && (
                    <div>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.uploadedImage")}
                      </label>
                      <img
                        src={designToView.uploaded_image}
                        alt="Uploaded"
                        style={{
                          width: "100%",
                          borderRadius: "12px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                {/* Left Column */}
                <div>
                  {designToView.prompt && (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.aiPrompt")}
                      </label>
                      <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: "1.6" }}>
                        {designToView.prompt}
                      </p>
                    </div>
                  )}
                  {designToView.text_content && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "8px" }}>
                        📝 Text Layer
                      </label>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500", marginBottom: "8px", whiteSpace: "pre-wrap" }}>
                        "{designToView.text_content}"
                      </p>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        {designToView.text_font && (
                          <div>
                            <span style={{ color: "#92400e", fontWeight: "600" }}>Font:</span>
                            <div style={{ color: "#111827" }}>{designToView.text_font}</div>
                          </div>
                        )}
                        {designToView.text_style && (
                          <div>
                            <span style={{ color: "#92400e", fontWeight: "600" }}>Style:</span>
                            <div style={{ color: "#111827" }}>{designToView.text_style}</div>
                          </div>
                        )}
                        {designToView.text_size && (
                          <div>
                            <span style={{ color: "#92400e", fontWeight: "600" }}>Size:</span>
                            <div style={{ color: "#111827" }}>{designToView.text_size}px</div>
                          </div>
                        )}
                        {designToView.text_color && (
                          <div>
                            <span style={{ color: "#92400e", fontWeight: "600" }}>Color:</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <div style={{ width: "16px", height: "16px", background: designToView.text_color, borderRadius: "3px", border: "1px solid #ddd" }} />
                              <span style={{ color: "#111827" }}>{designToView.text_color}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {designToView.thread_colors && designToView.thread_colors.length > 0 && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "#f3e8ff", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#6b21a8", marginBottom: "8px" }}>
                        🧵 Thread Colors ({designToView.thread_colors.length})
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "8px" }}>
                        {designToView.thread_colors.map((color, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "6px",
                              padding: "8px",
                              background: "white",
                              borderRadius: "6px",
                              border: "1px solid #d8b4fe",
                            }}
                          >
                            <div
                              style={{
                                width: "40px",
                                height: "40px",
                                background: color.hex || color,
                                borderRadius: "4px",
                                border: "2px solid #d8b4fe",
                              }}
                            />
                            <div style={{ fontSize: "11px", textAlign: "center", color: "#111827", fontWeight: "500" }}>
                              {color.name || "Color"}
                            </div>
                            {color.code && (
                              <div style={{ fontSize: "10px", color: "#6b7280" }}>
                                {color.code}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      {designToView.thread_notes && (
                        <div style={{ marginTop: "8px", padding: "8px", background: "#faf5ff", borderRadius: "4px", fontSize: "12px", color: "#6b21a8" }}>
                          <strong>Notes:</strong> {designToView.thread_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div>
                  {(designToView.stitch_density || designToView.stitch_type || designToView.auto_trim !== undefined) && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#1e40af", marginBottom: "8px" }}>
                        ⚙️ Embroidery Settings
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        {designToView.stitch_density && (
                          <div>
                            <span style={{ color: "#1e40af", fontWeight: "600" }}>Density:</span>
                            <div style={{ color: "#111827" }}>Level {designToView.stitch_density}</div>
                          </div>
                        )}
                        {designToView.stitch_type && (
                          <div>
                            <span style={{ color: "#1e40af", fontWeight: "600" }}>Type:</span>
                            <div style={{ color: "#111827" }}>{designToView.stitch_type}</div>
                          </div>
                        )}
                        {designToView.auto_trim !== undefined && (
                          <div>
                            <span style={{ color: "#1e40af", fontWeight: "600" }}>Auto Trim:</span>
                            <div style={{ color: "#111827" }}>{designToView.auto_trim ? "✓ On" : "✗ Off"}</div>
                          </div>
                        )}
                        {designToView.underlay !== undefined && (
                          <div>
                            <span style={{ color: "#1e40af", fontWeight: "600" }}>Underlay:</span>
                            <div style={{ color: "#111827" }}>{designToView.underlay ? "✓ Yes" : "✗ No"}</div>
                          </div>
                        )}
                        {designToView.jump_trim !== undefined && (
                          <div>
                            <span style={{ color: "#1e40af", fontWeight: "600" }}>Jump Trim:</span>
                            <div style={{ color: "#111827" }}>{designToView.jump_trim ? "✓ Yes" : "✗ No"}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {(designToView.design_width || designToView.design_height || designToView.hoop_size || designToView.canvas_width) && (
                    <div style={{ marginBottom: "16px", padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#166534", marginBottom: "8px" }}>
                        📐 Design Dimensions
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
                        {designToView.design_width && designToView.design_height && (
                          <div>
                            <span style={{ color: "#166534", fontWeight: "600" }}>Size (mm):</span>
                            <div style={{ color: "#111827" }}>
                              {designToView.design_width} × {designToView.design_height}
                            </div>
                          </div>
                        )}
                        {designToView.hoop_size && (
                          <div>
                            <span style={{ color: "#166534", fontWeight: "600" }}>Hoop:</span>
                            <div style={{ color: "#111827" }}>{designToView.hoop_size}</div>
                          </div>
                        )}
                        {designToView.canvas_width && designToView.canvas_height && (
                          <div>
                            <span style={{ color: "#166534", fontWeight: "600" }}>Canvas (px):</span>
                            <div style={{ color: "#111827" }}>
                              {designToView.canvas_width} × {designToView.canvas_height}
                            </div>
                          </div>
                        )}
                        {designToView.rotation !== undefined && designToView.rotation !== 0 && (
                          <div>
                            <span style={{ color: "#166534", fontWeight: "600" }}>Rotation:</span>
                            <div style={{ color: "#111827" }}>{designToView.rotation}°</div>
                          </div>
                        )}
                        {(designToView.mirror_horizontal || designToView.mirror_vertical) && (
                          <div>
                            <span style={{ color: "#166534", fontWeight: "600" }}>Mirrored:</span>
                            <div style={{ color: "#111827" }}>
                              {designToView.mirror_horizontal ? "H " : ""}{designToView.mirror_vertical ? "V" : ""}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {designToView.style && (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.style")}
                      </label>
                      <p style={{ fontSize: "14px", color: "#6b7280" }}>{designToView.style}</p>
                    </div>
                  )}
                  {designToView.tokens_used > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                        {t("myDesigns.tokensUsed")}
                      </label>
                      <p style={{ fontSize: "14px", color: "#6b7280" }}>{designToView.tokens_used} {t("buyTokens.tokens")}</p>
                    </div>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "400px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "12px" }}>{t("myDesigns.deleteDesign")}</h3>
            <p style={{ color: "#6b7280", marginBottom: "20px" }}>
              {t("myDesigns.deleteConfirm", { name: designToDelete?.name })}
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  background: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: "500",
                }}
              >
                {t("myDesigns.cancel")}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{
                  padding: "10px 20px",
                  background: deleting ? "#fca5a5" : "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    {t("myDesigns.deleting")}
                  </>
                ) : (
                  t("myDesigns.delete")
                )}
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
    </div>
    </>
  );
}
export default MyDesignsContent;

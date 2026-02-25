import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  Search,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
  X,
  Package,
  MessageCircle,
  FileText,
  FolderOpen,
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import './ContentStyles.css';

function OrdersContent({ onChatClick }) {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [downloadingFile, setDownloadingFile] = useState(null);
  const [orderResources, setOrderResources] = useState({});
  const [downloadingResource, setDownloadingResource] = useState(null);

  const statusConfig = {
    pending_payment: {
      label: t("orders.status.pending_payment"),
      icon: Clock,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    processing: {
      label: t("orders.status.processing"),
      icon: RefreshCw,
      color: "#3b82f6",
      bg: "#dbeafe",
    },
    completed: {
      label: t("orders.status.completed"),
      icon: CheckCircle,
      color: "#059669",
      bg: "#d1fae5",
    },
    failed: { label: t("orders.status.failed"), icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
    cancelled: {
      label: t("orders.status.cancelled"),
      icon: XCircle,
      color: "#6b7280",
      bg: "#f3f4f6",
    },
  };

  const formats = [
    // Industrial
    { code: "dst", name: "DST", description: "Tajima" },
    { code: "dsb", name: "DSB", description: "Barudan" },
    { code: "dsz", name: "DSZ", description: "ZSK" },
    { code: "exp", name: "EXP", description: "Melco" },
    { code: "tbf", name: "TBF", description: "Barudan" },
    { code: "fdr", name: "FDR", description: "Fortron" },
    { code: "stx", name: "STX", description: "Sunstar" },
    // Domestic
    { code: "pes", name: "PES", description: "Brother / Babylock" },
    { code: "pec", name: "PEC", description: "Brother" },
    { code: "jef", name: "JEF", description: "Janome / Elna" },
    { code: "sew", name: "SEW", description: "Janome" },
    { code: "hus", name: "HUS", description: "Husqvarna" },
    { code: "vip", name: "VIP", description: "Husqvarna / Viking" },
    { code: "vp3", name: "VP3", description: "Husqvarna / Pfaff" },
    { code: "xxx", name: "XXX", description: "Singer" },
    // Commercial
    { code: "cmd", name: "CMD", description: "Compucon" },
    { code: "tap", name: "TAP", description: "Happy" },
    { code: "tim", name: "TIM", description: "Tajima" },
    { code: "emt", name: "EMT", description: "Inbro" },
    { code: "10o", name: "10O", description: "Barudan" },
    { code: "ds9", name: "DS9", description: "Tajima" },
  ];

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, searchQuery, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/orders/list/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setMessage(`❌ ${data.error || t("orders.failedLoad")}`);
      }
    } catch (error) {
      setMessage(t("orders.failedLoadRetry"));
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (statusFilter !== "all") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(query) ||
          o.design?.name.toLowerCase().includes(query)
      );
    }

    setFilteredOrders(filtered);
  };

  const handleDownload = async (orderId, format) => {
    setDownloadingFile(`${orderId}-${format}`);
    setMessage(t("orders.downloading", { format: format.toUpperCase() }));

    try {
      const response = await fetch(
        `${API_BASE_URL}/orders/${orderId}/download/${format}/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `embroidery_${orderId}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage(t("orders.downloaded", { format: format.toUpperCase() }));
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error || t("orders.downloadFailed")}`);
      }
    } catch (error) {
      setMessage(t("orders.downloadFailedRetry"));
    } finally {
      setDownloadingFile(null);
    }
  };

  const loadOrderResources = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/resources/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setOrderResources(prev => ({ ...prev, [orderId]: data.resources || [] }));
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    }
  };

  const handleDownloadResource = async (resourceId, fileName) => {
    setDownloadingResource(resourceId);
    try {
      const response = await fetch(`${API_BASE_URL}/resources/${resourceId}/download/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage(t("orders.resourceDownloaded", { fileName }));
      } else {
        setMessage(t("orders.resourceDownloadFailed"));
      }
    } catch (error) {
      setMessage(t("orders.resourceDownloadFailed"));
    } finally {
      setDownloadingResource(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language.startsWith("fr") ? "fr-FR" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const OrderCard = ({ order }) => {
    const status = statusConfig[order.status] || statusConfig.processing;
    const StatusIcon = status.icon;

    return (
      <div className="order-item">
        {/* Header */}
        <div className="order-header">
          <div>
            <h3 className="order-id">
              {t("orders.orderNumber", { number: order.order_number })}
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "4px",
              }}
            >
              <Calendar size={12} />
              {formatDate(order.created_at)}
            </div>
          </div>

          <div
            className="order-status"
            style={{
              background: status.bg,
              color: status.color,
            }}
          >
            <StatusIcon size={14} />
            <span>{status.label}</span>
          </div>
        </div>

        {/* Design Info */}
        {order.design_details && (
          <div
            style={{
              padding: "10px",
              background: "#f9fafb",
              borderRadius: "8px",
              marginBottom: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {order.design_preview && (
              <img
                src={order.design_preview}
                alt={order.design_name}
                style={{
                  width: "100%",
                  height: "80px",
                  borderRadius: "8px",
                  objectFit: "cover",
                  border: "2px solid #e5e7eb",
                }}
              />
            )}
            <div>
              <h4 style={{ fontSize: "12px", fontWeight: "600", marginBottom: "3px", color: "#111827" }}>
                {order.design_name}
              </h4>
              {order.design_details?.prompt && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#6b7280",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    margin: 0,
                  }}
                >
                  {order.design_details.prompt}
                </p>
              )}
              {/* Machine Settings */}
              {(order.design_details?.machine_brand || order.design_details?.requested_format) && (
                <div style={{ marginTop: "6px", fontSize: "11px", color: "#6b7280" }}>
                  <div>🤖 {t("orders.machine")}: {order.design_details?.machine_brand || t("orders.notSpecified")}</div>
                  <div>📁 {t("orders.format")}: {order.design_details?.requested_format?.toUpperCase() || t("orders.notSpecified")}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Downloads */}
        {order.status === "completed" && (
          <div className="order-files">
            <h4 className="order-files-title">
              {t("orders.downloadFormats")}
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "8px",
              }}
            >
              {/* Filter formats to only show requested ones */}
              {formats.filter(format => (order.requested_formats || ['dst', 'pes', 'jef']).includes(format.code)).map((format) => (
                <button
                  key={format.code}
                  onClick={() => handleDownload(order.id, format.code)}
                  disabled={downloadingFile === `${order.id}-${format.code}`}
                  className="order-file-btn"
                  style={{
                    background:
                      downloadingFile === `${order.id}-${format.code}`
                        ? "#f3f4f6"
                        : "white",
                  }}
                  onMouseEnter={(e) => {
                    if (downloadingFile !== `${order.id}-${format.code}`) {
                      e.currentTarget.style.background = "#eff6ff";
                      e.currentTarget.style.borderColor = "#3b82f6";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (downloadingFile !== `${order.id}-${format.code}`) {
                      e.currentTarget.style.background = "white";
                      e.currentTarget.style.borderColor = "#3b82f6";
                    }
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      width: "100%",
                    }}
                  >
                    {downloadingFile === `${order.id}-${format.code}` ? (
                      <Loader2 size={12} className="spin" />
                    ) : (
                      <Download size={12} />
                    )}
                    <span style={{ fontWeight: "600", fontSize: "11px" }}>
                      .{format.code.toUpperCase()}
                    </span>
                    <span style={{ fontSize: "10px", color: "#6b7280" }}>
                      ({format.description})
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Extra Resources */}
        {order.status === "completed" && (
          <ResourcesSection orderId={order.id} />
        )}

        {/* Order Info */}
        <div
          style={{
            marginTop: "10px",
            paddingTop: "10px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
            color: "#6b7280",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span>{t("orders.tokensUsed")}</span>
            <span style={{ fontWeight: "600", color: "#667eea", fontSize: "13px" }}>
              {order.tokens_used || 0} {t("buyTokens.tokens")}
            </span>
          </div>
          <button
            onClick={() => onChatClick && onChatClick(order.id)}
            style={{
              padding: "6px 12px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <MessageCircle size={14} />
            {t("orders.chat")}
          </button>
        </div>
      </div>
    );
  };

  const ResourcesSection = ({ orderId }) => {
    const [resources, setResources] = useState([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
      const fetchResources = async () => {
        try {
          const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/resources/`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          });
          const data = await response.json();
          if (data.success && data.resources && data.resources.length > 0) {
            setResources(data.resources);
          }
        } catch (error) {
          // silently fail
        } finally {
          setLoaded(true);
        }
      };
      fetchResources();
    }, [orderId]);

    if (!loaded || resources.length === 0) return null;

    return (
      <div style={{ marginTop: "10px", padding: "10px", background: "#fff7ed", borderRadius: "8px", border: "1px solid #fed7aa" }}>
        <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#92400e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
          <FolderOpen size={14} />
          {t("orders.extraResources", { count: resources.length })}
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {resources.map((resource) => (
            <button
              key={resource.id}
              onClick={() => handleDownloadResource(resource.id, resource.original_name)}
              disabled={downloadingResource === resource.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                background: "white",
                border: "1px solid #fed7aa",
                borderRadius: "6px",
                cursor: downloadingResource === resource.id ? "not-allowed" : "pointer",
                width: "100%",
                textAlign: "left",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#fff7ed"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "white"; }}
            >
              {downloadingResource === resource.id ? (
                <Loader2 size={14} className="spin" style={{ flexShrink: 0, color: "#d97706" }} />
              ) : (
                <FileText size={14} style={{ flexShrink: 0, color: "#d97706" }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: "500", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {resource.original_name}
                </div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>
                  {formatFileSize(resource.file_size)}
                  {resource.description && ` • ${resource.description}`}
                </div>
              </div>
              <Download size={12} style={{ flexShrink: 0, color: "#d97706" }} />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="content-header">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <Package size={20} color="#111827" />
          <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 }}>
            {t("orders.title")}
          </h1>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder={t("orders.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 10px 10px 36px",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "12px",
                outline: "none",
                background: "white",
                transition: "all 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#3b82f6";
                e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "10px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "12px",
              cursor: "pointer",
              background: "white",
              fontWeight: "500",
              color: "#374151",
              transition: "all 0.2s",
              width: "100%",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#3b82f6";
              e.target.style.boxShadow = "0 0 0 3px rgba(59, 130, 246, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e5e7eb";
              e.target.style.boxShadow = "none";
            }}
          >
            <option value="all">{t("orders.allStatus")}</option>
            <option value="pending_payment">{t("orders.status.pending_payment")}</option>
            <option value="processing">{t("orders.status.processing")}</option>
            <option value="completed">{t("orders.status.completed")}</option>
            <option value="failed">{t("orders.status.failed")}</option>
            <option value="cancelled">{t("orders.status.cancelled")}</option>
          </select>
        </div>
      </div>

      <div className="content-main">
        {message && (
          <div
            style={{
              padding: "10px 12px",
              background: message.includes("❌")
                ? "#fee2e2"
                : message.includes("⬇️")
                ? "#fef3c7"
                : "#d1fae5",
              borderRadius: "8px",
              marginBottom: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "12px",
              color: message.includes("❌")
                ? "#991b1b"
                : message.includes("⬇️")
                ? "#92400e"
                : "#065f46",
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
              <X size={14} />
            </button>
          </div>
        )}

        {/* Orders List */}
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "300px",
            }}
          >
            <Loader2 size={32} color="#3b82f6" className="spin" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 10px",
              background: "white",
              borderRadius: "12px",
              color: "#6b7280",
            }}
          >
            <CheckCircle size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
              {t("orders.noneFound")}
            </h3>
            <p style={{ fontSize: "12px" }}>
              {searchQuery || statusFilter !== "all"
                ? t("orders.tryAdjustFilters")
                : t("orders.nonePlaced")}
            </p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
            width: "100%"
          }}>
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        )}
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

export default OrdersContent;

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import './ContentStyles.css';

function OrdersContent() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [downloadingFile, setDownloadingFile] = useState(null);

  const statusConfig = {
    pending_payment: {
      label: "Pending Payment",
      icon: Clock,
      color: "#f59e0b",
      bg: "#fef3c7",
    },
    processing: {
      label: "Processing",
      icon: RefreshCw,
      color: "#3b82f6",
      bg: "#dbeafe",
    },
    completed: {
      label: "Completed",
      icon: CheckCircle,
      color: "#059669",
      bg: "#d1fae5",
    },
    failed: { label: "Failed", icon: XCircle, color: "#ef4444", bg: "#fee2e2" },
    cancelled: {
      label: "Cancelled",
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
      const response = await fetch("http://localhost:8000/api/orders/list/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setOrders(data.orders);
      } else {
        setMessage(`❌ ${data.error || "Failed to load orders"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to load orders. Please try again.");
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
    setMessage(`⬇️ Downloading ${format.toUpperCase()} file...`);

    try {
      const response = await fetch(
        `http://localhost:8000/api/orders/${orderId}/download/${format}/`,
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
        setMessage(`✅ ${format.toUpperCase()} file downloaded successfully`);
      } else {
        const data = await response.json();
        setMessage(`❌ ${data.error || "Download failed"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to download file. Please try again.");
    } finally {
      setDownloadingFile(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
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
              Order #{order.order_number}
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
            </div>
          </div>
        )}

        {/* Downloads */}
        {order.status === "completed" && (
          <div className="order-files">
            <h4 className="order-files-title">
              Download Formats
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
          }}
        >
          <span>Tokens Used</span>
          <span style={{ fontWeight: "600", color: "#667eea", fontSize: "13px" }}>
            {order.tokens_used || 0} Tokens
          </span>
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
            Orders
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
              placeholder="Search orders..."
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
            <option value="all">All Status</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
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
              No orders found
            </h3>
            <p style={{ fontSize: "12px" }}>
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "You haven't placed any orders yet"}
            </p>
          </div>
        ) : (
          <div>
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

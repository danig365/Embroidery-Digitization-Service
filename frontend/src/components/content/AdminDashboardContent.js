import  { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Loader2,
  FileText,
  Download,
  User,
  Coins,
  Sparkles,
  MessageCircle,
  FolderPlus,
  Trash2
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import TokenManagementContent from './TokenManagementContent';
import TokenCostManagementContent from './TokenCostManagementContent';
import EmbroiderySizePricingContent from './EmbroiderySizePricingContent';
import './ContentStyles.css';

function AdminDashboardContent({ onChatClick }) {
  const { t, i18n } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [files, setFiles] = useState({});
  const [adminNotes, setAdminNotes] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("orders");
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceFiles, setResourceFiles] = useState([]);
  const [resourceDescription, setResourceDescription] = useState("");
  const [uploadingResources, setUploadingResources] = useState(false);
  const [orderResources, setOrderResources] = useState([]);

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter === "all" 
        ? `${API_BASE_URL}/admin/orders/`
        : `${API_BASE_URL}/admin/orders/?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
      } else {
        setMessage(`❌ ${data.error || t("adminDashboard.failedLoadOrders")}`);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedLoadOrdersRetry"));
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedOrder(data.order);
        loadOrderResources(data.order.id);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedLoadOrderDetails"));
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setStatusUpdating(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${orderId}/update-status/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessage(t("adminDashboard.orderStatusUpdated"));
        loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        setMessage(`❌ ${data.error || t("adminDashboard.failedUpdateStatus")}`);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedUpdateStatusShort"));
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleFileChange = (format, file) => {
    setFiles({ ...files, [format]: file });
  };

  const handleUploadFiles = async () => {
    if (!selectedOrder) return;

    // Check if at least one file is selected
    const hasFiles = Object.values(files).some((file) => file !== null);
    if (!hasFiles) {
      setMessage(t("adminDashboard.selectAtLeastOneFile"));
      return;
    }

    // Validate that uploaded format matches the customer's requested format
    const requestedFormat = (selectedOrder.design_details?.requested_format || "pes").toLowerCase();
    const uploadedFormats = Object.keys(files).filter(format => files[format] !== null);
    
    if (!uploadedFormats.includes(requestedFormat)) {
      setMessage(t("adminDashboard.mustUploadRequestedFormat", { format: requestedFormat.toUpperCase() }));
      return;
    }

    // Check if admin is uploading other formats besides the requested one
    const extraFormats = uploadedFormats.filter(format => format !== requestedFormat);
    if (extraFormats.length > 0) {
      setMessage(t("adminDashboard.onlyRequestedNeeded", { format: requestedFormat.toUpperCase() }));
      // Still allow upload to proceed with just the requested format
    }

    try {
      setUploadingFiles(true);
      const formData = new FormData();

      // Only append the requested format file
      if (files[requestedFormat]) {
        formData.append(requestedFormat, files[requestedFormat]);
      }

      if (adminNotes) {
        formData.append("admin_notes", adminNotes);
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${selectedOrder.id}/upload-files/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (data.success) {
        setMessage(t("adminDashboard.filesUploaded"));
        setShowUploadModal(false);
        setFiles({});
        setAdminNotes("");
        loadOrders();
        handleViewOrder(selectedOrder.id);
      } else {
        setMessage(`❌ ${data.error || t("adminDashboard.failedUploadFiles")}`);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedUploadFilesRetry"));
    } finally {
      setUploadingFiles(false);
    }
  };

  const loadOrderResources = async (orderId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/orders/${orderId}/resources/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setOrderResources(data.resources || []);
      }
    } catch (error) {
      console.error("Failed to load resources:", error);
    }
  };

  const handleUploadResources = async () => {
    if (!selectedOrder || resourceFiles.length === 0) {
      setMessage(t("adminDashboard.selectAtLeastOneFile"));
      return;
    }
    try {
      setUploadingResources(true);
      const formData = new FormData();
      for (const file of resourceFiles) {
        formData.append('files', file);
      }
      if (resourceDescription.trim()) {
        formData.append('description', resourceDescription);
      }
      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${selectedOrder.id}/resources/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
          body: formData,
        }
      );
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ ${data.message}`);
        setShowResourceModal(false);
        setResourceFiles([]);
        setResourceDescription("");
        loadOrderResources(selectedOrder.id);
      } else {
        setMessage(`❌ ${data.error || t("adminDashboard.failedUploadResources")}`);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedUploadResourcesShort"));
    } finally {
      setUploadingResources(false);
    }
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm(t("adminDashboard.deleteResourceConfirm"))) return;
    try {
      const response = await fetch(`${API_BASE_URL}/admin/resources/${resourceId}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t("adminDashboard.resourceDeleted"));
        setOrderResources(orderResources.filter(r => r.id !== resourceId));
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage(t("adminDashboard.failedDeleteResource"));
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusBadge = (orderStatus) => {
    const statusStyles = {
      submitted: { bg: "#fef3c7", color: "#92400e", icon: <Clock size={14} /> },
      processing: { bg: "#dbeafe", color: "#1e40af", icon: <Loader2 size={14} className="spin" /> },
      completed: { bg: "#d1fae5", color: "#065f46", icon: <CheckCircle size={14} /> },
      failed: { bg: "#fee2e2", color: "#991b1b", icon: <XCircle size={14} /> },
    };

    const style = statusStyles[orderStatus] || statusStyles.submitted;
    const statusLabel = orderStatus === "submitted"
      ? t("adminDashboard.submitted")
      : t(`orders.status.${orderStatus}`);

    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: style.bg,
          color: style.color,
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "600",
        }}
      >
        {style.icon}
        {statusLabel}
      </span>
    );
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      order.design_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language === "fr" ? "fr-FR" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {activeTab === "orders" && <LoadingOverlay visible={loading || statusUpdating || uploadingFiles} text={statusUpdating ? t("adminDashboard.updatingOrderStatus") : uploadingFiles ? t("adminDashboard.uploadingFiles") : t("adminDashboard.loadingOrders")} />}
      <div className="content-wrapper" style={{ background: "#F9FAFB" }}>
        <div className="content-header">
          <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "6px", margin: 0 }}>
            {t("adminDashboard.title")}
          </h1>
        </div>
        <div className="content-main" style={{ background: "#F9FAFB" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Header with Menu */}
            <div style={{ marginBottom: "12px" }}>
            
            {/* Tab Menu */}
            <div style={{ display: "flex", gap: "0", borderBottom: "2px solid #e5e7eb", overflowX: "auto" }}>
              <button
                onClick={() => setActiveTab("orders")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "orders" ? "2px solid #667eea" : "none",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: activeTab === "orders" ? "#667eea" : "#6b7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  whiteSpace: "nowrap",
                  marginBottom: "-2px",
                }}
              >
                <Package size={14} />
                {t("adminDashboard.tabOrders")}
              </button>
              <button
                onClick={() => setActiveTab("tokens")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "tokens" ? "2px solid #667eea" : "none",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: activeTab === "tokens" ? "#667eea" : "#6b7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "-2px",
                  whiteSpace: "nowrap",
                }}
              >
                <Coins size={14} />
                {t("adminDashboard.tabTokenPricing")}
              </button>
              <button
                onClick={() => setActiveTab("token-costs")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "token-costs" ? "2px solid #667eea" : "none",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: activeTab === "token-costs" ? "#667eea" : "#6b7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "-2px",
                  whiteSpace: "nowrap",
                }}
              >
                <Sparkles size={14} />
                {t("adminDashboard.tabTokenCosts")}
              </button>
              <button
                onClick={() => setActiveTab("size-pricing")}
                style={{
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: activeTab === "size-pricing" ? "2px solid #667eea" : "none",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: activeTab === "size-pricing" ? "#667eea" : "#6b7280",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "-2px",
                  whiteSpace: "nowrap",
                }}
              >
                <Package size={14} />
                {t("adminDashboard.tabSizePricing")}
              </button>
            </div>
          </div>

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                {t("adminDashboard.subtitle")}
              </p>

              {/* Message */}
              {message && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: message.includes("❌") ? "#fee2e2" : "#d1fae5",
                    color: message.includes("❌") ? "#991b1b" : "#065f46",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "12px",
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
                      fontSize: "16px",
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Filters and Search */}
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "12px",
                  marginBottom: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", flexDirection: "column" }}>
            {/* Search */}
            <div style={{ width: "100%" }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  color="#9ca3af"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder={t("adminDashboard.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px 8px 36px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
              <Filter size={14} color="#6b7280" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <option value="all">{t("adminDashboard.allOrders")}</option>
                <option value="submitted">{t("adminDashboard.submitted")}</option>
                <option value="processing">{t("orders.status.processing")}</option>
                <option value="completed">{t("orders.status.completed")}</option>
                <option value="failed">{t("orders.status.failed")}</option>
              </select>
            </div>

            {/* Order Count */}
            <div style={{ 
              padding: "8px 12px", 
              background: "#f3f4f6", 
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151"
            }}>
              {t("adminDashboard.orderCount", { count: filteredOrders.length })}
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            overflow: "hidden",
          }}
        >
          {filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 15px" }}>
              <Package size={48} color="#d1d5db" style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "6px" }}>{t("adminDashboard.noOrders")}</p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                {searchTerm ? t("adminDashboard.tryAdjustSearch") : t("adminDashboard.ordersAppearHint")}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.orderId")}
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.design")}
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.user")}
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.date")}
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.status")}
                    </th>
                    <th style={{ textAlign: "right", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      {t("adminDashboard.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#111827" }}>
                        #{order.id}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {order.design_preview ? (
                            <img
                              src={order.design_preview}
                              alt="Design"
                              style={{ width: "50px", height: "50px", borderRadius: "6px", objectFit: "cover" }}
                            />
                          ) : (
                            <div style={{ 
                              width: "40px", 
                              height: "40px", 
                              background: "#f3f4f6", 
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              <FileText size={18} color="#9ca3af" />
                            </div>
                          )}
                          <div>
                            <p style={{ fontSize: "11px", fontWeight: "500", color: "#111827", marginBottom: "2px" }}>
                              {order.design_name || t("adminDashboard.untitledDesign")}
                            </p>
                            <p style={{ fontSize: "10px", color: "#6b7280" }}>
                              {order.design_details?.prompt?.substring(0, 30)}{order.design_details?.prompt?.length > 30 ? "..." : ""}
                            </p>
                            {(order.design_details?.machine_brand || order.design_details?.requested_format) && (
                              <p style={{ fontSize: "9px", color: "#9ca3af", marginTop: "2px" }}>
                                {order.design_details?.machine_brand && `🤖 ${order.design_details.machine_brand}`}
                                {order.design_details?.machine_brand && order.design_details?.requested_format && " • "}
                                {order.design_details?.requested_format && `📁 ${order.design_details.requested_format.toUpperCase()}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <User size={12} color="#6b7280" />
                          <div>
                            <p style={{ fontSize: "11px", color: "#111827", margin: 0 }}>
                              {order.user?.first_name || order.user?.email?.split("@")[0]}
                            </p>
                            <p style={{ fontSize: "10px", color: "#6b7280", margin: 0 }}>
                              {order.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", fontSize: "10px", color: "#6b7280" }}>
                        {formatDate(order.created_at)}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {getStatusBadge(order.status)}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <button
                          onClick={() => {
                            handleViewOrder(order.id);
                          }}
                          style={{
                            padding: "8px 16px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "6px",
                            fontSize: "13px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <Eye size={14} />
                          {t("adminDashboard.viewDetails")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
            </div>
          )}

      {/* Order Details Modal */}
      {selectedOrder && (
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
            padding: "20px",
          }}
          onClick={() => setSelectedOrder(null)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ 
              padding: "24px", 
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                  {t("adminDashboard.orderNumber", { id: selectedOrder.id })}
                </h2>
                <p style={{ fontSize: "14px", color: "#6b7280" }}>
                  {formatDate(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0",
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px" }}>
              {/* Status and Actions */}
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("adminDashboard.orderStatus")}
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {["submitted", "processing", "completed", "failed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(selectedOrder.id, status)}
                      style={{
                        padding: "8px 16px",
                        background: selectedOrder.status === status 
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                          : "#f3f4f6",
                        color: selectedOrder.status === status ? "white" : "#374151",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {status === "submitted" ? t("adminDashboard.submitted") : t(`orders.status.${status}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cost Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f3e8ff", borderRadius: "8px", border: "1px solid #d8b4fe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b21a8", marginBottom: "12px" }}>
                  {t("adminDashboard.orderCost")}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {selectedOrder.embroidery_size_cm && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>{t("adminDashboard.embroiderySize")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {t("adminDashboard.sizeCm", { size: selectedOrder.embroidery_size_cm })}
                      </p>
                    </div>
                  )}
                  {selectedOrder.tokens_used && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>{t("adminDashboard.tokensUsed")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {t("adminDashboard.tokensCount", { count: selectedOrder.tokens_used })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Machine Settings - Customer Selected */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#fef3c7", borderRadius: "8px", border: "2px solid #f59e0b" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px" }}>
                  {t("adminDashboard.machineSettingsCustomer")}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>{t("newDesign.machineBrand")}</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                      🏭 {selectedOrder.design_details?.machine_brand || t("adminDashboard.notSpecified")}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>{t("adminDashboard.requestedFormat")}</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                      📁 {(selectedOrder.design_details?.requested_format || "PES").toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>{t("adminDashboard.embroiderySize")}</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "600" }}>
                      📐 {t("adminDashboard.sizeCm", { size: selectedOrder.design_details?.embroidery_size_cm || selectedOrder.embroidery_size_cm || 10 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                  {t("adminDashboard.customerInfo")}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("adminDashboard.name")}</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.user_first_name} {selectedOrder.user_last_name}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("adminDashboard.email")}</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.user_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Design Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                  {t("adminDashboard.designInfo")}
                </h3>
                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  {/* For AI-generated designs: show both Design Preview and Normal Image */}
                  {selectedOrder.design_details?.prompt ? (
                    <>
                      {selectedOrder.design_preview && (
                        <div>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{t("adminDashboard.designPreview")}</p>
                          <img
                            src={selectedOrder.design_preview}
                            alt={t("adminDashboard.designPreview")}
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                          />
                        </div>
                      )}
                      {selectedOrder.design_details?.normal_image && (
                        <div>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{t("myDesigns.normalImage")}</p>
                          <img
                            src={selectedOrder.design_details.normal_image}
                            alt={t("myDesigns.normalImage")}
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    /* For uploaded images: show only the Normal Image (same as uploaded) */
                    selectedOrder.design_details?.normal_image && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{t("adminDashboard.image")}</p>
                        <img
                          src={selectedOrder.design_details.normal_image}
                          alt={t("adminDashboard.designImage")}
                          style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                        />
                      </div>
                    )
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("adminDashboard.designName")}</p>
                    <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.design_name || t("adminDashboard.untitled")}
                    </p>
                  </div>
                  {selectedOrder.design_details?.prompt && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("myDesigns.aiPrompt")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.prompt}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.style && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("adminDashboard.aiStyle")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.style}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.machine_brand && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("newDesign.machineBrand")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        🤖 {selectedOrder.design_details.machine_brand}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.requested_format && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{t("adminDashboard.requestedFormat")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        📁 {selectedOrder.design_details.requested_format.toUpperCase()}
                      </p>
                    </div>
                  )}
                </div>
              </div>



              {/* Canvas/Design Settings */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "12px" }}>
                  {t("adminDashboard.designDimensionsCanvas")}
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {selectedOrder.design_details?.design_width && selectedOrder.design_details?.design_height && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.designSizeMm")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.design_width} × {selectedOrder.design_details.design_height}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.hoop_size && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.hoopSize")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.hoop_size}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.canvas_width && selectedOrder.design_details?.canvas_height && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.canvasPx")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.canvas_width} × {selectedOrder.design_details.canvas_height}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.rotation && selectedOrder.design_details?.rotation !== 0 && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.rotation")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.rotation}°
                      </p>
                    </div>
                  )}
                  {(selectedOrder.design_details?.mirror_horizontal || selectedOrder.design_details?.mirror_vertical) && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.mirrored")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details?.mirror_horizontal ? "H " : ""}{selectedOrder.design_details?.mirror_vertical ? "V" : ""}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.embroidery_size_cm && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>{t("adminDashboard.embroiderySize")}</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {t("adminDashboard.sizeCm", { size: selectedOrder.design_details.embroidery_size_cm })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Guide */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "2px solid #86efac" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "12px" }}>
                  {t("adminDashboard.productionChecklist")}
                </h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>{t("adminDashboard.checkReviewSpecs")}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>{t("adminDashboard.checkApplyThreadColors", { count: selectedOrder.design_details?.thread_colors?.length || 0 })}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>{t("adminDashboard.checkUseStitchDensity", { density: selectedOrder.design_details?.stitch_density || t("adminDashboard.high") })}</span>
                  </label>
                  {selectedOrder.design_details?.text_content && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                      <input type="checkbox" style={{ cursor: "pointer" }} />
                      <span>{t("adminDashboard.checkAddTextLayer", { text: selectedOrder.design_details?.text_content })}</span>
                    </label>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>{t("adminDashboard.checkDigitizeFormats", { count: selectedOrder.requested_formats?.length || 3 })}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>{t("adminDashboard.checkUploadAndComplete")}</span>
                  </label>
                </div>
              </div>

              {/* Requested File Formats */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af", marginBottom: "12px" }}>
                  {t("adminDashboard.requestedFileFormats")}
                </h3>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(selectedOrder.requested_formats || []).map((format) => (
                    <div
                      key={format}
                      style={{
                        padding: "6px 12px",
                        background: "#dbeafe",
                        color: "#1e40af",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                      }}
                    >
                      {format.toUpperCase()}
                    </div>
                  ))}
                </div>
                {(!selectedOrder.requested_formats || selectedOrder.requested_formats.length === 0) && (
                  <p style={{ fontSize: "13px", color: "#6b7280", fontStyle: "italic" }}>
                    {t("adminDashboard.noSpecificFormats")}
                  </p>
                )}
              </div>

              {/* Upload Files Section */}
              {selectedOrder.status !== "completed" && (
                <div style={{ marginBottom: "24px" }}>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      padding: "12px 24px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      justifyContent: "center",
                    }}
                  >
                    <Upload size={18} />
                    {t("adminDashboard.uploadEmbroideryFiles")}
                  </button>
                </div>
              )}

              {/* Chat Button */}
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => onChatClick && onChatClick(selectedOrder.id)}
                  style={{
                    padding: "12px 24px",
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
                    width: "100%",
                    justifyContent: "center",
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
                  <MessageCircle size={18} />
                  {t("adminDashboard.chatWithCustomer")}
                </button>
              </div>

              {/* Add Resources Button */}
              <div style={{ marginBottom: "24px" }}>
                <button
                  onClick={() => setShowResourceModal(true)}
                  style={{
                    padding: "12px 24px",
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    width: "100%",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <FolderPlus size={18} />
                  {t("adminDashboard.addResources")}
                </button>
              </div>

              {/* Uploaded Resources */}
              {orderResources.length > 0 && (
                <div style={{ marginBottom: "24px", padding: "16px", background: "#fff7ed", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FolderPlus size={16} />
                    {t("adminDashboard.extraResources", { count: orderResources.length })}
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {orderResources.map((resource) => (
                      <div
                        key={resource.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "10px 12px",
                          background: "white",
                          borderRadius: "6px",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        <FileText size={16} style={{ color: "#d97706", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {resource.original_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {formatFileSize(resource.file_size)}
                            {resource.description && ` • ${resource.description}`}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteResource(resource.id)}
                          style={{
                            padding: "4px",
                            background: "#fef2f2",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            color: "#dc2626",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                          title={t("adminDashboard.deleteResource")}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files */}
              {(() => {
                const requestedFormats = selectedOrder.requested_formats || ["dst", "pes", "jef"];
                const uploadedFormats = requestedFormats.filter(format => selectedOrder[`output_${format}`]);
                return uploadedFormats.length > 0 && (
                  <div style={{ padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#065f46", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <CheckCircle size={18} />
                      {t("adminDashboard.uploadedFiles")}
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                      {uploadedFormats.map((format) => (
                        <div
                          key={format}
                          style={{
                            padding: "8px 12px",
                            background: "white",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#065f46",
                            textAlign: "center",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <Download size={14} />
                          {format.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
          )}

      {/* Upload Files Modal */}
      {activeTab === "orders" && showUploadModal && (
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
            zIndex: 1001,
            padding: "20px",
          }}
          onClick={() => setShowUploadModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: "24px", 
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                {t("adminDashboard.uploadEmbroideryFiles")}
              </h2>
              <button
                onClick={() => setShowUploadModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "12px" }}>
                {t("adminDashboard.uploadRequestedFormatHint")}
              </p>
              
              {/* Show requested format - SINGULAR */}
              <div style={{ marginBottom: "20px", padding: "16px", background: "#fff7ed", borderRadius: "8px", border: "2px solid #fb923c" }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#92400e", marginBottom: "12px" }}>
                  {t("adminDashboard.customerRequestedFormatRequired")}
                </p>
                <div style={{ 
                  padding: "12px 16px", 
                  background: "#fed7aa", 
                  color: "#92400e", 
                  borderRadius: "6px", 
                  fontSize: "16px", 
                  fontWeight: "700",
                  textAlign: "center"
                }}>
                  {(selectedOrder.design_details?.requested_format || "PES").toUpperCase()}
                </div>
              </div>

              {/* Single File Input for requested format */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("adminDashboard.uploadFormatFile", { format: (selectedOrder.design_details?.requested_format || "PES").toUpperCase() })} <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="file"
                  accept={`.${(selectedOrder.design_details?.requested_format || "pes").toLowerCase()}`}
                  onChange={(e) => handleFileChange((selectedOrder.design_details?.requested_format || "pes").toLowerCase(), e.target.files[0])}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                />
                {files[(selectedOrder.design_details?.requested_format || "pes").toLowerCase()] && (
                  <p style={{ fontSize: "12px", color: "#059669", marginTop: "4px", fontWeight: "600" }}>
                    ✓ {files[(selectedOrder.design_details?.requested_format || "pes").toLowerCase()].name}
                  </p>
                )}
              </div>

              {/* Warning Message */}
              <div style={{ marginBottom: "20px", padding: "12px 16px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "16px", marginTop: "-2px" }}>⚠️</span>
                <div>
                  <p style={{ fontSize: "13px", color: "#92400e", fontWeight: "600", margin: "0 0 4px 0" }}>{t("adminDashboard.important")}</p>
                  <p style={{ fontSize: "12px", color: "#92400e", margin: 0 }}>
                    {t("adminDashboard.onlyRequestedToComplete", { format: (selectedOrder.design_details?.requested_format || "PES").toUpperCase() })}
                  </p>
                </div>
              </div>

              {/* Admin Notes */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("adminDashboard.adminNotesOptional")}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("adminDashboard.adminNotesPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    resize: "vertical",
                    minHeight: "80px",
                    outline: "none",
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => setShowUploadModal(false)}
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
                  {t("adminDashboard.cancel")}
                </button>
                <button
                  onClick={handleUploadFiles}
                  disabled={uploadingFiles}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: uploadingFiles ? "#93c5fd" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: uploadingFiles ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {uploadingFiles ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {t("adminDashboard.uploading")}
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {t("adminDashboard.uploadFiles")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Resources Modal */}
      {showResourceModal && selectedOrder && (
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
            zIndex: 1001,
            padding: "20px",
          }}
          onClick={() => setShowResourceModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: "24px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <h2 style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>
                {t("adminDashboard.addResources")}
              </h2>
              <button
                onClick={() => setShowResourceModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6b7280", padding: "0" }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: "24px" }}>
              <div style={{ marginBottom: "16px", padding: "12px", background: "#fff7ed", borderRadius: "8px", border: "1px solid #fed7aa" }}>
                <p style={{ fontSize: "13px", color: "#92400e", margin: 0 }}>
                  {t("adminDashboard.resourcesHintPrefix")} <strong>{t("adminDashboard.optional")}</strong> {t("adminDashboard.resourcesHintSuffix")}
                </p>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("adminDashboard.selectFiles")}
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setResourceFiles(Array.from(e.target.files))}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                />
                {resourceFiles.length > 0 && (
                  <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                    {resourceFiles.map((f, i) => (
                      <p key={i} style={{ fontSize: "12px", color: "#059669", fontWeight: "500", margin: 0 }}>
                        ✓ {f.name} ({formatFileSize(f.size)})
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  {t("adminDashboard.descriptionOptional")}
                </label>
                <input
                  type="text"
                  value={resourceDescription}
                  onChange={(e) => setResourceDescription(e.target.value)}
                  placeholder={t("adminDashboard.resourceDescriptionPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={() => { setShowResourceModal(false); setResourceFiles([]); setResourceDescription(""); }}
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
                  {t("adminDashboard.cancel")}
                </button>
                <button
                  onClick={handleUploadResources}
                  disabled={uploadingResources || resourceFiles.length === 0}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: uploadingResources ? "#fcd34d" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: (uploadingResources || resourceFiles.length === 0) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    opacity: resourceFiles.length === 0 ? 0.6 : 1,
                  }}
                >
                  {uploadingResources ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      {t("adminDashboard.uploading")}
                    </>
                  ) : (
                    <>
                      <FolderPlus size={16} />
                      {t("adminDashboard.uploadResources")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tokens Tab */}
      {activeTab === "tokens" && <TokenManagementContent />}
      
      {/* Token Costs Tab */}
      {activeTab === "token-costs" && <TokenCostManagementContent />}
      
      {/* Size Pricing Tab */}
      {activeTab === "size-pricing" && <EmbroiderySizePricingContent />}
        </div>
      </div>
    </div>
    </>
  );
}

export default AdminDashboardContent;

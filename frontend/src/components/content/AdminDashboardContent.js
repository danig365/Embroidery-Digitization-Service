import  { useState, useEffect } from "react";
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
  Sparkles
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import TokenManagementContent from './TokenManagementContent';
import TokenCostManagementContent from './TokenCostManagementContent';
import EmbroiderySizePricingContent from './EmbroiderySizePricingContent';
import './ContentStyles.css';

function AdminDashboardContent() {
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
        setMessage(`❌ ${data.error || "Failed to load orders"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to load orders. Please try again.");
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
      }
    } catch (error) {
      setMessage("❌ Failed to load order details.");
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
        setMessage("✅ Order status updated successfully");
        loadOrders();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder(data.order);
        }
      } else {
        setMessage(`❌ ${data.error || "Failed to update status"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to update status.");
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
      setMessage("❌ Please select at least one file to upload");
      return;
    }

    try {
      setUploadingFiles(true);
      const formData = new FormData();

      Object.keys(files).forEach((format) => {
        if (files[format]) {
          formData.append(format, files[format]);
        }
      });

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
        setMessage("✅ Files uploaded successfully");
        setShowUploadModal(false);
        setFiles({});
        setAdminNotes("");
        loadOrders();
        handleViewOrder(selectedOrder.id);
      } else {
        setMessage(`❌ ${data.error || "Failed to upload files"}`);
      }
    } catch (error) {
      setMessage("❌ Failed to upload files. Please try again.");
    } finally {
      setUploadingFiles(false);
    }
  };

  const getStatusBadge = (orderStatus) => {
    const statusStyles = {
      submitted: { bg: "#fef3c7", color: "#92400e", icon: <Clock size={14} /> },
      processing: { bg: "#dbeafe", color: "#1e40af", icon: <Loader2 size={14} className="spin" /> },
      completed: { bg: "#d1fae5", color: "#065f46", icon: <CheckCircle size={14} /> },
      failed: { bg: "#fee2e2", color: "#991b1b", icon: <XCircle size={14} /> },
    };

    const style = statusStyles[orderStatus] || statusStyles.submitted;

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
        {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      {activeTab === "orders" && <LoadingOverlay visible={loading || statusUpdating || uploadingFiles} text={statusUpdating ? "Updating order status..." : uploadingFiles ? "Uploading files..." : "Loading orders..."} />}
      <div className="content-wrapper" style={{ background: "#F9FAFB" }}>
        <div className="content-header">
          <h1 style={{ fontSize: "16px", fontWeight: "700", color: "#111827", marginBottom: "6px", margin: 0 }}>
            Admin Dashboard
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
                Orders
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
                Token Pricing
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
                Token Costs
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
                Size Pricing
              </button>
            </div>
          </div>

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "12px" }}>
                Manage and process embroidery digitization orders
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
                  placeholder="Search by Order ID, Design, or User..."
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
                <option value="all">All Orders</option>
                <option value="submitted">Submitted</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
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
              {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
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
              <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "6px" }}>No orders found</p>
              <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                {searchTerm ? "Try adjusting your search" : "Orders will appear here once submitted"}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      Order ID
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      Design
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      User
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      Date
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      Status
                    </th>
                    <th style={{ textAlign: "right", padding: "12px 10px", fontSize: "11px", fontWeight: "600", color: "#6b7280" }}>
                      Actions
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
                              {order.design_name || "Untitled Design"}
                            </p>
                            <p style={{ fontSize: "10px", color: "#6b7280" }}>
                              {order.design_details?.prompt?.substring(0, 30)}{order.design_details?.prompt?.length > 30 ? "..." : ""}
                            </p>
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
                          View Details
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
                  Order #{selectedOrder.id}
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
                  Order Status
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
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Cost Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f3e8ff", borderRadius: "8px", border: "1px solid #d8b4fe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b21a8", marginBottom: "12px" }}>
                  💰 Order Cost
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {selectedOrder.embroidery_size_cm && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>Embroidery Size</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.embroidery_size_cm} cm
                      </p>
                    </div>
                  )}
                  {selectedOrder.tokens_used && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>Tokens Used</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.tokens_used} tokens
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* User Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                  Customer Information
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Name</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.user_first_name} {selectedOrder.user_last_name}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Email</p>
                    <p style={{ fontSize: "14px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.user_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Design Information */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                  Design Information
                </h3>
                <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
                  {/* For AI-generated designs: show both Design Preview and Normal Image */}
                  {selectedOrder.design_details?.prompt ? (
                    <>
                      {selectedOrder.design_preview && (
                        <div>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Design Preview</p>
                          <img
                            src={selectedOrder.design_preview}
                            alt="Design Preview"
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                          />
                        </div>
                      )}
                      {selectedOrder.design_details?.normal_image && (
                        <div>
                          <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Normal Image</p>
                          <img
                            src={selectedOrder.design_details.normal_image}
                            alt="Normal Image"
                            style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    /* For uploaded images: show only the Normal Image (same as uploaded) */
                    selectedOrder.design_details?.normal_image && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Image</p>
                        <img
                          src={selectedOrder.design_details.normal_image}
                          alt="Design Image"
                          style={{ width: "150px", height: "150px", borderRadius: "8px", objectFit: "cover", border: "2px solid #e5e7eb" }}
                        />
                      </div>
                    )
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Design Name</p>
                    <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.design_name || "Untitled"}
                    </p>
                  </div>
                  {selectedOrder.design_details?.prompt && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>AI Prompt</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.prompt}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.style && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>AI Style</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.style}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Layer Details */}
              {selectedOrder.design_details?.text_content && (
                <div style={{ marginBottom: "24px", padding: "16px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fcd34d" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px" }}>
                    📝 Text Layer Settings
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    <div>
                      <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Text Content</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500", whiteSpace: "pre-wrap", padding: "8px", background: "white", borderRadius: "4px" }}>
                        "{selectedOrder.design_details.text_content}"
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Font Family</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.text_font || "Default"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Font Style</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.text_style || "Regular"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Size (px)</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.text_size || "36"}
                      </p>
                    </div>
                    {selectedOrder.design_details.text_color && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Text Color</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "32px", height: "32px", background: selectedOrder.design_details.text_color, borderRadius: "4px", border: "2px solid #fcd34d" }} />
                          <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>{selectedOrder.design_details.text_color}</span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.design_details.text_outline_color && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Outline Color</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "32px", height: "32px", background: selectedOrder.design_details.text_outline_color, borderRadius: "4px", border: "2px solid #fcd34d" }} />
                          <span style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>{selectedOrder.design_details.text_outline_color}</span>
                        </div>
                      </div>
                    )}
                    {selectedOrder.design_details?.text_outline_thickness && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Outline Thickness</p>
                        <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                          {selectedOrder.design_details.text_outline_thickness}px
                        </p>
                      </div>
                    )}
                    {selectedOrder.design_details?.text_position_x !== undefined && selectedOrder.design_details?.text_position_y !== undefined && (
                      <div>
                        <p style={{ fontSize: "12px", color: "#b45309", marginBottom: "4px" }}>Text Position</p>
                        <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                          X: {selectedOrder.design_details.text_position_x}% Y: {selectedOrder.design_details.text_position_y}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Thread Colors */}
              {selectedOrder.design_details?.thread_colors && selectedOrder.design_details.thread_colors.length > 0 && (
                <div style={{ marginBottom: "24px", padding: "16px", background: "#f3e8ff", borderRadius: "8px", border: "1px solid #e9d5ff" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b21a8", marginBottom: "12px" }}>
                    🧵 Thread Colors ({selectedOrder.design_details.thread_colors.length})
                  </h3>
                  <div style={{ marginBottom: "12px" }}>
                    <p style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>Brand: {selectedOrder.design_details.thread_brand || "Not specified"}</p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                    {selectedOrder.design_details.thread_colors.map((color, index) => (
                      <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px", background: "white", borderRadius: "6px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            background: color.hex || color,
                            borderRadius: "4px",
                            border: "2px solid #d8b4fe",
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "12px", color: "#111827", fontWeight: "600", margin: "0", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {color.name || "Color"}
                          </p>
                          <p style={{ fontSize: "11px", color: "#6b7280", margin: "0", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {color.code || color.hex || ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedOrder.design_details.thread_notes && (
                    <div style={{ padding: "8px", background: "white", borderRadius: "6px", border: "1px solid #e9d5ff" }}>
                      <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px", fontWeight: "600" }}>Notes:</p>
                      <p style={{ fontSize: "12px", color: "#111827", margin: "0", whiteSpace: "pre-wrap" }}>
                        {selectedOrder.design_details.thread_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Settings */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af", marginBottom: "12px" }}>
                  ⚙️ Embroidery Settings
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Stitch Density</p>
                    <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                      Level {selectedOrder.design_details?.stitch_density || 5}
                    </p>
                  </div>
                  {selectedOrder.design_details?.stitch_type && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Stitch Type</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.stitch_type}
                      </p>
                    </div>
                  )}
                  <div>
                    <p style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Auto Trim</p>
                    <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                      {selectedOrder.design_details?.auto_trim ? "✓ Enabled" : "✗ Disabled"}
                    </p>
                  </div>
                  {selectedOrder.design_details?.underlay !== undefined && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Underlay</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.underlay ? "✓ Yes" : "✗ No"}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.jump_trim !== undefined && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Jump Trim</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.jump_trim ? "✓ Yes" : "✗ No"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Canvas/Design Settings */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "12px" }}>
                  📐 Design Dimensions & Canvas
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                  {selectedOrder.design_details?.design_width && selectedOrder.design_details?.design_height && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Design Size (mm)</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.design_width} × {selectedOrder.design_details.design_height}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.hoop_size && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Hoop Size</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.hoop_size}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.canvas_width && selectedOrder.design_details?.canvas_height && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Canvas (px)</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.canvas_width} × {selectedOrder.design_details.canvas_height}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.rotation && selectedOrder.design_details?.rotation !== 0 && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Rotation</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.rotation}°
                      </p>
                    </div>
                  )}
                  {(selectedOrder.design_details?.mirror_horizontal || selectedOrder.design_details?.mirror_vertical) && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Mirrored</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details?.mirror_horizontal ? "H " : ""}{selectedOrder.design_details?.mirror_vertical ? "V" : ""}
                      </p>
                    </div>
                  )}
                  {selectedOrder.design_details?.embroidery_size_cm && (
                    <div>
                      <p style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Embroidery Size</p>
                      <p style={{ fontSize: "13px", color: "#111827", fontWeight: "500" }}>
                        {selectedOrder.design_details.embroidery_size_cm} cm
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Production Guide */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "2px solid #86efac" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "12px" }}>
                  ✓ Production Checklist
                </h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>Review all design specifications above</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>Apply {selectedOrder.design_details?.thread_colors?.length || 0} thread color(s) as specified</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>Use stitch density: {selectedOrder.design_details?.stitch_density || "High"}</span>
                  </label>
                  {selectedOrder.design_details?.text_content && (
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                      <input type="checkbox" style={{ cursor: "pointer" }} />
                      <span>Add text layer: "{selectedOrder.design_details?.text_content}"</span>
                    </label>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>Digitize all {selectedOrder.requested_formats?.length || 3} requested formats</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#166534" }}>
                    <input type="checkbox" style={{ cursor: "pointer" }} />
                    <span>Upload files and mark order as "completed"</span>
                  </label>
                </div>
              </div>

              {/* Requested File Formats */}
              <div style={{ marginBottom: "24px", padding: "16px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af", marginBottom: "12px" }}>
                  Requested File Formats
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
                    No specific formats requested (default: DST, PES, JEF)
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
                    Upload Embroidery Files
                  </button>
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
                      Uploaded Files
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
                Upload Embroidery Files
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
                Upload the manually digitized embroidery files for the requested formats:
              </p>
              
              {/* Show requested formats */}
              <div style={{ marginBottom: "16px", padding: "12px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <p style={{ fontSize: "13px", fontWeight: "600", color: "#1e40af", marginBottom: "6px" }}>
                  Customer Requested:
                </p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(selectedOrder.requested_formats || ['dst', 'pes', 'jef']).map((format) => (
                    <span
                      key={format}
                      style={{
                        padding: "4px 8px",
                        background: "#dbeafe",
                        color: "#1e40af",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {format.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* File Inputs - Only for requested formats */}
              <div style={{ display: "grid", gap: "16px", marginBottom: "20px" }}>
                {(selectedOrder.requested_formats || ['dst', 'pes', 'jef']).map((format) => (
                  <div key={format}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                      {format.toUpperCase()} File <span style={{ color: "#dc2626" }}>*</span>
                    </label>
                    <input
                      type="file"
                      accept={`.${format}`}
                      onChange={(e) => handleFileChange(format, e.target.files[0])}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    />
                    {files[format] && (
                      <p style={{ fontSize: "12px", color: "#059669", marginTop: "4px" }}>
                        ✓ {files[format].name}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Admin Notes */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "8px" }}>
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add any notes about this order..."
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
                  Cancel
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
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload Files
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

import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Clock, Plus, Loader2, Paperclip, FileText, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { API_BASE_URL } from '../../config';
import './ChatContent.css';

function ChatContent({ userRole }) {
  const { t } = useTranslation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showNewConvModal, setShowNewConvModal] = useState(false);
  const [creatingConv, setCreatingConv] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load current user ID from localStorage
  useEffect(() => {
    const userId = localStorage.getItem("user_id");
    if (userId) {
      setCurrentUserId(parseInt(userId));
    }
  }, []);

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
    // Poll for new conversations every 5 seconds
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat/conversations/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/orders/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error("Failed to load orders:", error);
    }
  };

  const createConversationForOrder = async (orderId) => {
    try {
      setCreatingConv(true);
      const response = await fetch(`${API_BASE_URL}/chat/conversations/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId }),
      });

      const data = await response.json();
      if (data.success) {
        setShowNewConvModal(false);
        await loadConversations();
        setMessage(t("chatContent.conversationStarted"));
      } else {
        setMessage(`❌ ${data.error || t("chatContent.failedCreateConversation")}`);
      }
    } catch (error) {
      console.error("Failed to create conversation:", error);
      setMessage(t("chatContent.failedCreateConversationWithEmoji"));
    } finally {
      setCreatingConv(false);
    }
  };

  const loadConversationDetail = async (conversationId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/chat/conversations/${conversationId}/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      if (data.success) {
        setSelectedConversation(data.conversation);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      setMessage(t("chatContent.failedLoadConversation"));
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setMessage(t("chatContent.fileSizeLimit"));
      return;
    }

    setSelectedFile(file);

    // Generate preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setFilePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation) return;

    try {
      setLoading(true);

      const formData = new FormData();
      if (newMessage.trim()) {
        formData.append('message', newMessage);
      }
      if (selectedFile) {
        formData.append('attachment', selectedFile);
      }

      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${selectedConversation.id}/`,
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
        setNewMessage("");
        clearSelectedFile();
        setMessage("");
        // Reload the conversation to see the new message
        await loadConversationDetail(selectedConversation.id);
      } else {
        setMessage(`❌ ${data.error || t("chatContent.failedSend")}`);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage(t("chatContent.failedSendWithEmoji"));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="chat-container">
      {/* Conversations List */}
      <div className="chat-sidebar">
        <div className="chat-header">
          <MessageCircle size={24} />
          <h2>{t("chatContent.messages")}</h2>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={40} color="#D1D5DB" />
              <p>{t("chatContent.noConversations")}</p>
              {userRole === "customer" && (
                <button
                  onClick={() => {
                    loadOrders();
                    setShowNewConvModal(true);
                  }}
                  style={{
                    marginTop: "12px",
                    padding: "8px 16px",
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
                  }}
                >
                  <Plus size={14} />
                  {t("chatContent.startChat")}
                </button>
              )}
            </div>
          ) : (
            <>
              {userRole === "customer" && (
                <button
                  onClick={() => {
                    loadOrders();
                    setShowNewConvModal(true);
                  }}
                  style={{
                    width: "calc(100% - 16px)",
                    margin: "8px",
                    padding: "8px 12px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <Plus size={14} />
                  {t("chatContent.newConversation")}
                </button>
              )}
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conversation-item ${selectedConversation?.id === conv.id ? "active" : ""}`}
                  onClick={() => loadConversationDetail(conv.id)}
                >
                  <div className="conversation-header">
                    <h4>{conv.order_number}</h4>
                    <span className="status-badge" data-status={conv.order_status}>
                      {conv.order_status}
                    </span>
                  </div>
                  <p className="conversation-person">
                    {userRole === "admin" ? conv.customer_username : conv.admin_username || t("chatContent.unassigned")}
                  </p>
                  {conv.last_message && (
                    <p className="last-message">
                      {conv.last_message.has_attachment && "📎 "}
                      {conv.last_message.content || (conv.last_message.has_attachment ? conv.last_message.attachment_name : '')}
                    </p>
                  )}
                  {conv.unread_count > 0 && (
                    <span className="unread-badge">{conv.unread_count}</span>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-main">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="chat-top-header">
              <div>
                <h3>{selectedConversation.order_number}</h3>
                <p className="chat-subtitle">
                  {userRole === "admin"
                    ? selectedConversation.customer_username
                    : selectedConversation.admin_username || t("chatContent.noAdminAssigned")}
                </p>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="messages-area">
              {selectedConversation.messages.length === 0 ? (
                <div className="empty-messages">
                  <MessageCircle size={48} color="#D1D5DB" />
                  <p>{t("chatContent.noMessages")}</p>
                </div>
              ) : (
                selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.is_admin ? "admin" : "user"} ${
                      msg.sender_id === currentUserId ? "own" : ""
                    }`}
                  >
                    <div className="message-bubble">
                      {msg.content && <p>{msg.content}</p>}
                      {msg.has_attachment && msg.attachment_url && (
                        <div className="message-attachment">
                          {msg.attachment_type === 'image' ? (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="attachment-image-link">
                              <img src={msg.attachment_url} alt={msg.attachment_name || t("chatContent.attachment")} className="attachment-image" />
                            </a>
                          ) : (
                            <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="attachment-file-link">
                              <FileText size={18} />
                              <div className="attachment-file-info">
                                <span className="attachment-file-name">{msg.attachment_name || t("chatContent.file")}</span>
                                {msg.attachment_size && (
                                  <span className="attachment-file-size">{formatFileSize(msg.attachment_size)}</span>
                                )}
                              </div>
                              <Download size={16} />
                            </a>
                          )}
                        </div>
                      )}
                      <span className="message-time">{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              {message && (
                <div className={`feedback-message ${message.includes("❌") ? "error" : "success"}`}>
                  {message}
                  <button onClick={() => setMessage("")} style={{ marginLeft: "8px", background: "none", border: "none", cursor: "pointer" }}>
                    ×
                  </button>
                </div>
              )}
              {/* Attachment Preview */}
              {selectedFile && (
                <div className="attachment-preview">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="attachment-preview-image" />
                  ) : (
                    <div className="attachment-preview-file">
                      <FileText size={20} />
                      <span>{selectedFile.name}</span>
                    </div>
                  )}
                  <div className="attachment-preview-info">
                    <span className="attachment-preview-name">{selectedFile.name}</span>
                    <span className="attachment-preview-size">{formatFileSize(selectedFile.size)}</span>
                  </div>
                  <button
                    onClick={clearSelectedFile}
                    className="attachment-preview-remove"
                    title={t("chatContent.removeAttachment")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
              <div className="input-wrapper">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar,.dst,.pes,.jef,.exp,.vp3,.hus,.sew,.xxx,.pec,.tap"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="attach-btn"
                  title={t("chatContent.attachFile")}
                  disabled={loading}
                >
                  <Paperclip size={20} />
                </button>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={t("chatContent.typeMessage")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  disabled={loading}
                  rows="3"
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedFile) || loading}
                  className="send-btn"
                >
                  {loading ? (
                    <Clock size={20} className="spin" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <MessageCircle size={64} color="#D1D5DB" />
            <h3>{t("chatContent.selectConversation")}</h3>
            <p>{t("chatContent.chooseOrder")}</p>
          </div>
        )}
      </div>

      {/* Modal for starting new conversation (Customer only) */}
      {userRole === "customer" && showNewConvModal && (
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
            zIndex: 2000,
            padding: "20px",
          }}
          onClick={() => setShowNewConvModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", margin: 0 }}>
                {t("chatContent.startNewConversation")}
              </h3>
              <button
                onClick={() => setShowNewConvModal(false)}
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

            {/* Modal Body */}
            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>
                {t("chatContent.selectOrderPrompt")}
              </p>
              
              {orders.length === 0 ? (
                <div style={{
                  textAlign: "center",
                  padding: "20px",
                  color: "#9ca3af"
                }}>
                  <p>{t("chatContent.noOrders")}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => createConversationForOrder(order.id)}
                      disabled={creatingConv}
                      style={{
                        padding: "12px",
                        background: "#f9fafb",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        cursor: creatingConv ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        opacity: creatingConv ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!creatingConv) {
                          e.currentTarget.style.background = "#f3f4f6";
                          e.currentTarget.style.borderColor = "#667eea";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!creatingConv) {
                          e.currentTarget.style.background = "#f9fafb";
                          e.currentTarget.style.borderColor = "#e5e7eb";
                        }
                      }}
                    >
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px"
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", margin: "0 0 4px 0" }}>
                            {order.order_number}
                          </h4>
                          <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>
                            {order.design_name || t("chatContent.design")}
                          </p>
                        </div>
                        <span style={{
                          fontSize: "11px",
                          padding: "4px 8px",
                          background: "#dbeafe",
                          color: "#1e40af",
                          borderRadius: "4px",
                          fontWeight: "600"
                        }}>
                          {order.status}
                        </span>
                        {creatingConv && (
                          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatContent;


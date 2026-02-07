import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, Send, X, Clock } from "lucide-react";
import { API_BASE_URL } from '../../config';
import './ChatContent.css';

function ChatContent({ userRole }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const messagesEndRef = useRef(null);

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
      setMessage("❌ Failed to load conversation");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/chat/conversations/${selectedConversation.id}/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: newMessage,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setNewMessage("");
        setMessage("");
        // Reload the conversation to see the new message
        await loadConversationDetail(selectedConversation.id);
      } else {
        setMessage(`❌ ${data.error || "Failed to send message"}`);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessage("❌ Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="chat-container">
      {/* Conversations List */}
      <div className="chat-sidebar">
        <div className="chat-header">
          <MessageCircle size={24} />
          <h2>Messages</h2>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <MessageCircle size={40} color="#D1D5DB" />
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
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
                  {userRole === "admin" ? conv.customer_username : conv.admin_username || "Unassigned"}
                </p>
                {conv.last_message && (
                  <p className="last-message">{conv.last_message.content}</p>
                )}
                {conv.unread_count > 0 && (
                  <span className="unread-badge">{conv.unread_count}</span>
                )}
              </div>
            ))
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
                    : selectedConversation.admin_username || "No admin assigned"}
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
                  <p>No messages yet. Start the conversation!</p>
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
                      <p>{msg.content}</p>
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
              <div className="input-wrapper">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
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
                  disabled={!newMessage.trim() || loading}
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
            <h3>Select a conversation to start chatting</h3>
            <p>Choose an order from the list to view or start a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatContent;

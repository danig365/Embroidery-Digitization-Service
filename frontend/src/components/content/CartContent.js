import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ShoppingCart,
  Trash2,
  ArrowRight,
  AlertCircle,
  Loader2,
  PackageOpen,
} from "lucide-react";
import { API_BASE_URL } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import { getTokenCosts } from '../../services/api';
import './ContentStyles.css';

function CartContent({ onTokenUpdate, onCheckout }) {
  const { t } = useTranslation();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [message, setMessage] = useState("");
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [selectedFormats, setSelectedFormats] = useState(["dst", "pes", "jef"]); // Default formats
  const [tokenCosts, setTokenCosts] = useState({ order_placement: 2 }); // Default to 2 tokens
  
  // Available embroidery formats from Wilcom
  const EMBROIDERY_FORMATS = [
    // Industrial
    { code: "dst", name: "DST", brand: "Tajima", category: "Industrial" },
    { code: "dsb", name: "DSB", brand: "Barudan", category: "Industrial" },
    { code: "dsz", name: "DSZ", brand: "ZSK", category: "Industrial" },
    { code: "exp", name: "EXP", brand: "Melco", category: "Industrial" },
    { code: "tbf", name: "TBF", brand: "Barudan", category: "Industrial" },
    { code: "fdr", name: "FDR", brand: "Fortron", category: "Industrial" },
    { code: "stx", name: "STX", brand: "Sunstar", category: "Industrial" },
    
    // Domestic
    { code: "pes", name: "PES", brand: "Brother / Babylock", category: "Domestic" },
    { code: "pec", name: "PEC", brand: "Brother", category: "Domestic" },
    { code: "jef", name: "JEF", brand: "Janome / Elna", category: "Domestic" },
    { code: "sew", name: "SEW", brand: "Janome", category: "Domestic" },
    { code: "hus", name: "HUS", brand: "Husqvarna", category: "Domestic" },
    { code: "vip", name: "VIP", brand: "Husqvarna / Viking", category: "Domestic" },
    { code: "vp3", name: "VP3", brand: "Husqvarna / Pfaff", category: "Domestic" },
    { code: "xxx", name: "XXX", brand: "Singer", category: "Domestic" },
    
    // Commercial
    { code: "cmd", name: "CMD", brand: "Compucon", category: "Commercial" },
    { code: "tap", name: "TAP", brand: "Happy", category: "Commercial" },
    { code: "tim", name: "TIM", brand: "Tajima", category: "Commercial" },
    { code: "emt", name: "EMT", brand: "Inbro", category: "Commercial" },
    { code: "10o", name: "10O", brand: "Barudan", category: "Commercial" },
    { code: "ds9", name: "DS9", brand: "Tajima", category: "Commercial" },
  ];

  useEffect(() => {
    loadCart();
    loadTokenBalance();
    loadTokenCosts();
  }, []);

  const loadTokenCosts = async () => {
    try {
      const data = await getTokenCosts();
      if (data && data.costs) {
        setTokenCosts(data.costs);
      }
    } catch (error) {
      console.error("Failed to load token costs:", error);
      // Keep default value on error
    }
  };

  const loadCart = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/cart/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const cartItems = data.cart_items || [];
        setCartItems(cartItems);
        
        // Extract the customer's requested format from the design
        if (cartItems.length > 0 && cartItems[0].design_details?.requested_format) {
          const requestedFormat = cartItems[0].design_details.requested_format.toLowerCase();
          setSelectedFormats([requestedFormat]);
        } else {
          // Fallback to default if no format found
          setSelectedFormats(["pes"]);
        }
      } else {
        setMessage(`❌ ${data.error || t("cart.failedLoadCart")}`);
      }
    } catch (error) {
      setMessage(t("cart.failedLoadCartRetry"));
    } finally {
      setLoading(false);
    }
  };

  const loadTokenBalance = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/tokens/balance/`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();
      setTokenBalance(data.tokens || 0);
    } catch (error) {
      console.error("Failed to load token balance:", error);
    }
  };

  const handleRemoveFromCart = async (itemId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/cart/${itemId}/remove/`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setCartItems(cartItems.filter((item) => item.id !== itemId));
        setMessage(t("cart.removedSuccess"));
      } else {
        setMessage(`❌ ${data.error || t("cart.failedRemove")}`);
      }
    } catch (error) {
      setMessage(t("cart.failedRemoveRetry"));
    }
  };

  const toggleFormat = (formatCode) => {
    if (selectedFormats.includes(formatCode)) {
      // Don't allow deselecting if it's the last one
      if (selectedFormats.length > 1) {
        setSelectedFormats(selectedFormats.filter(f => f !== formatCode));
      }
    } else {
      setSelectedFormats([...selectedFormats, formatCode]);
    }
  };

  const handlePlaceOrder = async () => {
    const totalCost = cartItems.length * tokenCosts.order_placement;

    if (tokenBalance < totalCost) {
      setMessage(t("cart.insufficientTokensMessage"));
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      // Use the format selected during design (machine settings), or fallback to default formats
      const formatsToUse = selectedFormats.length > 0 ? selectedFormats : ["pes"];
      
      const response = await fetch(`${API_BASE_URL}/cart/checkout/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requested_formats: formatsToUse }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(t("cart.placedSuccess"));
        setCartItems([]);
        setTokenBalance(tokenBalance - totalCost);
        if (onTokenUpdate) onTokenUpdate();
        setTimeout(() => {
          if (onCheckout) onCheckout();
        }, 1500);
      } else {
        setMessage(`❌ ${data.error || t("cart.failedPlaceOrder")}`);
      }
    } catch (error) {
      setMessage(t("cart.failedPlaceOrderRetry"));
    } finally {
      setSubmitting(false);
    }
  };

  const totalItems = cartItems.length;
  const totalCost = totalItems * tokenCosts.order_placement;
  const hasInsufficientTokens = tokenBalance < totalCost;

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          background: "#F9FAFB",
        }}
      >
        <Loader2 size={40} color="#3b82f6" className="spin" />
      </div>
    );
  }

  return (
    <>
      <LoadingOverlay visible={loading || submitting} text={submitting ? t("cart.processingOrder") : t("cart.loadingCart")} />
      <div className="cart-wrapper" style={{ padding: "24px", height: "100%", overflowY: "auto", background: "#F9FAFB" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <ShoppingCart size={28} color="#111827" />
            <h1 style={{ fontSize: "28px", fontWeight: "700", color: "#111827", margin: 0 }}>
              {t("cart.title")}
            </h1>
          </div>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>
            {totalItems === 0
              ? t("cart.empty")
              : t("cart.itemCount", { count: totalItems })}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div
            style={{
              padding: "12px 16px",
              background: message.includes("❌") ? "#FEE2E2" : "#D1FAE5",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: message.includes("❌") ? "#991B1B" : "#065F46",
              fontSize: "14px",
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

        {totalItems === 0 ? (
          // Empty Cart
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              padding: "60px 20px",
              textAlign: "center",
            }}
          >
            <PackageOpen size={64} style={{ margin: "0 auto 20px", color: "#d1d5db" }} />
            <h3 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "12px", color: "#111827" }}>
              {t("cart.empty")}
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "24px", fontSize: "14px" }}>
              {t("cart.addDesignsHint")}
            </p>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              style={{
                padding: "12px 24px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {t("cart.createDesign")}
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <div className="cart-grid-container" style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: "24px" }}>
            {/* Cart Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    gap: "20px",
                    alignItems: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      background: "#f3f4f6",
                      borderRadius: "8px",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {item.design_details?.embroidery_preview || item.design_details?.normal_image ? (
                      <img
                        src={item.design_details.embroidery_preview || item.design_details.normal_image}
                        alt={item.design_details.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#d1d5db",
                        }}
                      >
                        <ShoppingCart size={40} />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "8px",
                        color: "#111827",
                      }}
                    >
                      {item.design_details?.name || t("cart.untitledDesign")}
                    </h3>
                    {item.design_details?.prompt && (
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
                        {item.design_details.prompt}
                      </p>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        style={{
                          padding: "6px 12px",
                          background: "#f3f4f6",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#374151",
                        }}
                      >
                        {t("cart.quantity")}
                      </div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: "700",
                          color: "#667eea",
                        }}
                      >
                        {tokenCosts.order_placement} {t("buyTokens.tokens")}
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveFromCart(item.id)}
                    style={{
                      padding: "10px",
                      background: "#fef2f2",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={t("cart.removeFromCart")}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div>
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  position: "sticky",
                  top: "24px",
                }}
              >
                <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "20px", color: "#111827" }}>
                  {t("cart.orderSummary")}
                </h2>

                <div style={{ marginBottom: "20px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "12px",
                      fontSize: "14px",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>{t("cart.items", { count: totalItems })}</span>
                    <span style={{ fontWeight: "600", color: "#111827" }}>
                      {totalCost} {t("buyTokens.tokens")}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingTop: "12px",
                      borderTop: "1px solid #e5e7eb",
                      fontSize: "16px",
                    }}
                  >
                    <span style={{ fontWeight: "600", color: "#111827" }}>{t("cart.total")}</span>
                    <span style={{ fontWeight: "700", color: "#667eea", fontSize: "18px" }}>
                      {totalCost} {t("buyTokens.tokens")}
                    </span>
                  </div>
                </div>

                {/* Token Balance */}
                <div
                  style={{
                    padding: "12px 16px",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                    <span style={{ color: "#6b7280" }}>{t("cart.yourBalance")}</span>
                    <span
                      style={{
                        fontWeight: "700",
                        color: hasInsufficientTokens ? "#dc2626" : "#059669",
                      }}
                    >
                      {tokenBalance} {t("buyTokens.tokens")}
                    </span>
                  </div>
                  {hasInsufficientTokens && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "#fee2e2",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        color: "#991b1b",
                        fontSize: "13px",
                      }}
                    >
                      <AlertCircle size={16} />
                      <span>{t("cart.insufficientTokens")}</span>
                    </div>
                  )}
                </div>

                {/* File Format Auto-Selected from Design */}
                <div style={{ marginBottom: "20px", padding: "16px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #86efac" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", margin: 0 }}>
                      ✓ {t("cart.embroideryFormat")}
                    </h3>
                    <span style={{ fontSize: "12px", color: "#059669", fontWeight: "500" }}>{t("cart.autoFromMachine")}</span>
                  </div>
                  
                  {/* Selected formats display */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {selectedFormats.length > 0 ? (
                      selectedFormats.map((code) => {
                        const format = EMBROIDERY_FORMATS.find(f => f.code === code);
                        return (
                          <div
                            key={code}
                            style={{
                              padding: "6px 10px",
                              background: "#d1fae5",
                              border: "1px solid #10b981",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#1e40af",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {format?.name || code.toUpperCase()}
                          </div>
                        );
                      })
                    ) : (
                      <p style={{ fontSize: "13px", color: "#059669", fontStyle: "italic" }}>
                        {t("cart.formatFromMachine")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Format Selection Modal */}
                {showFormatModal && (
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
                    onClick={() => setShowFormatModal(false)}
                  >
                    <div
                      style={{
                        background: "white",
                        borderRadius: "12px",
                        maxWidth: "600px",
                        width: "90%",
                        maxHeight: "80vh",
                        overflowY: "auto",
                        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Modal Header */}
                      <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                              {t("cart.selectFileFormats")}
                            </h2>
                            <p style={{ fontSize: "13px", color: "#6b7280" }}>
                              {t("cart.selectedFormats", { count: selectedFormats.length })}
                            </p>
                          </div>
                          <button
                            onClick={() => setShowFormatModal(false)}
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
                      </div>

                      {/* Modal Content */}
                      <div style={{ padding: "20px" }}>
                        {["Industrial", "Domestic", "Commercial"].map((category) => {
                          const categoryFormats = EMBROIDERY_FORMATS.filter(f => f.category === category);
                          return (
                            <div key={category} style={{ marginBottom: "20px" }}>
                              <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#6b7280", marginBottom: "10px" }}>
                                {category} ({categoryFormats.length})
                              </h4>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                                {categoryFormats.map((format) => (
                                  <div
                                    key={format.code}
                                    onClick={() => toggleFormat(format.code)}
                                    style={{
                                      padding: "10px",
                                      background: selectedFormats.includes(format.code) ? "#dbeafe" : "white",
                                      border: selectedFormats.includes(format.code) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                                      borderRadius: "6px",
                                      cursor: "pointer",
                                      transition: "all 0.2s",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                                      <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                                        {format.name}
                                      </p>
                                      <div
                                        style={{
                                          width: "16px",
                                          height: "16px",
                                          borderRadius: "3px",
                                          background: selectedFormats.includes(format.code) ? "#3b82f6" : "white",
                                          border: "2px solid " + (selectedFormats.includes(format.code) ? "#3b82f6" : "#d1d5db"),
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          color: "white",
                                          fontSize: "10px",
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {selectedFormats.includes(format.code) ? "✓" : ""}
                                      </div>
                                    </div>
                                    <p style={{ fontSize: "10px", color: "#6b7280" }}>
                                      {format.brand}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Modal Footer */}
                      <div style={{ padding: "16px 20px", borderTop: "1px solid #e5e7eb", background: "#f9fafb" }}>
                        <button
                          onClick={() => setShowFormatModal(false)}
                          style={{
                            width: "100%",
                            padding: "12px",
                            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            cursor: "pointer",
                          }}
                        >
                          {t("cart.doneSelected", { count: selectedFormats.length })}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={submitting || hasInsufficientTokens}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background:
                      submitting || hasInsufficientTokens
                        ? "#d1d5db"
                        : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: submitting || hasInsufficientTokens ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="spin" />
                      {t("cart.placingOrder")}
                    </>
                  ) : (
                    <>
                      {t("cart.placeOrder")}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                {hasInsufficientTokens && (
                  <button
                    onClick={() => (window.location.href = "/buy-tokens")}
                    style={{
                      width: "100%",
                      padding: "12px",
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      marginBottom: "12px",
                    }}
                  >
                    {t("cart.buyMoreTokens")}
                  </button>
                )}

                <button
                  onClick={() => (window.location.href = "/dashboard")}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "white",
                    color: "#374151",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {t("cart.continueShopping")}
                </button>
              </div>
            </div>
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
    </>
  );
}

export default CartContent;

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Sparkles,
  LayoutGrid,
  Package,
  ShoppingCart,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Menu,
  X
} from "lucide-react";
import { getUserProfile, getTokenBalance } from "../services/api";
import './Dashboard.css';

// Import content components
import NewDesignContent from "./content/NewDesignContent";
import MyDesignsContent from "./content/MyDesignsContent";
import CartContent from "./content/CartContent";
import OrdersContent from "./content/OrdersContent";
import BuyTokensContent from "./content/BuyTokensContent";
import SettingsContent from "./content/SettingsContent";
import AdminDashboardContent from "./content/AdminDashboardContent";
import ChatContent from "./content/ChatContent";
import { API_BASE_URL } from "../config";

function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState("User");
  const [userTokens, setUserTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orderRefresh, setOrderRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Get active view from URL path
  const getActiveViewFromPath = () => {
    const pathSegments = location.pathname.split('/');
    const view = pathSegments[pathSegments.length - 1] || "new-design";
    return view;
  };

  useEffect(() => {
    // Check if user is authenticated before making API calls
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      // No token, redirect to signin immediately
      navigate("/signin");
      return;
    }
    
    loadUserData();
    loadTokenBalance();
    loadCartCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const data = await getUserProfile();
      // Backend returns {success: true, user: {...}}
      const user = data.user || data;
      const displayName = user.first_name || user.username || "User";
      setUserName(displayName);
      const isStaffUser = user.is_staff || user.is_superuser || false;
      setIsAdmin(isStaffUser);
      // Redirect admin to admin panel if they're on a customer view
      if (isStaffUser && !location.pathname.includes('admin')) {
        navigate("/dashboard/admin");
      }
      setLoading(false);
    } catch (error) {
      console.error("Error loading user data:", error);
      // If auth fails, redirect to signin
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      navigate("/signin");
    }
  };

  const loadTokenBalance = async () => {
    try {
      const data = await getTokenBalance();
      setUserTokens(data.tokens || 0);
    } catch (error) {
      console.error("Error loading token balance:", error);
    }
  };

  const loadCartCount = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/cart/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setCartCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/signin");
  };

  const handleNavClick = (view) => {
    navigate(`/dashboard/${view}`);
    setSidebarOpen(false);
  };

  const handleChatClick = async (orderId) => {
    // Navigate to chat view with order context
    navigate("/dashboard/chat");
  };

  const renderContent = () => {
    const activeView = getActiveViewFromPath();
    
    switch (activeView) {
      case "new-design":
        return <NewDesignContent onTokenUpdate={loadTokenBalance} />;
      case "my-designs":
        return <MyDesignsContent onEdit={() => navigate("/dashboard/new-design")} onCartUpdate={loadCartCount} />;
      case "cart":
        return <CartContent onTokenUpdate={loadTokenBalance} onCartUpdate={loadCartCount} onCheckout={() => { navigate("/dashboard/orders"); setOrderRefresh(prev => prev + 1); }} />;
      case "orders":
        return <OrdersContent onRefresh={orderRefresh} onChatClick={handleChatClick} />;
      case "buy-tokens":
        return <BuyTokensContent onPurchase={loadTokenBalance} />;
      case "settings":
        return <SettingsContent isAdmin={isAdmin} />;
      case "chat":
        return <ChatContent userRole={isAdmin ? "admin" : "customer"} />;
      case "admin":
        return isAdmin ? <AdminDashboardContent onChatClick={handleChatClick} /> : <NewDesignContent onTokenUpdate={loadTokenBalance} />;
      default:
        return <NewDesignContent onTokenUpdate={loadTokenBalance} />;
    }
  };

  const getPageTitle = () => {
    const activeView = getActiveViewFromPath();
    
    switch (activeView) {
      case "new-design":
        return t("dashboard.titleNewDesign");
      case "my-designs":
        return t("dashboard.titleDashboard");
      case "cart":
        return t("dashboard.titleCart");
      case "orders":
        return t("dashboard.titleOrders");
      case "buy-tokens":
        return t("dashboard.titleTokens");
      case "settings":
        return t("dashboard.titleSettings");
      case "chat":
        return t("dashboard.titleMessages");
      case "admin":
        return t("dashboard.titleAdmin");
      default:
        return t("dashboard.titleNewDesign");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div style={{ textAlign: "center" }}>
          <div className="spinner" />
          <p className="loading-text">{t("dashboard.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img
              src="/WhatsApp%20Image%202026-02-25%20at%206.08.01%20AM.jpeg"
              alt="AI Embroidery Files"
            />
          </div>
          <div>
            <div className="logo-text">Embroidery</div>
            <div className="logo-badge">AI</div>
          </div>
          <button 
            className="sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {isAdmin ? (
            <>
              {/* Admin-only navigation */}
              <NavItem
                icon={Shield}
                label={t("dashboard.navAdmin")}
                active={getActiveViewFromPath() === "admin"}
                onClick={() => handleNavClick("admin")}
                isAdmin={true}
              />
            </>
          ) : (
            <>
              {/* Customer-only navigation */}
              <NavItem
                icon={Sparkles}
                label={t("dashboard.navNewDesign")}
                active={getActiveViewFromPath() === "new-design"}
                onClick={() => handleNavClick("new-design")}
              />
              <NavItem
                icon={LayoutGrid}
                label={t("dashboard.navMyDesigns")}
                active={getActiveViewFromPath() === "my-designs"}
                onClick={() => handleNavClick("my-designs")}
              />
              <NavItem
                icon={ShoppingCart}
                label={t("dashboard.navCart")}
                active={getActiveViewFromPath() === "cart"}
                onClick={() => handleNavClick("cart")}
              />
              <NavItem
                icon={Package}
                label={t("dashboard.navOrders")}
                active={getActiveViewFromPath() === "orders"}
                onClick={() => handleNavClick("orders")}
              />
              <NavItem
                icon={CreditCard}
                label={t("dashboard.navBuyTokens")}
                active={getActiveViewFromPath() === "buy-tokens"}
                onClick={() => handleNavClick("buy-tokens")}
              />
              
            </>
          )}
          <NavItem
            icon={SettingsIcon}
            label={t("dashboard.navSettings")}
            active={getActiveViewFromPath() === "settings"}
            onClick={() => handleNavClick("settings")}
          />
        </div>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          {/* Token Balance */}
          <div className="token-balance">
            <div className="token-header">
              <span className="token-label">{t("dashboard.tokenLabel")}</span>
              <span className="token-amount">{t("dashboard.tokenLeft", { count: userTokens })}</span>
            </div>
            <div className="token-bar">
              <div
                className="token-fill"
                style={{
                  width: `${Math.min((userTokens / 50) * 100, 100)}%`,
                }}
              />
            </div>
            <button
              onClick={() => handleNavClick("buy-tokens")}
              className="topup-button"
            >
              {t("dashboard.topup")}
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="signout-button"
          >
            <LogOut size={18} />
            <span>{t("dashboard.signOut")}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Header */}
        <div className="dashboard-header">
          <button 
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h1 className="header-title">
            {getPageTitle()}
          </h1>
          <div className="header-actions">
            <div
              className="header-icon-wrapper"
              onClick={() => handleNavClick("cart")}
              style={{ position: 'relative', cursor: 'pointer' }}
              title="Cart"
            >
              <ShoppingCart size={20} className="notification-icon" />
              {cartCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '700',
                    minWidth: '18px',
                    height: '18px',
                    borderRadius: '9px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                    lineHeight: '1',
                    border: '2px solid white',
                  }}
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <div
              className="user-profile"
              onClick={() => handleNavClick("settings")}
            >
              <div className="profile-avatar">
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="profile-info">
                <div className="profile-name">
                  {userName}
                </div>
                <div className="profile-plan">{t("dashboard.proPlan")}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

// Helper Component
function NavItem({ icon: Icon, label, active, onClick, isAdmin }) {
  return (
    <div
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''} ${isAdmin && active ? 'admin' : ''}`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}

export default Dashboard;

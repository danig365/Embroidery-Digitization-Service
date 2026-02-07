import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  LayoutGrid,
  Package,
  ShoppingCart,
  CreditCard,
  Settings as SettingsIcon,
  LogOut,
  Bell,
  Shield,
  Menu,
  X,
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

function Dashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("new-design");
  const [userName, setUserName] = useState("User");
  const [userTokens, setUserTokens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [orderRefresh, setOrderRefresh] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      // Set initial view based on user type
      if (isStaffUser) {
        setActiveView("admin");
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

  const handleSignOut = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/signin");
  };

  const handleNavClick = (view) => {
    setActiveView(view);
    setSidebarOpen(false);
  };

  const handleChatClick = async (orderId) => {
    // Navigate to chat view with order context
    setActiveView("chat");
  };

  const renderContent = () => {
    switch (activeView) {
      case "new-design":
        return <NewDesignContent onTokenUpdate={loadTokenBalance} />;
      case "my-designs":
        return <MyDesignsContent onEdit={() => setActiveView("new-design")} />;
      case "cart":
        return <CartContent onTokenUpdate={loadTokenBalance} onCheckout={() => { setActiveView("orders"); setOrderRefresh(prev => prev + 1); }} />;
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
    switch (activeView) {
      case "new-design":
        return "New Design";
      case "my-designs":
        return "dashboard";
      case "cart":
        return "cart";
      case "orders":
        return "orders";
      case "buy-tokens":
        return "tokens";
      case "settings":
        return "settings";
      case "chat":
        return "messages";
      case "admin":
        return "admin";
      default:
        return "New Design";
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div style={{ textAlign: "center" }}>
          <div className="spinner" />
          <p className="loading-text">Loading...</p>
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
            <Sparkles size={22} color="white" />
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
                label="Admin Panel"
                active={activeView === "admin"}
                onClick={() => handleNavClick("admin")}
                isAdmin={true}
              />
              <NavItem
                icon={Bell}
                label="Messages"
                active={activeView === "chat"}
                onClick={() => handleNavClick("chat")}
              />
            </>
          ) : (
            <>
              {/* Customer-only navigation */}
              <NavItem
                icon={Sparkles}
                label="New Design"
                active={activeView === "new-design"}
                onClick={() => handleNavClick("new-design")}
              />
              <NavItem
                icon={LayoutGrid}
                label="My Designs"
                active={activeView === "my-designs"}
                onClick={() => handleNavClick("my-designs")}
              />
              <NavItem
                icon={ShoppingCart}
                label="Cart"
                active={activeView === "cart"}
                onClick={() => handleNavClick("cart")}
              />
              <NavItem
                icon={Package}
                label="Orders"
                active={activeView === "orders"}
                onClick={() => handleNavClick("orders")}
              />
              <NavItem
                icon={CreditCard}
                label="Buy Tokens"
                active={activeView === "buy-tokens"}
                onClick={() => handleNavClick("buy-tokens")}
              />
              <NavItem
                icon={Bell}
                label="Messages"
                active={activeView === "chat"}
                onClick={() => handleNavClick("chat")}
              />
            </>
          )}
          <NavItem
            icon={SettingsIcon}
            label="Settings"
            active={activeView === "settings"}
            onClick={() => handleNavClick("settings")}
          />
        </div>

        {/* Bottom Section */}
        <div className="sidebar-bottom">
          {/* Token Balance */}
          <div className="token-balance">
            <div className="token-header">
              <span className="token-label">Tokens</span>
              <span className="token-amount">{userTokens} left</span>
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
              Top up balance
            </button>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="signout-button"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
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
            <Bell size={20} className="notification-icon" />
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
                <div className="profile-plan">Pro Plan</div>
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

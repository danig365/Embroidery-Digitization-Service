import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import VerifyEmail from "./components/VerifyEmail";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";
import SignUp from "./components/SignUp";
import SignIn from "./components/SignIn";
import Dashboard from "./components/Dashboard";
import PaymentSuccess from "./components/PaymentSuccess";
import PaymentCancel from "./components/PaymentCancel";

function AppWithRouter() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/signin" replace />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-cancel" element={<PaymentCancel />} />
        
        {/* Protected Routes - Dashboard with nested routes for each view */}
        <Route path="/dashboard" element={<Navigate to="/dashboard/new-design" replace />} />
        <Route path="/dashboard/new-design" element={<Dashboard />} />
        <Route path="/dashboard/my-designs" element={<Dashboard />} />
        <Route path="/dashboard/cart" element={<Dashboard />} />
        <Route path="/dashboard/orders" element={<Dashboard />} />
        <Route path="/dashboard/buy-tokens" element={<Dashboard />} />
        <Route path="/dashboard/settings" element={<Dashboard />} />
        <Route path="/dashboard/chat" element={<Dashboard />} />
        <Route path="/dashboard/admin" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default AppWithRouter;


import axios from "axios";

const defaultApiBaseUrl =
  typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:8000/api";

const API_BASE_URL =
  process.env.REACT_APP_API_URL || defaultApiBaseUrl;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increased to 120 seconds for AI operations
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      window.location.href = "/signin";
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const register = async (username, email, password, fullName = "") => {
  const response = await api.post("/auth/register/", {
    username,
    email,
    password,
    full_name: fullName,
  });
  return response.data;
};

export const login = async (username, password) => {
  const response = await api.post("/auth/login/", { username, password });
  return response.data;
};

export const getUserProfile = async () => {
  const response = await api.get("/auth/profile/");
  return response.data;
};

// Token APIs
export const getTokenBalance = async () => {
  const response = await api.get("/tokens/balance/");
  return response.data;
};

export const getTokenPackages = async () => {
  const response = await api.get("/tokens/packages/");
  return response.data;
};

export const purchaseTokens = async (packageId) => {
  const response = await api.post("/tokens/purchase/", {
    package_id: packageId,
  });
  return response.data;
};

// AI Generation - with longer timeout
export const generateAIImage = async (prompt, style = "") => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes timeout

    const response = await api.post(
      "/generate/",
      { prompt, style },
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Image generation is taking too long. Please try again with a simpler prompt."
      );
    }
    throw error;
  }
};

// Embroidery APIs
export const convertToEmbroidery = async (formData) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

    const response = await api.post("/convert/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal: controller.signal,
      timeout: 120000,
    });
    clearTimeout(timeoutId);
    return response.data;
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Conversion is taking too long. Please try with a simpler image."
      );
    }
    throw error;
  }
};

export const getSupportedFormats = async () => {
  const response = await api.get("/formats/");
  return response.data;
};

export const downloadEmbroideryFile = async (patternId, format) => {
  const response = await api.get(`/download/${patternId}/${format}/`, {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `embroidery_${Date.now()}.${format.toLowerCase()}`
  );
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);

  return { success: true };
};

export const getMyDesigns = async () => {
  const response = await api.get("/designs/");
  return response.data;
};

export const checkHealth = async () => {
  const response = await api.get("/health/");
  return response.data;
};
// Add this to services/api.js
// Payment APIs
export const createCheckoutSession = async (packageId) => {
  try {
    const response = await api.post("/payment/create-checkout/", {
      package_id: packageId,
    });
    return response.data;
  } catch (error) {
    console.error("Checkout session error:", error);
    throw error;
  }
};

export const verifyPayment = async (sessionId) => {
  try {
    const response = await api.get("/payment/verify/", {
      params: { session_id: sessionId },
    });
    return response.data;
  } catch (error) {
    console.error("Payment verification error:", error);
    throw error;
  }
};
export const resendVerification = async (email) => {
  const response = await api.post("/auth/resend-verification/", { email });
  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await api.post("/auth/verify-email/", { token });
  return response.data;
};

export const forgotPassword = async (email) => {
  const response = await api.post("/auth/forgot-password/", { email });
  return response.data;
};

export const resetPassword = async (token, newPassword) => {
  const response = await api.post("/auth/reset-password/", {
    token,
    new_password: newPassword
  });
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post("/auth/change-password/", {
    current_password: currentPassword,
    new_password: newPassword
  });
  return response.data;
};

// Token Management APIs (Staff Only)
export const getTokenPackagesManagement = async () => {
  const response = await api.get("/token-packages/");
  return response.data;
};

export const createTokenPackage = async (packageData) => {
  const response = await api.post("/token-packages/", packageData);
  return response.data;
};

export const updateTokenPackage = async (packageId, packageData) => {
  const response = await api.put(`/token-packages/${packageId}/`, packageData);
  return response.data;
};

export const deleteTokenPackage = async (packageId) => {
  const response = await api.delete(`/token-packages/${packageId}/`);
  return response.data;
};

export const setPackagePopular = async (packageId) => {
  const response = await api.post(`/token-packages/${packageId}/popularity/`);
  return response.data;
};

export const getTokenPackageStats = async () => {
  const response = await api.post("/token-packages/stats/");
  return response.data;
};

export const validateCartBeforeCheckout = async () => {
  const response = await api.post("/cart/validate/");
  return response.data;
};

// Design Features APIs (Staff & Customer)
export const getDesignFeatures = async () => {
  const response = await api.get("/features/");
  return response.data;
};

export const createDesignFeature = async (featureData) => {
  const response = await api.post("/features/", featureData);
  return response.data;
};

export const updateDesignFeature = async (featureId, featureData) => {
  const response = await api.put(`/features/${featureId}/`, featureData);
  return response.data;
};

export const deleteDesignFeature = async (featureId) => {
  const response = await api.delete(`/features/${featureId}/`);
  return response.data;
};

export const getAvailableFeatures = async () => {
  const response = await api.get("/features/available/");
  return response.data;
};

export const addFeatureToDesign = async (designId, featureId) => {
  const response = await api.post("/designs/features/add/", {
    design_id: designId,
    feature_id: featureId,
  });
  return response.data;
};

export const removeFeatureFromDesign = async (designId, featureId) => {
  const response = await api.post("/designs/features/remove/", {
    design_id: designId,
    feature_id: featureId,
  });
  return response.data;
};

export const getDesignFeatureUsages = async (designId) => {
  const response = await api.get(`/designs/${designId}/features/`);
  return response.data;
};

export const getFeatureUsageStats = async () => {
  const response = await api.get("/features/stats/");
  return response.data;
};

export const getTokenCosts = async () => {
  const response = await api.get("/tokens/costs/");
  return response.data;
};

export default api;

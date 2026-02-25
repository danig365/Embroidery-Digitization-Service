import React, { useState, useEffect } from "react";
import { Coins, Sparkles, Check, CreditCard, Zap, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getTokenPackages, getTokenCosts } from "../../services/api";
import './ContentStyles.css';

function BuyTokensContent() {
  const { t } = useTranslation();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingPackageId, setProcessingPackageId] = useState(null);
  const [tokenCosts, setTokenCosts] = useState({ ai_image_generation: 2 });

  useEffect(() => {
    loadPackages();
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
    }
  };

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await getTokenPackages();
      setPackages(data);
      setError("");
    } catch (err) {
      setError(t("buyTokens.failedLoadPackages"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageId) => {
    try {
      setProcessingPackageId(packageId);

      const { default: api } = await import("../../services/api");
      const response = await api.post("/payment/create-checkout/", {
        package_id: packageId,
      });

      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error(t("buyTokens.noCheckoutUrl"));
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(err.response?.data?.error || t("buyTokens.failedCheckout"));
      setProcessingPackageId(null);
    }
  };

  const features = [
    {
      icon: Zap,
      title: t("buyTokens.featureInstantTitle"),
      description: t("buyTokens.featureInstantDesc"),
    },
    {
      icon: Shield,
      title: t("buyTokens.featureSecureTitle"),
      description: t("buyTokens.featureSecureDesc"),
    },
    {
      icon: CreditCard,
      title: t("buyTokens.featureFlexibleTitle"),
      description: t("buyTokens.featureFlexibleDesc"),
    },
    {
      icon: Sparkles,
      title: t("buyTokens.featureEmailTitle"),
      description: t("buyTokens.featureEmailDesc"),
    },
  ];

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="content-header">
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "48px",
            height: "48px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "12px",
            marginBottom: "12px",
          }}
        >
          <Coins size={24} style={{ color: "white" }} />
        </div>

        <h1
          style={{
            fontSize: "16px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "8px",
          }}
        >
          {t("buyTokens.title")}
        </h1>

        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0" }}>
          {t("buyTokens.tokensPerDesign", { count: tokenCosts.ai_image_generation })}
        </p>
      </div>

      <div className="content-main">
        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: "10px 12px",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "12px",
              marginBottom: "12px",
              fontSize: "12px",
            }}
          >
            {error}
          </div>
        )}

        {/* Packages Grid */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: "3px solid #e5e7eb",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
          </div>
        ) : (
          <div className="tokens-grid">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                onPurchase={() => handlePurchase(pkg.id)}
                processing={processingPackageId === pkg.id}
                t={t}
              />
            ))}
          </div>
        )}

        {/* Features Grid */}
        <div>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#111827",
              textAlign: "center",
              marginBottom: "12px",
              marginTop: "16px",
            }}
          >
            {t("buyTokens.whyBuy")}
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "10px",
            }}
          >
            {features.map((feature, index) => (
              <FeatureCard key={index} feature={feature} />
            ))}
          </div>
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

function PackageCard({ pkg, onPurchase, processing, t }) {
  const isPopular = pkg.name.toLowerCase().includes("pro");

  return (
    <div className="token-package" style={{ position: "relative" }}>
      {isPopular && (
        <div
          className="token-package-badge"
        >
          {t("buyTokens.mostPopular")}
        </div>
      )}

      <div style={{ marginBottom: "12px", textAlign: "center" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "6px",
          }}
        >
          {pkg.name}
        </h3>

        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px" }}>
          <span
            style={{
              fontSize: "20px",
              fontWeight: "800",
              color: "#111827",
            }}
          >
            ${pkg.price}
          </span>
          <span style={{ fontSize: "11px", color: "#6b7280" }}>USD</span>
        </div>

        <div
          style={{
            marginTop: "10px",
            padding: "6px 10px",
            background: "#f3f4f6",
            borderRadius: "8px",
            display: "inline-block",
          }}
        >
          <span style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>
            {pkg.tokens}
          </span>
          <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "4px" }}>
            {t("buyTokens.tokens")}
          </span>
        </div>
      </div>

      {pkg.description && (
        <p
          style={{
            fontSize: "11px",
            color: "#6b7280",
            textAlign: "center",
            marginBottom: "12px",
            minHeight: "auto",
          }}
        >
          {pkg.description}
        </p>
      )}

      <button
        onClick={onPurchase}
        disabled={processing}
        className="token-buy-btn"
        style={{
          background: processing
            ? "#9ca3af"
            : isPopular
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : "#3b82f6",
        }}
      >
        {processing ? (
          <>
            <div
              style={{
                width: "14px",
                height: "14px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            {t("buyTokens.processing")}
          </>
        ) : (
          <>
            {t("buyTokens.buyNow")}
          </>
        )}
      </button>

      {pkg.features && pkg.features.length > 0 && (
        <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
          {pkg.features.map((feature, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <Check size={14} style={{ color: "#10b981", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", color: "#374151" }}>{feature}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FeatureCard({ feature }) {
  const Icon = feature.icon;

  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "12px",
        textAlign: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          background: "#ede9fe",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={20} style={{ color: "#7c3aed" }} />
      </div>

      <div style={{ textAlign: "left" }}>
        <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#111827", marginBottom: "2px", margin: 0 }}>
          {feature.title}
        </h4>

        <p style={{ fontSize: "11px", color: "#6b7280", margin: 0 }}>{feature.description}</p>
      </div>
    </div>
  );
}

export default BuyTokensContent;

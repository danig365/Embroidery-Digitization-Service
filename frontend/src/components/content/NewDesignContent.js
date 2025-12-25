import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Sparkles,
  Type,
  Palette,
  Settings as SettingsIcon,
  Loader2,
  ShoppingCart,
  Save,
  Trash2,
  Plus,
  X,
  Search,
} from "lucide-react";
import { API_BASE_URL, buildImageUrl } from '../../config';
import { LoadingOverlay } from '../LoadingSpinner';
import { getTokenCosts } from '../../services/api';
import './NewDesignContent.css';

function NewDesignContent({ onTokenUpdate }) {
  const fileInputRef = useRef(null);

  // Active tab state
  const [activeTab, setActiveTab] = useState(0);

  // Design state
  const [designId, setDesignId] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [normalImage, setNormalImage] = useState(null);
  const [embroideryPreview, setEmbroideryPreview] = useState(null);

  // Token Costs - Only AI generation and order placement
  const [tokenCosts, setTokenCosts] = useState({
    ai_image_generation: 2,
    order_placement: 1
  });

  // AI Generation fields
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiStyle, setAiStyle] = useState("Realistic");
  const [aiSize, setAiSize] = useState("1024x1024");

  // Text Layer fields
  const [textContent, setTextContent] = useState("");
  const [textFont, setTextFont] = useState("Arial");
  const [textStyle, setTextStyle] = useState("Regular");
  const [fontSize, setFontSize] = useState(36);
  const [textColor, setTextColor] = useState("#000000");
  const [outlineColor, setOutlineColor] = useState("#FFFFFF");
  const [outlineThickness, setOutlineThickness] = useState(2);
  const [textX, setTextX] = useState(50);
  const [textY, setTextY] = useState(50);

  // Thread Colors
  const [selectedThreadColors, setSelectedThreadColors] = useState([]);
  const [threadBrand, setThreadBrand] = useState("Madeira");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorSearchTerm, setColorSearchTerm] = useState("");
  const [threadNotes, setThreadNotes] = useState("");

  // Advanced Settings
  const [stitchDensity, setStitchDensity] = useState(5);
  const [stitchType, setStitchType] = useState("Satin");
  const [designWidth, setDesignWidth] = useState(100);
  const [designHeight, setDesignHeight] = useState(100);
  const [hoopSize, setHoopSize] = useState("100x100mm");
  const [rotation, setRotation] = useState(0);
  const [mirrorH, setMirrorH] = useState(false);
  const [mirrorV, setMirrorV] = useState(false);
  const [underlay, setUnderlay] = useState(true);
  const [jumpTrim, setJumpTrim] = useState(true);
  const [embroiderySizeCm, setEmbroiderySizeCm] = useState(10);

  const aiStyles = ["Realistic", "Cartoon", "Minimalist", "Vintage", "Modern", "Abstract", 
                    "Floral", "Geometric", "Traditional", "Watercolor", "Line Art", "Pixel Art"];
  const aiSizes = ["1024x1024", "1024x1792", "1792x1024"];
  const fonts = ["Arial", "Times New Roman", "Courier", "Georgia", "Verdana"];
  const threadBrands = ["Madeira", "Isacord", "Robison-Anton"];
  const stitchTypes = ["Satin", "Fill", "Running", "Bean"];
  const hoopSizes = ["100x100mm", "130x180mm", "200x200mm", "Custom"];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Thread Color Catalogs
  const threadCatalogs = {
    Madeira: [
      { code: "1001", name: "White", hex: "#FFFFFF" },
      { code: "1147", name: "Bright Red", hex: "#E31E24" },
      { code: "1181", name: "Cherry Red", hex: "#C1272D" },
      { code: "1032", name: "Fire Red", hex: "#D81C3F" },
      { code: "1192", name: "Pink", hex: "#F7A5C6" },
      { code: "1060", name: "Hot Pink", hex: "#E93B81" },
      { code: "1109", name: "Orange", hex: "#FF6B35" },
      { code: "1030", name: "Tangerine", hex: "#FF8C42" },
      { code: "1068", name: "Yellow", hex: "#FFD700" },
      { code: "1024", name: "Lemon Yellow", hex: "#FFF44F" },
      { code: "1051", name: "Lime Green", hex: "#BFFF00" },
      { code: "1216", name: "Kelly Green", hex: "#4CBB17" },
      { code: "1305", name: "Emerald Green", hex: "#50C878" },
      { code: "1216", name: "Forest Green", hex: "#228B22" },
      { code: "1082", name: "Turquoise", hex: "#40E0D0" },
      { code: "1091", name: "Sky Blue", hex: "#87CEEB" },
      { code: "1134", name: "Royal Blue", hex: "#4169E1" },
      { code: "1195", name: "Navy Blue", hex: "#000080" },
      { code: "1177", name: "Purple", hex: "#800080" },
      { code: "1188", name: "Lavender", hex: "#E6E6FA" },
      { code: "1114", name: "Brown", hex: "#8B4513" },
      { code: "1005", name: "Black", hex: "#000000" },
      { code: "1071", name: "Gray", hex: "#808080" },
      { code: "1161", name: "Gold", hex: "#FFD700" },
      { code: "1003", name: "Silver", hex: "#C0C0C0" },
    ],
    Isacord: [
      { code: "0010", name: "White", hex: "#FFFFFF" },
      { code: "1902", name: "Fire Engine", hex: "#DC143C" },
      { code: "1805", name: "Candy Apple", hex: "#FF0800" },
      { code: "1701", name: "Poppy", hex: "#E25822" },
      { code: "2160", name: "Bubblegum Pink", hex: "#FF69B4" },
      { code: "2922", name: "Hot Pink", hex: "#FF1493" },
      { code: "1220", name: "Tangerine", hex: "#FFA500" },
      { code: "0811", name: "Bright Orange", hex: "#FF8C00" },
      { code: "0600", name: "Buttercup", hex: "#FFD700" },
      { code: "0501", name: "Canary", hex: "#FFFF00" },
      { code: "5833", name: "Lime", hex: "#00FF00" },
      { code: "5912", name: "Emerald", hex: "#50C878" },
      { code: "5552", name: "Kelly", hex: "#4CBB17" },
      { code: "5326", name: "Jungle Green", hex: "#2E8B57" },
      { code: "4620", name: "Aqua", hex: "#00FFFF" },
      { code: "3951", name: "Turquoise", hex: "#40E0D0" },
      { code: "3900", name: "Azure Blue", hex: "#007FFF" },
      { code: "3543", name: "Royal Blue", hex: "#4169E1" },
      { code: "3255", name: "Navy", hex: "#000080" },
      { code: "2920", name: "Purple", hex: "#800080" },
      { code: "3040", name: "Lavender", hex: "#E6E6FA" },
      { code: "1055", name: "Rust", hex: "#B7410E" },
      { code: "0020", name: "Black", hex: "#000000" },
      { code: "0142", name: "Pewter", hex: "#A8A8A8" },
      { code: "0821", name: "Gold", hex: "#FFD700" },
    ],
    "Robison-Anton": [
      { code: "2501", name: "Super White", hex: "#FFFFFF" },
      { code: "2519", name: "Bright Red", hex: "#FF0000" },
      { code: "2520", name: "Cherry Red", hex: "#D2042D" },
      { code: "2378", name: "Scarlet", hex: "#FF2400" },
      { code: "2508", name: "Pink", hex: "#FFC0CB" },
      { code: "2513", name: "Hot Pink", hex: "#FF69B4" },
      { code: "2432", name: "Orange", hex: "#FFA500" },
      { code: "2557", name: "Pumpkin", hex: "#FF7518" },
      { code: "2512", name: "Daffodil", hex: "#FFFF31" },
      { code: "2504", name: "Lemon", hex: "#FFF700" },
      { code: "2427", name: "Neon Green", hex: "#39FF14" },
      { code: "2528", name: "Emerald", hex: "#50C878" },
      { code: "2537", name: "Kelly", hex: "#4CBB17" },
      { code: "2555", name: "Spruce", hex: "#0A5F38" },
      { code: "2510", name: "Aqua", hex: "#00FFFF" },
      { code: "2506", name: "Turquoise", hex: "#30D5C8" },
      { code: "2545", name: "Delft Blue", hex: "#1F456E" },
      { code: "2525", name: "Royal", hex: "#4169E1" },
      { code: "2527", name: "Pro Navy", hex: "#000080" },
      { code: "2548", name: "Purple", hex: "#800080" },
      { code: "2553", name: "Lavender", hex: "#B57EDC" },
      { code: "2556", name: "TH Burgundy", hex: "#800020" },
      { code: "2515", name: "Black", hex: "#000000" },
      { code: "2517", name: "Metal", hex: "#A8A8A8" },
      { code: "2507", name: "TH Gold", hex: "#FFD700" },
    ],
  };

  const handleAddThreadColor = (color) => {
    // Check if already added
    const exists = selectedThreadColors.find(
      (c) => c.code === color.code && c.brand === threadBrand
    );
    if (!exists) {
      setSelectedThreadColors([
        ...selectedThreadColors,
        { ...color, brand: threadBrand },
      ]);
    }
    setShowColorPicker(false);
    setColorSearchTerm("");
  };

  const handleRemoveThreadColor = (index) => {
    setSelectedThreadColors(selectedThreadColors.filter((_, i) => i !== index));
  };

  // Load token costs on component mount
  useEffect(() => {
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
    loadTokenCosts();
  }, []);

  // Tab 1: Upload Image Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setMessage("❌ File size exceeds 10MB limit");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("❌ Invalid file type. Only PNG, JPG, JPEG allowed.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("uploaded_image", file);
      formData.append("name", "Untitled Design");
      
      // TEXT LAYER - FULL DETAILS
      formData.append("text_content", textContent);
      formData.append("text_font", textFont);
      formData.append("text_style", textStyle);
      formData.append("text_size", fontSize);
      formData.append("text_color", textColor);
      formData.append("text_outline_color", outlineColor);
      formData.append("text_outline_thickness", outlineThickness);
      formData.append("text_position_x", textX);
      formData.append("text_position_y", textY);
      
      // THREAD COLORS - FULL DETAILS
      formData.append("thread_colors", JSON.stringify(selectedThreadColors));
      formData.append("thread_brand", threadBrand);
      formData.append("thread_notes", threadNotes);
      
      // EMBROIDERY SETTINGS - FULL DETAILS
      formData.append("stitch_density", stitchDensity);
      formData.append("stitch_type", stitchType);
      formData.append("auto_trim", "true");
      formData.append("underlay", underlay);
      formData.append("jump_trim", jumpTrim);
      
      // CANVAS SETTINGS
      formData.append("canvas_width", 1200);
      formData.append("canvas_height", 1200);
      formData.append("design_width", designWidth);
      formData.append("design_height", designHeight);
      formData.append("hoop_size", hoopSize);
      formData.append("rotation", rotation);
      formData.append("mirror_horizontal", mirrorH);
      formData.append("mirror_vertical", mirrorV);

      const response = await fetch(`${API_BASE_URL}/designs/upload/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      const data = await response.json();

      console.log("📤 Upload Response:", data);
      console.log("   uploaded_image:", data.design?.uploaded_image);
      console.log("   normal_image:", data.design?.normal_image);

      if (response.ok && data.success) {
        setDesignId(data.design.id);
        // Set both uploaded_image and normal_image from response
        const uploadedImageUrl = buildImageUrl(data.design.uploaded_image);
        const normalImageUrl = buildImageUrl(data.design.normal_image);
        
        console.log("📸 Setting images:");
        console.log("   uploadedImageUrl:", uploadedImageUrl);
        console.log("   normalImageUrl:", normalImageUrl);
        
        setUploadedImage(uploadedImageUrl);
        // normal_image is the processed image (with text overlay if text was added)
        if (normalImageUrl) {
          setNormalImage(normalImageUrl);
        }
        setMessage("✅ Image uploaded successfully!");
      } else {
        setMessage(`❌ ${data.error || "Upload failed"}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage("❌ Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Tab 2: Generate AI Image
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      setMessage("❌ Please enter a prompt");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/generate-ai-image/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          style: aiStyle,
          size: aiSize,
          // TEXT LAYER - FULL DETAILS
          text_content: textContent,
          text_font: textFont,
          text_style: textStyle,
          text_size: fontSize,
          text_color: textColor,
          text_outline_color: outlineColor,
          text_outline_thickness: outlineThickness,
          text_position_x: textX,
          text_position_y: textY,
          // THREAD COLORS - FULL DETAILS
          thread_colors: selectedThreadColors,
          thread_brand: threadBrand,
          thread_notes: threadNotes,
          // EMBROIDERY SETTINGS - FULL DETAILS
          stitch_density: stitchDensity,
          stitch_type: stitchType,
          auto_trim: true,
          underlay: underlay,
          jump_trim: jumpTrim,
          // CANVAS SETTINGS
          canvas_width: 1200,
          canvas_height: 1200,
          design_width: designWidth,
          design_height: designHeight,
          hoop_size: hoopSize,
          rotation: rotation,
          mirror_horizontal: mirrorH,
          mirror_vertical: mirrorV,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDesignId(data.design.id);
        
        // Handle normal_image URL
        const normalImageUrl = buildImageUrl(data.design.normal_image);
        setNormalImage(normalImageUrl);
        
        // Also set embroidery preview if it was generated
        if (data.design.embroidery_preview) {
          const embroideryUrl = buildImageUrl(data.design.embroidery_preview);
          setEmbroideryPreview(embroideryUrl);
        }
        
        if (onTokenUpdate) onTokenUpdate();
        setMessage(`✅ AI images generated! Both normal and embroidery preview created. Cost: ${tokenCosts.ai_image_generation} tokens`);
      } else {
        setMessage(`❌ ${data.error || "Generation failed"}`);
      }
    } catch (error) {
      console.error("AI generation error:", error);
      setMessage("❌ Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Embroidery Preview
  const handleGenerateEmbroideryPreview = async () => {
    if (!designId) {
      setMessage("❌ Upload or generate an image first");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/generate-embroidery-preview/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          design_id: designId,
          size: aiSize,
        }),
      });

      const data = await response.json();
      
      console.log("🎨 Preview Response:", data);
      console.log("   embroidery_preview raw:", data.design?.embroidery_preview);

      if (response.ok && data.success) {
        const previewUrl = buildImageUrl(data.design.embroidery_preview);
        
        console.log("   embroidery_preview final:", previewUrl);
        setEmbroideryPreview(previewUrl);
        
        if (onTokenUpdate) onTokenUpdate();
        setMessage(`✅ Embroidery preview generated!`);
      } else {
        setMessage(`❌ ${data.error || "Preview generation failed"}`);
      }
    } catch (error) {
      console.error("Preview generation error:", error);
      setMessage("❌ Preview generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Save Design
  const handleSaveDesign = async () => {
    if (!designId) {
      setMessage("⚠️ No design to save");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/designs/${designId}/update/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "My Design",
          // Text Layer Settings
          text_content: textContent,
          text_font: textFont,
          text_style: textStyle,
          text_size: fontSize,
          text_color: textColor,
          text_outline_color: outlineColor,
          text_outline_thickness: outlineThickness,
          text_position_x: textX,
          text_position_y: textY,
          // Thread Colors
          thread_colors: selectedThreadColors,
          thread_brand: selectedThreadColors.length > 0 ? selectedThreadColors[0].brand : "Madeira",
          thread_notes: threadNotes,
          // Embroidery Settings
          stitch_type: stitchType,
          stitch_density: stitchDensity,
          auto_trim: true,
          underlay: underlay,
          jump_trim: jumpTrim,
          // Canvas/Design Settings
          design_width: designWidth,
          design_height: designHeight,
          hoop_size: hoopSize,
          rotation: rotation,
          mirror_horizontal: mirrorH,
          mirror_vertical: mirrorV,
          // Embroidery Size
          embroidery_size_cm: embroiderySizeCm,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setMessage("✅ Design saved successfully!");
      } else {
        setMessage(`❌ ${data.error || "Save failed"}`);
      }
    } catch (error) {
      console.error("Save error:", error);
      setMessage("❌ Save failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add to Cart
  const handleAddToCart = async () => {
    if (!designId) {
      setMessage("⚠️ No design to add to cart");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/cart/add/${designId}/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (onTokenUpdate) onTokenUpdate();
        setMessage(`✅ Added to cart!`);
      } else {
        setMessage(`❌ ${data.error || "Failed to add to cart"}`);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      setMessage("❌ Failed to add to cart. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setDesignId(null);
    setUploadedImage(null);
    setNormalImage(null);
    setEmbroideryPreview(null);
    setAiPrompt("");
    setTextContent("");
    setMessage("✅ Canvas cleared");
  };

  const tabs = [
    { id: 0, name: "Upload Image", icon: Upload },
    { id: 1, name: "Generate with AI", icon: Sparkles },
    { id: 2, name: "Add Text Layer", icon: Type },
    { id: 3, name: "Thread Colors", icon: Palette },
    { id: 4, name: "Advanced Settings", icon: SettingsIcon },
  ];

  return (
    <>
      <LoadingOverlay visible={loading} text="Processing your design..." />
      <div className="new-design-wrapper">
        {/* Canvas Area */}
        <div className="design-canvas-area">
          {/* Tab Navigation */}
        <div className="design-tab-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`design-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <tab.icon size={16} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Canvas/Content Area */}
        <div className="design-content-area">
          {/* Tab Content */}
          {activeTab === 0 && (
            // Tab 1: Upload Image
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              {normalImage ? (
                <div style={{ textAlign: "center" }}>
                  <img
                    src={normalImage}
                    alt="Normal Image"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "500px",
                      borderRadius: "10px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    }}
                  />
                  <p style={{ marginTop: "16px", color: "#6B7280", fontSize: "14px" }}>
                    Image with Applied Effects
                  </p>
                </div>
              ) : (
                <div
                  style={{ textAlign: "center", padding: "40px", cursor: "pointer", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const fakeEvent = { target: { files: [file] } };
                      handleFileUpload(fakeEvent);
                    }
                  }}
                >
                  <div
                    style={{
                      width: "100px",
                      height: "100px",
                      margin: "0 auto 20px",
                      background: "#F3F4F6",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Upload size={40} color="#9CA3AF" />
                  </div>
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "8px" }}>
                    Upload your image
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "16px" }}>
                    Drag and drop your PNG, JPG, or JPEG here
                    <br />
                    or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleFileUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    style={{
                      padding: "10px 24px",
                      background: "white",
                      border: "1px solid #D1D5DB",
                      borderRadius: "8px",
                      color: "#374151",
                      fontWeight: "500",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Browse Files
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 1 && (
            // Tab 2: Generate with AI
            <div style={{ width: "100%", maxWidth: "800px" }}>
              {normalImage || embroideryPreview ? (
                <div>
                  <div style={{ display: "flex", gap: "20px", justifyContent: "center", marginBottom: "20px", flexWrap: "wrap" }}>
                    {normalImage && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={normalImage}
                          alt="Normal"
                          style={{
                            maxWidth: "350px",
                            maxHeight: "350px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        />
                        <p style={{ marginTop: "10px", color: "#6B7280", fontSize: "13px", fontWeight: "500" }}>
                          Normal Image
                        </p>
                      </div>
                    )}
                    {embroideryPreview && (
                      <div style={{ textAlign: "center" }}>
                        <img
                          src={embroideryPreview}
                          alt="Embroidery Preview"
                          style={{
                            maxWidth: "350px",
                            maxHeight: "350px",
                            borderRadius: "10px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          }}
                        />
                        <p style={{ marginTop: "10px", color: "#6B7280", fontSize: "13px", fontWeight: "500" }}>
                          Embroidery Preview
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Sparkles size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
                    Generate with AI
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px", marginBottom: "8px" }}>
                    Enter your prompt to generate an image
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 2 && (
            // Tab 3: Add Text Layer
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", overflow: "auto" }}>
              {(embroideryPreview || uploadedImage || normalImage) ? (
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img
                    src={embroideryPreview || uploadedImage || normalImage}
                    alt="Design"
                    style={{
                      width: "auto",
                      height: "auto",
                      maxWidth: "700px",
                      maxHeight: "400px",
                      borderRadius: "10px",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                      display: "block",
                    }}
                  />
                  {textContent && (
                    <div
                      style={{
                        position: "absolute",
                        left: `${textX}%`,
                        top: `${textY}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: textFont,
                          fontSize: `${fontSize}px`,
                          color: textColor,
                          textShadow: `0 0 ${outlineThickness}px ${outlineColor}, 0 0 ${outlineThickness}px ${outlineColor}`,
                          margin: 0,
                          whiteSpace: "nowrap",
                          fontWeight: textStyle.includes("Bold") ? "bold" : "normal",
                          fontStyle: textStyle.includes("Italic") ? "italic" : "normal",
                        }}
                      >
                        {textContent}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <Type size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                    Add Text Layer
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px" }}>
                    Upload or generate an image first, then add text overlay
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 3 && (
            // Tab 4: Thread Colors
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px", overflowY: "auto" }}>
              <div style={{ width: "100%", maxWidth: "650px" }}>
                <div style={{ textAlign: "center", marginBottom: "30px" }}>
                  <Palette size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
                  <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                    Thread Colors
                  </h3>
                  <p style={{ color: "#6B7280", fontSize: "14px" }}>
                    Select professional embroidery thread colors for your design
                  </p>
                </div>

                {/* Selected Colors */}
                {selectedThreadColors.length > 0 && (
                  <div style={{ marginBottom: "30px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>
                      Selected Colors ({selectedThreadColors.length})
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {selectedThreadColors.map((color, index) => (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "12px 16px",
                            background: "white",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                          }}
                        >
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              background: color.hex,
                              borderRadius: "6px",
                              border: "2px solid #E5E7EB",
                              flexShrink: 0,
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                              {color.brand} {color.code}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6B7280" }}>{color.name}</div>
                          </div>
                          <button
                            onClick={() => handleRemoveThreadColor(index)}
                            style={{
                              padding: "6px",
                              background: "#FEE2E2",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <X size={16} color="#991B1B" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Color Button */}
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "white",
                    border: "2px dashed #D1D5DB",
                    borderRadius: "8px",
                    color: "#6B7280",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    marginBottom: "20px",
                  }}
                >
                  <Plus size={18} />
                  Add Thread Color
                </button>

                {/* Thread Notes */}
                {selectedThreadColors.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "8px",
                      }}
                    >
                      Color Notes (Optional)
                    </label>
                    <textarea
                      value={threadNotes}
                      onChange={(e) => setThreadNotes(e.target.value)}
                      placeholder="E.g., Use gold thread for crown, red for rose petals..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "inherit",
                        minHeight: "80px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Color Picker Modal */}
          {showColorPicker && (
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
                  onClick={() => setShowColorPicker(false)}
                >
                  <div
                    style={{
                      background: "white",
                      borderRadius: "16px",
                      maxWidth: "600px",
                      width: "100%",
                      maxHeight: "80vh",
                      overflowY: "auto",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div
                      style={{
                        padding: "20px",
                        borderBottom: "1px solid #E5E7EB",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#111827", margin: 0 }}>
                        {threadBrand} Thread Catalog
                      </h3>
                      <button
                        onClick={() => setShowColorPicker(false)}
                        style={{
                          background: "none",
                          border: "none",
                          fontSize: "24px",
                          cursor: "pointer",
                          color: "#6B7280",
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <div style={{ padding: "20px" }}>
                      {/* Search */}
                      <div style={{ position: "relative", marginBottom: "20px" }}>
                        <Search
                          size={18}
                          color="#9CA3AF"
                          style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Search by code or name..."
                          value={colorSearchTerm}
                          onChange={(e) => setColorSearchTerm(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "10px 12px 10px 40px",
                            border: "1px solid #E5E7EB",
                            borderRadius: "8px",
                            fontSize: "14px",
                            outline: "none",
                          }}
                        />
                      </div>

                      {/* Color Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                          gap: "12px",
                        }}
                      >
                        {threadCatalogs[threadBrand]
                          .filter(
                            (color) =>
                              color.code.toLowerCase().includes(colorSearchTerm.toLowerCase()) ||
                              color.name.toLowerCase().includes(colorSearchTerm.toLowerCase())
                          )
                          .map((color) => (
                            <div
                              key={color.code}
                              onClick={() => handleAddThreadColor(color)}
                              style={{
                                padding: "12px",
                                border: "1px solid #E5E7EB",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                textAlign: "center",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = "#667eea";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = "#E5E7EB";
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: "60px",
                                  background: color.hex,
                                  borderRadius: "6px",
                                  border: "2px solid #E5E7EB",
                                  marginBottom: "8px",
                                }}
                              />
                              <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>
                                {color.code}
                              </div>
                              <div style={{ fontSize: "11px", color: "#6B7280" }}>{color.name}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {activeTab === 4 && (
            // Tab 5: Advanced Settings
            <div style={{ textAlign: "center", width: "100%", maxWidth: "500px" }}>
              <SettingsIcon size={48} color="#9CA3AF" style={{ margin: "0 auto 20px" }} />
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "12px" }}>
                Advanced Settings
              </h3>
              <p style={{ color: "#6B7280", fontSize: "14px" }}>
                Configure detailed embroidery parameters
              </p>
              <div style={{ marginTop: "20px", textAlign: "left" }}>
                <SettingRow label="Stitch Type" value={stitchType} />
                <SettingRow label="Stitch Density" value={`${stitchDensity} stitches/inch`} />
                <SettingRow label="Dimensions" value={`${designWidth} × ${designHeight} mm`} />
                <SettingRow label="Hoop Size" value={hoopSize} />
                <SettingRow label="Rotation" value={`${rotation}°`} />
                <SettingRow label="Mirror H/V" value={`${mirrorH ? "✓" : "✗"} / ${mirrorV ? "✓" : "✗"}`} />
                <SettingRow label="Underlay" value={underlay ? "Enabled" : "Disabled"} />
                <SettingRow label="Jump Trim" value={jumpTrim ? "Enabled" : "Disabled"} />
              </div>
            </div>
          )}
        </div>

        {/* Message Bar */}
        {message && (
          <div className={`design-message-bar ${message.includes("❌") ? 'error' : message.includes("⚠️") ? 'warning' : 'success'}`}>
            <span>{message}</span>
            <button
              onClick={() => setMessage("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
                padding: "0",
                color: "inherit",
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="design-right-panel">
        <div className="design-panel-content">
          {/* Tab 1: Upload Controls */}
          {activeTab === 0 && (
            <Section icon={Upload} title="Upload Settings">
              <InfoText>Supported formats: PNG, JPG, JPEG</InfoText>
              <InfoText>Maximum file size: 10MB</InfoText>
            </Section>
          )}

          {/* Tab 2: AI Generation Controls */}
          {activeTab === 1 && (
            <>
              <Section icon={Sparkles} title="AI Generation">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Prompt
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe what you want to create..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    fontFamily: "inherit",
                    minHeight: "80px",
                    resize: "vertical",
                  }}
                />

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Style
                </label>
                <select
                  value={aiStyle}
                  onChange={(e) => setAiStyle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {aiStyles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Size
                </label>
                <select
                  value={aiSize}
                  onChange={(e) => setAiSize(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "16px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {aiSizes.map((size) => (
                    <option key={size} value={size}>
                      {size === "1024x1024" ? "Small (1024x1024)" : size === "1024x1792" ? "Medium (1024x1792)" : "Large (1792x1024)"}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleGenerateAI}
                  disabled={loading || !aiPrompt.trim() || (normalImage && embroideryPreview)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: loading || !aiPrompt.trim() || (normalImage && embroideryPreview) ? "#93C5FD" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: loading || !aiPrompt.trim() || (normalImage && embroideryPreview) ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      Generating...
                    </>
                  ) : (normalImage && embroideryPreview) ? (
                    <>
                      <Sparkles size={16} />
                      Generated ✓
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Generate ({tokenCosts.ai_image_generation} Tokens)
                    </>
                  )}
                </button>
              </Section>
            </>
          )}

          {/* Tab 3: Text Layer Controls */}
          {activeTab === 2 && (
            <>
              <Section icon={Type} title="Text Content">
                <Input placeholder="Enter text..." value={textContent} onChange={(e) => setTextContent(e.target.value)} />

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Font
                </label>
                <select
                  value={textFont}
                  onChange={(e) => setTextFont(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {fonts.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Font Style
                </label>
                <select
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  <option value="Regular">Regular</option>
                  <option value="Bold">Bold</option>
                  <option value="Italic">Italic</option>
                  <option value="Bold Italic">Bold Italic</option>
                </select>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>Font Size</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{fontSize}px</span>
                </label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />

                <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Text Color
                    </label>
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Outline Color
                    </label>
                    <input
                      type="color"
                      value={outlineColor}
                      onChange={(e) => setOutlineColor(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                </div>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>Outline Thickness</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{outlineThickness}px</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={outlineThickness}
                  onChange={(e) => setOutlineThickness(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />

                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      X Position
                    </label>
                    <input
                      type="number"
                      value={textX}
                      onChange={(e) => setTextX(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Y Position
                    </label>
                    <input
                      type="number"
                      value={textY}
                      onChange={(e) => setTextY(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* Tab 4: Thread Colors Controls */}
          {activeTab === 3 && (
            <Section icon={Palette} title="Thread Settings">
              <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                Thread Brand
              </label>
              <select
                value={threadBrand}
                onChange={(e) => {
                  setThreadBrand(e.target.value);
                  setSelectedThreadColors([]); // Clear selections when brand changes
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  fontSize: "13px",
                  marginBottom: "16px",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: "white",
                }}
              >
                {threadBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              
              {selectedThreadColors.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <div
                    style={{
                      padding: "12px",
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#065F46",
                      fontWeight: "500",
                    }}
                  >
                    ✓ {selectedThreadColors.length} color{selectedThreadColors.length !== 1 ? 's' : ''} selected
                  </div>
                </div>
              )}
              
              <InfoText>
                Click "Add Thread Color" to browse the {threadBrand} catalog and select professional thread colors for your embroidery.
              </InfoText>
            </Section>
          )}

          {/* Tab 5: Advanced Settings Controls */}
          {activeTab === 4 && (
            <>
              <Section icon={SettingsIcon} title="Stitch Configuration">
                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Stitch Type
                </label>
                <select
                  value={stitchType}
                  onChange={(e) => setStitchType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {stitchTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>Stitch Density</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{stitchDensity} stitches/inch</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={stitchDensity}
                  onChange={(e) => setStitchDensity(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
              </Section>

              <Section icon={SettingsIcon} title="Design Dimensions">
                <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Width (mm)
                    </label>
                    <input
                      type="number"
                      value={designWidth}
                      onChange={(e) => setDesignWidth(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                      Height (mm)
                    </label>
                    <input
                      type="number"
                      value={designHeight}
                      onChange={(e) => setDesignHeight(parseInt(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "13px",
                        outline: "none",
                      }}
                    />
                  </div>
                </div>

                <label style={{ display: "block", marginBottom: "8px", fontSize: "13px", fontWeight: "500", color: "#374151" }}>
                  Hoop Size
                </label>
                <select
                  value={hoopSize}
                  onChange={(e) => setHoopSize(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    fontSize: "13px",
                    marginBottom: "12px",
                    outline: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    background: "white",
                  }}
                >
                  {hoopSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>Embroidery Size</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{embroiderySizeCm} cm</span>
                </label>
                <input
                  type="range"
                  min="5"
                  max="40"
                  value={embroiderySizeCm}
                  onChange={(e) => setEmbroiderySizeCm(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
                <p style={{ fontSize: "11px", color: "#9CA3AF", marginBottom: "16px", fontStyle: "italic" }}>
                  Affects the cost of embroidery. Larger sizes cost more tokens.
                </p>

                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: "#374151",
                    marginBottom: "8px",
                  }}
                >
                  <span>Rotation</span>
                  <span style={{ color: "#6B7280", fontWeight: "500" }}>{rotation}°</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                    accentColor: "#667eea",
                    marginBottom: "16px",
                  }}
                />
              </Section>

              <Section icon={SettingsIcon} title="Additional Options">
                <ToggleRow label="Mirror Horizontal" checked={mirrorH} onChange={setMirrorH} />
                <ToggleRow label="Mirror Vertical" checked={mirrorV} onChange={setMirrorV} />
                <ToggleRow label="Underlay" checked={underlay} onChange={setUnderlay} />
                <ToggleRow label="Jump Stitch Trimming" checked={jumpTrim} onChange={setJumpTrim} />
              </Section>
            </>
          )}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="design-panel-actions">
          <button
            onClick={handleSaveDesign}
            disabled={loading || !designId}
            className="design-action-btn primary"
          >
            <Save size={16} />
            Save Design
          </button>

          <button
            onClick={handleAddToCart}
            disabled={loading || !designId}
            className="design-action-btn gradient"
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>

          <div className="design-action-buttons-row">
            <button
              onClick={handleClear}
              disabled={loading}
              className="design-action-btn secondary"
            >
              <Trash2 size={14} />
              Clear
            </button>
          </div>
        </div>
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

// Helper Components
function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
        <Icon size={16} color="#6B7280" />
        <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#374151", margin: 0 }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Input({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%",
        padding: "10px 12px",
        border: "1px solid #E5E7EB",
        borderRadius: "8px",
        fontSize: "13px",
        marginBottom: "12px",
        outline: "none",
        fontFamily: "inherit",
      }}
    />
  );
}

function InfoText({ children }) {
  return (
    <p style={{ fontSize: "12px", color: "#6B7280", margin: "8px 0" }}>
      {children}
    </p>
  );
}

function SettingRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      <span style={{ fontSize: "13px", color: "#374151" }}>{label}</span>
      <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: "500" }}>{value}</span>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #F3F4F6",
      }}
    >
      <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>{label}</label>
      <ToggleSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <label
      style={{
        position: "relative",
        display: "inline-block",
        width: "44px",
        height: "24px",
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: checked ? "#667eea" : "#D1D5DB",
          transition: "0.3s",
          borderRadius: "24px",
        }}
      >
        <span
          style={{
            position: "absolute",
            height: "18px",
            width: "18px",
            left: checked ? "23px" : "3px",
            bottom: "3px",
            background: "white",
            transition: "0.3s",
            borderRadius: "50%",
          }}
        />
      </span>
    </label>
  );
}

export default NewDesignContent;

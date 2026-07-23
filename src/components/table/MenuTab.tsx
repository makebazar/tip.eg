"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Utensils, Minus, Plus, ShoppingBag, Tag, X } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTableState, menuDb, defaultMenuItems } from "@/components/AppStateContext";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { getBusinessMenu } from "@/app/actions/menu";
import { detectGuestLocaleAndTier } from "@/lib/aiTranslation";
import { MenuItem } from "@/lib/menuData";

// Helper component for beautiful image fallbacks
function DishImage({ src, name, category }: { src?: string; name: string; category: string }) {
  const [hasError, setHasError] = useState(!src);

  const getFallbackIcon = () => {
    switch (category) {
      case "drinks": return "🍹";
      case "desserts": return "🍰";
      case "appetizers": return "🥗";
      default: return "🍲";
    }
  };

  const getFallbackGradient = () => {
    switch (category) {
      case "drinks": return "from-cyan-50 to-blue-100 text-cyan-600 border-cyan-200/50";
      case "desserts": return "from-pink-50 to-rose-100 text-rose-600 border-rose-200/50";
      case "appetizers": return "from-emerald-50 to-teal-100 text-emerald-600 border-emerald-200/50";
      default: return "from-amber-50 to-orange-100 text-amber-600 border-amber-200/50";
    }
  };

  if (hasError || !src) {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${getFallbackGradient()} border flex flex-col items-center justify-center gap-1 select-none`}>
        <span style={{ fontSize: "28px" }} className="filter drop-shadow-sm">{getFallbackIcon()}</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={name} 
      onError={() => setHasError(true)}
      className="menu-item-img-tag" 
    />
  );
}

interface DbMenuItem {
  id: string;
  category_id: string | null;
  name: string;
  name_ar: string | null;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: number;
  weight_volume: string | null;
  ingredients: string | null;
  spiciness: number;
  dietary_tags: string | null;
  calories: number | null;
}

interface MenuItemData extends Omit<MenuItem, "category"> {
  category: string;
  weight_volume?: string | null;
  ingredients?: string | null;
  spiciness: number;
  dietary_tags?: string | null;
  calories?: number | null;
  is_available: number;
  discount_price?: number | null;
  original_price?: number | null;
  promo_title?: string | null;
}

export default function MenuTab() {
  const params = useParams();
  const tableCode = params.tableCode as string;
  const { waiter, displayCurrency, language, t, cartItems, addToCart, removeFromCart } = useTableState();
  const [selectedCatId, setSelectedCatId] = useState<string>("");
  const [dbCategories, setDbCategories] = useState<{ id: string; name: string }[]>([]);
  const [dbMenuItems, setDbMenuItems] = useState<DbMenuItem[]>([]);
  const [dbPromotions, setDbPromotions] = useState<any[]>([]);
  const [activeDetailItem, setActiveDetailItem] = useState<MenuItemData | null>(null);
  const [activeBannerPromo, setActiveBannerPromo] = useState<any | null>(null);
  const [detailQty, setDetailQty] = useState<number>(1);
  const [mounted, setMounted] = useState<boolean>(false);
  const dragControls = useDragControls();

  useEffect(() => {
    setMounted(true);
  }, []);

  const categories = dbCategories.length > 0
    ? dbCategories.map((c) => ({ id: c.id, label: c.name }))
    : [
        { id: "mains", label: language === "ar" ? "الرئيسية" : "Mains" },
        { id: "appetizers", label: language === "ar" ? "المقبلات" : "Appetizers" },
        { id: "drinks", label: language === "ar" ? "المشروبات" : "Drinks" },
        { id: "desserts", label: language === "ar" ? "الحلويات" : "Desserts" }
      ];

  // Set first category active by default
  useEffect(() => {
    if (categories.length > 0 && !selectedCatId) {
      setSelectedCatId(categories[0].id);
    }
  }, [categories, selectedCatId]);

  useEffect(() => {
    if (waiter.restaurant_id) {
      getBusinessMenu(waiter.restaurant_id).then((res) => {
        if (res.success) {
          if (res.categories && res.categories.length > 0) {
            setDbCategories(res.categories);
          }
          if (res.items && res.items.length > 0) {
            setDbMenuItems(res.items);
          }
          if (res.promotions && res.promotions.length > 0) {
            setDbPromotions(res.promotions);
          }
        }
      });
    }
  }, [waiter.restaurant_id]);

  // Fallback to static items if DB items empty, and attach active promo prices
  const rawItems: MenuItemData[] = (dbMenuItems.length > 0
    ? dbMenuItems.map((item) => {
        const promo = dbPromotions.find(
          (p) => p.type === "ITEM_DISCOUNT" && (p.item_id === item.id || (p.item_name && p.item_name.toLowerCase() === item.name.toLowerCase())) && (p.status === "ACTIVE" || !p.status)
        );

        const effectivePrice = promo && promo.discount_price ? promo.discount_price : item.price;
        const originalPrice = promo && promo.discount_price && promo.discount_price < item.price ? item.price : undefined;

        return {
          id: item.id,
          name: item.name,
          name_ar: item.name_ar || undefined,
          description: item.description || "",
          price: effectivePrice,
          original_price: originalPrice,
          discount_price: promo?.discount_price || undefined,
          promo_title: promo ? (language === "ar" && promo.title_ar ? promo.title_ar : promo.title) : undefined,
          category: item.category_id || "all",
          image: item.image_url || "",
          weight_volume: item.weight_volume || null,
          ingredients: item.ingredients || null,
          spiciness: item.spiciness || 0,
          dietary_tags: item.dietary_tags || null,
          calories: item.calories || null,
          is_available: item.is_available ?? 1,
        };
      })
    : (waiter.restaurant_id && menuDb[waiter.restaurant_id]
        ? menuDb[waiter.restaurant_id].map((i) => ({ ...i, weight_volume: null, ingredients: null, spiciness: 0, dietary_tags: null, calories: null, is_available: 1 }))
        : defaultMenuItems.map((i) => ({ ...i, weight_volume: null, ingredients: null, spiciness: 0, dietary_tags: null, calories: null, is_available: 1 }))
      )) as MenuItemData[];

  const getCartQuantity = (itemName: string): number => {
    const found = cartItems.find((i) => i.item.name === itemName);
    return found ? found.quantity : 0;
  };

  const handleCategoryTap = (catId: string) => {
    setSelectedCatId(catId);
    
    setTimeout(() => {
      const element = document.getElementById(`cat-section-${catId}`);
      const container = document.querySelector(".scrollableContent");
      if (element && container) {
        const containerTop = container.getBoundingClientRect().top;
        const elementTop = element.getBoundingClientRect().top;
        const scrollTarget = container.scrollTop + (elementTop - containerTop) - 52;
        
        container.scrollTo({
          top: scrollTarget,
          behavior: "smooth"
        });
      }
    }, 60);
  };

  const isRTL = language === "ar";

  return (
    <div className="menu-page-wrapper" dir={isRTL ? "rtl" : "ltr"}>
      {/* Scoped CSS styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        .menu-page-wrapper {
          padding: 8px 0;
          font-family: var(--font-sans), sans-serif;
          animation: menuFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Header block */
        .menu-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
          padding: 0 20px;
        }
        .menu-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #d97706;
        }
        .menu-header-title {
          font-family: var(--font-serif);
          font-size: 20px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        /* Categories Scroll Container */
        .menu-categories-container {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding: 0 20px 12px 20px;
          scrollbar-width: none;
        }
        .menu-categories-container::-webkit-scrollbar {
          display: none;
        }

        .menu-category-btn {
          white-space: nowrap;
          padding: 8px 16px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .menu-category-btn-active {
          background: #0f172a;
          color: #ffffff;
          border-color: #0f172a;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
        }

        /* Promotions Carousel */
        .promo-carousel {
          display: flex;
          gap: 14px;
          overflow-x: auto;
          padding: 0 20px 20px 20px;
          scrollbar-width: none;
        }
        .promo-carousel::-webkit-scrollbar {
          display: none;
        }
        .promo-banner {
          min-width: 280px;
          max-width: 320px;
          height: 140px;
          border-radius: 16px;
          background-size: cover;
          background-position: center;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          color: #ffffff;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          overflow: hidden;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .promo-banner::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.85) 100%);
          z-index: 1;
        }
        .promo-banner * {
          position: relative;
          z-index: 2;
        }
        .promo-banner-badge {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(8px);
          padding: 4px 10px;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        /* Category Section */
        .category-section {
          padding: 0 20px;
          margin-bottom: 24px;
        }
        .category-section-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 12px 0;
          letter-spacing: -0.01em;
        }

        /* Menu Items List */
        .menu-items-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        /* Menu Item Card */
        .menu-item-card {
          display: flex;
          gap: 14px;
          background: #ffffff;
          border: 1px solid #f1f5f9;
          border-radius: 16px;
          padding: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .menu-item-card:active {
          transform: scale(0.99);
        }

        .menu-item-img-wrapper {
          width: 90px;
          height: 90px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          background: #f8fafc;
        }
        .menu-item-img-tag {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .menu-item-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-width: 0;
        }
        .menu-item-title-desc {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .menu-item-name {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
          line-height: 1.25;
        }
        .menu-item-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;
        }
        .menu-item-price {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .menu-qty-selector {
          display: flex;
          align-items: center;
          background: #0f172a;
          border-radius: 99px;
          padding: 3px;
          color: #ffffff;
        }
        .menu-qty-btn {
          width: 24px;
          height: 24px;
          border-radius: 99px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .menu-qty-val {
          font-size: 13px;
          font-weight: 700;
          padding: 0 8px;
        }
        .menu-add-btn {
          width: 32px;
          height: 32px;
          border-radius: 99px;
          border: none;
          background: #0f172a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.2);
        }
      ` }} />

      {/* Menu Title Header */}
      <div className="menu-header">
        <h3 className="menu-header-title">
          {language === "ar" ? "قائمة الطعام" : "Menu"}
        </h3>
      </div>
      
      {/* Promotions Carousel */}
      {dbPromotions.length > 0 && (
        <div className="promo-carousel">
          {dbPromotions.map((promo) => (
            <div 
              key={promo.id} 
              className="promo-banner"
              style={{ backgroundImage: `url(${promo.image_url})`, cursor: "pointer" }}
              onClick={() => {
                if (promo.type === "ITEM_DISCOUNT" && promo.item_id) {
                  const item = rawItems.find(i => i.id === promo.item_id);
                  if (item) {
                    setActiveDetailItem(item);
                    setDetailQty(1);
                  }
                } else {
                  setActiveBannerPromo(promo);
                }
              }}
            >
              <div className="promo-banner-badge" style={{ backdropFilter: "blur(8px)" }}>
                {language === "ar" && promo.title_ar ? promo.title_ar : promo.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, opacity: 0.9 }}>
                  {language === "ar" && promo.description_ar ? promo.description_ar : promo.description}
                </span>
                {promo.type === "ITEM_DISCOUNT" && promo.discount_price && (
                  <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
                    <span style={{ fontSize: "16px", fontWeight: 800 }}>
                      {promo.discount_price} {displayCurrency}
                    </span>
                    {promo.item_original_price && promo.item_original_price > promo.discount_price && (
                      <span style={{ fontSize: "12px", textDecoration: "line-through", opacity: 0.75 }}>
                        {promo.item_original_price} {displayCurrency}
                      </span>
                    )}
                  </div>
                )}
                {promo.type === "COMBO" && promo.discount_price && (
                  <span style={{ fontSize: "16px", fontWeight: 800, marginTop: "4px" }}>
                    {promo.discount_price} {displayCurrency}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Category Selection Pills */}
      <div className="menu-categories-container">
        {categories.map((tab) => {
          const isActive = selectedCatId === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleCategoryTap(tab.id)}
              className={`menu-category-btn ${isActive ? "menu-category-btn-active" : ""}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      
      {/* Category Sections Container */}
      <div style={{ marginTop: "16px" }}>
        {categories.map((cat) => {
          const catItems = rawItems.filter((item) => item.category === cat.id && item.is_available === 1);
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} id={`cat-section-${cat.id}`} className="category-section">
              <h4 className="category-section-title">{cat.label}</h4>
              
              <div className="menu-items-list">
                {catItems.map((item) => {
                  const qty = getCartQuantity(item.name);
                  const displayName = language === "ar" && item.name_ar ? item.name_ar : item.name;
                  const isAvailable = item.is_available === 1;

                  return (
                    <div
                      className="menu-item-card"
                      key={item.id}
                      style={{ opacity: isAvailable ? 1 : 0.65 }}
                      onClick={() => {
                        if (isAvailable) {
                          setActiveDetailItem(item);
                          setDetailQty(1);
                        }
                      }}
                    >
                      {/* Image */}
                      <div className="menu-item-img-wrapper">
                        <DishImage src={item.image} name={displayName} category={item.category} />
                        
                        {/* Promo Badge Tag */}
                        {item.original_price && (
                          <div style={{ position: "absolute", top: "6px", left: "6px", zIndex: 6 }}>
                            <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: "#dc2626", color: "#ffffff", textTransform: "uppercase" }}>
                              Offer
                            </span>
                          </div>
                        )}

                        {/* Dietary Tags Overlay */}
                        {item.dietary_tags && (
                          <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end", pointerEvents: "none", zIndex: 5 }}>
                            {JSON.parse(item.dietary_tags).map((tag: string) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: "0.65rem",
                                  fontWeight: 800,
                                  padding: "3px 8px",
                                  borderRadius: "99px",
                                  background: "rgba(255, 255, 255, 0.95)",
                                  color: "#0f172a",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                  backdropFilter: "blur(4px)"
                                }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {!isAvailable && (
                          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                            <span style={{ background: "#ef4444", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Content */}
                      <div className="menu-item-info">
                        <div className="menu-item-title-desc">
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <h4 className="menu-item-name">{displayName}</h4>
                            
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>
                              {item.weight_volume && (
                                <span>{item.weight_volume}</span>
                              )}
                              {item.weight_volume && (item.calories || item.spiciness > 0) && <span style={{ opacity: 0.5 }}>•</span>}
                              {item.calories && (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                  {item.calories} kcal
                                </span>
                              )}
                              {item.calories && item.spiciness > 0 && <span style={{ opacity: 0.5 }}>•</span>}
                              {item.spiciness > 0 && (
                                <span style={{ color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "2px" }}>
                                  {"🌶️".repeat(item.spiciness)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Price & Action Row */}
                        <div className="menu-item-footer">
                          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                            <span className="menu-item-price" style={{ color: item.original_price ? "#166534" : "#0f172a" }}>
                              {item.price} {displayCurrency}
                            </span>
                            {item.original_price && (
                              <span style={{ fontSize: "0.75rem", textDecoration: "line-through", color: "#94a3b8", fontWeight: 600 }}>
                                {item.original_price} {displayCurrency}
                              </span>
                            )}
                          </div>
                          
                          <div className="menu-action-box" onClick={(e) => e.stopPropagation()} style={{ justifyContent: "flex-end" }}>
                            {!isAvailable ? (
                              <span style={{ fontSize: "0.75rem", color: "#ef4444", fontWeight: 700 }}>
                                Unavailable
                              </span>
                            ) : (
                              <AnimatePresence mode="popLayout">
                                {qty > 0 ? (
                                  <motion.div
                                    key="qty-selector"
                                    layout
                                    initial={{ opacity: 0, scale: 0.8, width: 32, borderRadius: 16 }}
                                    animate={{ opacity: 1, scale: 1, width: 84, borderRadius: 16 }}
                                    exit={{ opacity: 0, scale: 0.8, width: 32, borderRadius: 16 }}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    className="menu-qty-selector"
                                    style={{ overflow: "hidden" }}
                                  >
                                    <button
                                      type="button"
                                      className="menu-qty-btn"
                                      onClick={() => removeFromCart(item.name)}
                                    >
                                      <Minus size={14} strokeWidth={3} />
                                    </button>
                                    <motion.span layout className="menu-qty-val">{qty}</motion.span>
                                    <button
                                      type="button"
                                      className="menu-qty-btn"
                                      onClick={() => addToCart(item as unknown as MenuItem)}
                                    >
                                      <Plus size={14} strokeWidth={3} />
                                    </button>
                                  </motion.div>
                                ) : (
                                  <motion.button
                                    key="add-btn"
                                    layout
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                    type="button"
                                    className="menu-add-btn"
                                    onClick={() => addToCart(item as unknown as MenuItem)}
                                  >
                                    <Plus size={16} strokeWidth={3} />
                                  </motion.button>
                                )}
                              </AnimatePresence>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Banner / Combo Info Popup Modal */}
      {mounted && activeBannerPromo && typeof window !== "undefined" && createPortal(
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(6px)", zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "20px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            {activeBannerPromo.image_url && (
              <div style={{ height: "180px", backgroundImage: `url(${activeBannerPromo.image_url})`, backgroundSize: "cover", backgroundPosition: "center", position: "relative" }}>
                <button 
                  onClick={() => setActiveBannerPromo(null)}
                  style={{ position: "absolute", top: "12px", right: "12px", background: "rgba(0,0,0,0.5)", color: "white", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div style={{ padding: "20px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(181, 138, 28, 0.1)", color: "#B58A1C", padding: "4px 10px", borderRadius: "8px", fontSize: "0.75rem", fontWeight: 800, marginBottom: "8px" }}>
                <Tag size={14} /> SPECIAL PROMOTION
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>
                {language === "ar" && activeBannerPromo.title_ar ? activeBannerPromo.title_ar : activeBannerPromo.title}
              </h3>
              <p style={{ color: "#475569", fontSize: "0.9rem", lineHeight: 1.5, margin: "0 0 16px 0" }}>
                {language === "ar" && activeBannerPromo.description_ar ? activeBannerPromo.description_ar : activeBannerPromo.description}
              </p>
              {activeBannerPromo.discount_price && (
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#166534", marginBottom: "16px" }}>
                  Offer Price: {activeBannerPromo.discount_price} {displayCurrency}
                </div>
              )}
              <button
                onClick={() => setActiveBannerPromo(null)}
                style={{ width: "100%", padding: "12px", background: "#0f172a", color: "white", borderRadius: "12px", fontWeight: 800, border: "none", cursor: "pointer" }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Uber-like Bottom Sheet Detailed Dish Drawer */}
      {mounted && typeof window !== "undefined" && createPortal(
        <AnimatePresence mode="wait">
          {activeDetailItem && (() => {
            const detailDisplayName = language === "ar" && activeDetailItem.name_ar ? activeDetailItem.name_ar : activeDetailItem.name;
            return (
              <>
                {/* Dark Overlay Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setActiveDetailItem(null);
                    setDetailQty(1);
                  }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(15, 23, 42, 0.65)",
                    zIndex: 99999,
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    touchAction: "none"
                  }}
                />

                {/* Bottom Sheet Drawer */}
                <motion.div
                  drag="y"
                  dragControls={dragControls}
                  dragListener={false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.85 }}
                  onDragEnd={(event, info) => {
                    if (info.offset.y > 100 || info.velocity.y > 600) {
                      setActiveDetailItem(null);
                      setDetailQty(1);
                    }
                  }}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 28, stiffness: 240 }}
                  style={{
                    position: "fixed",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    borderTopLeftRadius: "28px",
                    borderTopRightRadius: "28px",
                    zIndex: 100000,
                    maxHeight: "88vh",
                    overflowY: "auto",
                    padding: "0 0 32px 0",
                    boxShadow: "0 -10px 40px rgba(15, 23, 42, 0.22)",
                    display: "flex",
                    flexDirection: "column",
                    fontFamily: "var(--font-sans), sans-serif",
                    textAlign: language === "ar" ? "right" : "left"
                  }}
                >
                  {/* Draggable Header Drag Zone & Edge-to-Edge Image */}
                  <div
                    onPointerDown={(e) => dragControls.start(e)}
                    style={{
                      cursor: "ns-resize",
                      userSelect: "none",
                      touchAction: "none",
                      position: "relative",
                      width: "100%",
                      height: "260px",
                      borderTopLeftRadius: "28px",
                      borderTopRightRadius: "28px",
                      overflow: "hidden",
                      background: "#f8fafc",
                      flexShrink: 0
                    }}
                  >
                    <DishImage src={activeDetailItem.image} name={detailDisplayName} category={activeDetailItem.category} />
                    
                    {/* Drag affordance bar overlay */}
                    <div
                      style={{
                        position: "absolute",
                        top: "12px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "44px",
                        height: "5px",
                        background: "rgba(255, 255, 255, 0.9)",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        borderRadius: "99px",
                        zIndex: 10
                      }}
                    />

                    {activeDetailItem.dietary_tags && (
                      <div style={{ position: "absolute", bottom: "12px", right: "12px", display: "flex", gap: "6px", flexWrap: "wrap", zIndex: 10 }}>
                        {JSON.parse(activeDetailItem.dietary_tags).map((tag: string) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              padding: "4px 10px",
                              borderRadius: "99px",
                              background: "rgba(255, 255, 255, 0.95)",
                              color: "#0f172a",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                              backdropFilter: "blur(4px)",
                              WebkitBackdropFilter: "blur(4px)"
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Drawer Content Wrapper */}
                  <div style={{ padding: "20px 20px 0 20px", display: "flex", flexDirection: "column", gap: "18px", flex: 1 }}>
                {/* Dish Header Info */}
                  <div>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                      <h3 style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", margin: 0, fontFamily: "var(--font-serif)", lineHeight: "1.25" }}>
                        {detailDisplayName}
                      </h3>
                      {activeDetailItem.weight_volume && (
                        <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "3px 10px", borderRadius: "8px", flexShrink: 0 }}>
                          {activeDetailItem.weight_volume}
                        </span>
                      )}
                    </div>

                    {/* Calories & Spiciness badge tags */}
                    <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                      {activeDetailItem.calories && (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", color: "#d97706", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {activeDetailItem.calories} kcal
                        </span>
                      )}
                      {activeDetailItem.spiciness > 0 && (
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, padding: "4px 10px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", color: "#dc2626", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          {"🌶️".repeat(activeDetailItem.spiciness)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {activeDetailItem.description && (
                    <div style={{ marginTop: "4px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {language === "ar" ? "الوصف" : "Description"}
                      </h4>
                      <p style={{ fontSize: "0.9rem", color: "#475569", lineHeight: "1.5", margin: 0 }}>
                        {activeDetailItem.description}
                      </p>
                    </div>
                  )}

                  {/* Ingredients */}
                  {activeDetailItem.ingredients && (
                    <div style={{ marginTop: "4px" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        {language === "ar" ? "المكونات" : "Ingredients"}
                      </h4>
                      <p style={{ fontSize: "0.86rem", color: "#64748b", lineHeight: "1.45", fontStyle: "italic", margin: 0 }}>
                        {activeDetailItem.ingredients}
                      </p>
                    </div>
                  )}

                  {/* Sticky Action Footer */}
                  <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    {/* Quantity selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "14px", padding: "4px 8px" }}>
                      <button
                        type="button"
                        onClick={() => setDetailQty(prev => Math.max(1, prev - 1))}
                        style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", background: "#ffffff", color: "#0f172a", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: "1rem", fontWeight: 800, minWidth: "20px", textAlign: "center", color: "#0f172a" }}>{detailQty}</span>
                      <button
                        type="button"
                        onClick={() => setDetailQty(prev => prev + 1)}
                        style={{ width: "36px", height: "36px", borderRadius: "10px", border: "none", background: "#ffffff", color: "#0f172a", fontWeight: 800, fontSize: "1.1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.04)" }}
                      >
                        +
                      </button>
                    </div>

                    {/* Add button */}
                    <button
                      type="button"
                      onClick={() => {
                        for (let i = 0; i < detailQty; i++) {
                          addToCart(activeDetailItem as unknown as MenuItem);
                        }
                        setActiveDetailItem(null);
                        setDetailQty(1);
                      }}
                      style={{
                        flex: 1,
                        background: "#0d9488",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "14px",
                        height: "48px",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: "0 4px 14px rgba(13, 148, 136, 0.25)",
                        transition: "opacity 0.2s"
                      }}
                    >
                      <span>{language === "ar" ? "إضافة إلى الطلب" : "Add to Order"}</span>
                      <span>•</span>
                      <span>{(activeDetailItem.price * detailQty).toFixed(2)} {displayCurrency}</span>
                      {activeDetailItem.original_price && (
                        <span style={{ fontSize: "0.75rem", textDecoration: "line-through", opacity: 0.7 }}>
                          {(activeDetailItem.original_price * detailQty).toFixed(2)}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
                </motion.div>
              </>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

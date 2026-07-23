"use client";

import React, { useState } from "react";
import {
  savePromotion,
  togglePromotionStatus,
  deletePromotion,
  type Promotion,
  type MenuItemSimple,
  type SavePromotionInput,
} from "@/app/actions/promotions";
import { Plus, Edit2, Trash2, Tag, LayoutTemplate, Utensils, Calendar, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

interface PromotionsManagerClientProps {
  initialPromotions: Promotion[];
  menuItems: MenuItemSimple[];
  businessId: string;
}

export default function PromotionsManagerClient({
  initialPromotions,
  menuItems,
  businessId,
}: PromotionsManagerClientProps) {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<SavePromotionInput>({
    id: null,
    type: "BANNER",
    title: "",
    title_ar: "",
    description: "",
    description_ar: "",
    image_url: "",
    item_id: "",
    discount_price: null,
    active_from: "",
    active_to: "",
    status: "ACTIVE",
  });

  const openModal = (promo: Promotion | null = null) => {
    if (promo) {
      setFormData({
        id: promo.id,
        type: promo.type,
        title: promo.title || "",
        title_ar: promo.title_ar || "",
        description: promo.description || "",
        description_ar: promo.description_ar || "",
        image_url: promo.image_url || "",
        item_id: promo.item_id || "",
        discount_price: promo.discount_price ?? null,
        active_from: promo.active_from ? promo.active_from.substring(0, 16) : "",
        active_to: promo.active_to ? promo.active_to.substring(0, 16) : "",
        status: promo.status,
      });
    } else {
      setFormData({
        id: null,
        type: "BANNER",
        title: "",
        title_ar: "",
        description: "",
        description_ar: "",
        image_url: "",
        item_id: "",
        discount_price: null,
        active_from: "",
        active_to: "",
        status: "ACTIVE",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const dataToSave: SavePromotionInput = {
      ...formData,
      active_from: formData.active_from ? new Date(formData.active_from).toISOString() : null,
      active_to: formData.active_to ? new Date(formData.active_to).toISOString() : null,
    };

    // Auto-fill image from selected item if not provided
    if ((formData.type === "ITEM_DISCOUNT" || formData.type === "COMBO") && formData.item_id && !formData.image_url) {
      const item = menuItems.find((i) => i.id === formData.item_id);
      if (item && item.image_url) {
        dataToSave.image_url = item.image_url;
      }
    }

    const res = await savePromotion(dataToSave);
    if (res.success) {
      setIsModalOpen(false);
      router.refresh();

      const item = menuItems.find((i) => i.id === dataToSave.item_id);
      const updatedPromoList: Promotion[] = promotions.map((p) => {
        if (p.id === formData.id) {
          return {
            ...p,
            ...dataToSave,
            id: formData.id,
            business_id: businessId,
            item_name: item?.name || null,
            item_original_price: item?.price || null,
            status: dataToSave.status || "ACTIVE",
            created_at: p.created_at,
          };
        }
        return p;
      });

      if (!formData.id && res.id) {
        const newPromo: Promotion = {
          id: res.id,
          business_id: businessId,
          type: dataToSave.type,
          title: dataToSave.title,
          title_ar: dataToSave.title_ar,
          description: dataToSave.description,
          description_ar: dataToSave.description_ar,
          image_url: dataToSave.image_url,
          item_id: dataToSave.item_id,
          item_name: item?.name || null,
          item_original_price: item?.price || null,
          discount_price: dataToSave.discount_price,
          active_from: dataToSave.active_from,
          active_to: dataToSave.active_to,
          status: "ACTIVE",
          effective_status: "ACTIVE",
          created_at: new Date().toISOString(),
        };
        setPromotions([newPromo, ...promotions]);
      } else {
        setPromotions(updatedPromoList);
      }
    } else {
      alert(res.error || "Failed to save promotion");
    }
    setLoading(false);
  };

  const handleToggle = async (id: string, currentStatus: "ACTIVE" | "INACTIVE") => {
    const newStatus: "ACTIVE" | "INACTIVE" = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPromotions(
      promotions.map((p) =>
        p.id === id ? { ...p, status: newStatus, effective_status: newStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE" } : p
      )
    );
    await togglePromotionStatus(id, newStatus);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this promotion?")) {
      setPromotions(promotions.filter((p) => p.id !== id));
      await deletePromotion(id);
      router.refresh();
    }
  };

  const getStatusBadge = (promo: Promotion) => {
    const status = promo.effective_status || (promo.status === "ACTIVE" ? "ACTIVE" : "INACTIVE");
    switch (status) {
      case "ACTIVE":
        return { label: "Active", bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
      case "SCHEDULED":
        return { label: "Scheduled", bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd" };
      case "EXPIRED":
        return { label: "Expired", bg: "#fef3c7", color: "#92400e", border: "#fde68a" };
      default:
        return { label: "Inactive", bg: "#f1f5f9", color: "#64748b", border: "#e2e8f0" };
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Tag size={20} color="#B58A1C" /> Menu Promotions & Offers
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "4px 0 0 0" }}>
            Create promotional banners, item discounts, and combo deals displayed at the top of your digital menu.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          style={{
            background: "linear-gradient(135deg, #B58A1C 0%, #946f14 100%)",
            color: "white",
            padding: "10px 18px",
            borderRadius: "10px",
            display: "flex",
            gap: "8px",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "0.9rem",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(181, 138, 28, 0.25)",
          }}
        >
          <Plus size={18} /> Add Promotion
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {promotions.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center", background: "#f8fafc", borderRadius: "14px", border: "1px dashed #cbd5e1", color: "#64748b" }}>
            <Tag size={36} style={{ margin: "0 auto 12px auto", opacity: 0.4, color: "#B58A1C" }} />
            <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 4px 0" }}>No promotions created yet</h3>
            <p style={{ fontSize: "0.85rem", margin: 0, opacity: 0.8 }}>Click &quot;Add Promotion&quot; above to create banners or dish discounts.</p>
          </div>
        )}

        {promotions.map((promo) => {
          const badge = getStatusBadge(promo);
          return (
            <div
              key={promo.id}
              style={{
                display: "flex",
                gap: "16px",
                padding: "16px",
                background: "white",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                flexDirection: "row",
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: "120px",
                  height: "90px",
                  borderRadius: "10px",
                  background: promo.image_url ? `url(${promo.image_url})` : "#f1f5f9",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  flexShrink: 0,
                  border: "1px solid #e2e8f0",
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <h4 style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", margin: 0 }}>{promo.title}</h4>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      onClick={() => handleToggle(promo.id, promo.status)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        cursor: "pointer",
                      }}
                    >
                      {badge.label}
                    </button>
                    <button onClick={() => openModal(promo)} style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer", padding: "4px" }} title="Edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(promo.id)} style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "4px" }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "6px", color: "#64748b", fontSize: "0.85rem", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700, background: "#f8fafc", padding: "2px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", color: "#334155" }}>
                    {promo.type === "BANNER" ? <LayoutTemplate size={14} color="#B58A1C" /> : promo.type === "COMBO" ? <Utensils size={14} color="#B58A1C" /> : <Tag size={14} color="#B58A1C" />}
                    {promo.type === "BANNER" ? "Banner" : promo.type === "COMBO" ? "Combo Deal" : "Item Discount"}
                  </span>

                  {promo.item_name && (
                    <>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ fontWeight: 600 }}>{promo.item_name}</span>
                    </>
                  )}

                  {promo.discount_price && (
                    <>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ fontWeight: 800, color: "#166534" }}>
                        {promo.discount_price} EGP
                        {promo.item_original_price && promo.item_original_price > promo.discount_price && (
                          <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.75rem", marginLeft: "6px" }}>
                            {promo.item_original_price} EGP
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>

                {promo.description && <p style={{ color: "#475569", fontSize: "0.85rem", margin: "8px 0 0 0", lineHeight: 1.4 }}>{promo.description}</p>}

                {(promo.active_from || promo.active_to) && (
                  <div style={{ display: "flex", gap: "12px", marginTop: "8px", fontSize: "0.75rem", color: "#64748b" }}>
                    {promo.active_from && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Clock size={12} /> From: {new Date(promo.active_from).toLocaleString()}
                      </span>
                    )}
                    {promo.active_to && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} /> Until: {new Date(promo.active_to).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Promotion Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "white", padding: "24px", borderRadius: "18px", width: "100%", maxWidth: "540px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginBottom: "18px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
              {formData.id ? "Edit Promotion" : "Create Promotion"}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Promotion Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as "BANNER" | "ITEM_DISCOUNT" | "COMBO" })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                >
                  <option value="BANNER">Informational Banner (Hero Header)</option>
                  <option value="ITEM_DISCOUNT">Item Discount / Special Offer</option>
                  <option value="COMBO">Combo Deal / Package Offer</option>
                </select>
              </div>

              {(formData.type === "ITEM_DISCOUNT" || formData.type === "COMBO") && (
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Select Menu Item</label>
                  <select
                    value={formData.item_id || ""}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedItem = menuItems.find((i) => i.id === selectedId);
                      setFormData({
                        ...formData,
                        item_id: selectedId,
                        title: selectedItem ? `Special Offer: ${selectedItem.name}` : formData.title,
                      });
                    }}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    required={formData.type === "ITEM_DISCOUNT"}
                  >
                    <option value="">Select an item...</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.price} EGP)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Title (EN)</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. 20% OFF Hawawshi"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Title (AR) - Optional</label>
                  <input
                    type="text"
                    value={formData.title_ar || ""}
                    onChange={(e) => setFormData({ ...formData, title_ar: e.target.value })}
                    placeholder="مثال: خصم ٢٠٪ على الحواوشي"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    dir="rtl"
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Description (EN)</label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Promotional subtitle or offer details..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", minHeight: "75px", fontSize: "0.9rem" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Description (AR) - Optional</label>
                  <textarea
                    value={formData.description_ar || ""}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    placeholder="تفاصيل العرض بالعربية..."
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", minHeight: "75px", fontSize: "0.9rem" }}
                    dir="rtl"
                  />
                </div>
              </div>

              {(formData.type === "ITEM_DISCOUNT" || formData.type === "COMBO") && (
                <div>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Promotional Price (EGP)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.discount_price ?? ""}
                    onChange={(e) => setFormData({ ...formData, discount_price: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder="Enter discounted price"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                    required={formData.type === "ITEM_DISCOUNT"}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Active From (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.active_from || ""}
                    onChange={(e) => setFormData({ ...formData, active_from: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Active Until (Optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.active_to || ""}
                    onChange={(e) => setFormData({ ...formData, active_to: e.target.value })}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>Banner / Image URL</label>
                <input
                  type="url"
                  value={formData.image_url || ""}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder={formData.type === "ITEM_DISCOUNT" ? "Leave empty to use item's image" : "https://..."}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid #cbd5e1", fontSize: "0.9rem" }}
                  required={formData.type === "BANNER"}
                />
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #B58A1C 0%, #946f14 100%)",
                    color: "white",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Saving..." : "Save Promotion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

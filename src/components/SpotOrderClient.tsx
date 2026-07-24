"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Trash2, Check, Plus, ShoppingBag, QrCode, Search, Flame, Minus, Send, X, Pencil, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { addItemToSpotCart, removeItemFromSpotCart, approvePendingItems, cancelBill, updateWaiterCartQuantity, transferBill, updateWaiterCartItemNote, updateWaiterCartItemPrice, addBillDiscount } from "@/app/actions/business";
import { SystemRole } from "@/lib/roles";

export default function SpotOrderClient({ waiter, spot, activeBill, menuItems, workspaceId, allSpots = [], backUrl }: { waiter: any, spot: any, activeBill: any, menuItems: any[], workspaceId: string, allSpots?: any[], backUrl?: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"menu" | "cart">("menu");
  
  // Transfer Modal State
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferKeepOwnership, setTransferKeepOwnership] = useState(true);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<"bill" | number | null>(null);
  const [editTab, setEditTab] = useState<"quantity" | "discount" | "price">("quantity");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [priceMode, setPriceMode] = useState<"per_item" | "total">("total");
  const [inputValue, setInputValue] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("");

  useEffect(() => {
    const eventSource = new EventSource(`/api/individual/spot-stream?spotId=${spot.id}&businessId=${spot.business_id}`, { withCredentials: true });
    
    eventSource.onmessage = (event) => {
      // Data format is {"refresh":true}
      // Re-fetches the Server Component to seamlessly update props (menuItems, activeBill)
      router.refresh();
    };

    return () => {
      eventSource.close();
    };
  }, [spot.id, spot.business_id, router]);

  const items = (() => {
    if (!activeBill) return [];
    try { return JSON.parse(activeBill.items); } catch { return []; }
  })();

  const pendingCount = items.filter((i: any) => i.status === 'PENDING' || i.isDraft).length;
  const pendingAmount = items.filter((i: any) => i.status === 'PENDING' || i.isDraft).reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0);

  // Extract unique categories
  const categories = ["All", ...Array.from(new Set(menuItems.map(m => m.category_name).filter(Boolean)))];

  // Filter menu items
  const filteredMenu = menuItems.filter(m => {
    // We no longer completely hide m.is_available !== 1, so the waiter can see the stop list.
    if (selectedCategory !== "All" && m.category_name !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchIngredients = m.ingredients ? m.ingredients.toLowerCase().includes(q) : false;
      if (!matchName && !matchIngredients) return false;
    }
    return true;
  });

  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: "var(--background)", display: "flex", flexDirection: "column" }}>
      {/* Fixed Header Area */}
      <div style={{ background: "var(--card-bg)", zIndex: 10, display: "flex", flexDirection: "column" }}>
        
        {/* Top Bar */}
        <div style={{ padding: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--card-border)" }}>
          <button 
            onClick={() => router.push(backUrl || `/individual/workspace/${workspaceId}`)}
            style={{ background: "transparent", border: "none", color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: 600 }}
          >
            <ArrowLeft size={20} /> Back
          </button>
          <div style={{ textAlign: "center" }}>
            <h2 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 800 }}>{spot.label}</h2>
            {activeBill ? (
              <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 700 }}>Open: {activeBill.amount} {waiter.currency}</span>
            ) : (
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>No open bill</span>
            )}
          </div>
          <div style={{ width: "60px", display: "flex", justifyContent: "flex-end" }}>
            {activeBill && (
              <button 
                onClick={() => setTransferModalOpen(true)}
                style={{ background: "rgba(var(--primary-rgb),0.1)", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px", borderRadius: "10px" }}
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="md:hidden flex border-b border-[var(--card-border)]">
          <button 
            onClick={() => setActiveTab("menu")}
            style={{ 
              flex: 1, padding: "16px", background: "transparent", border: "none", 
              borderBottom: activeTab === "menu" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "menu" ? "var(--foreground)" : "var(--text-muted)",
              fontWeight: activeTab === "menu" ? 700 : 500, fontSize: "0.95rem"
            }}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab("cart")}
            style={{ 
              flex: 1, padding: "16px", background: "transparent", border: "none", 
              borderBottom: activeTab === "cart" ? "2px solid var(--primary)" : "2px solid transparent",
              color: activeTab === "cart" ? "var(--foreground)" : "var(--text-muted)",
              fontWeight: activeTab === "cart" ? 700 : 500, fontSize: "0.95rem",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
            }}
          >
            Cart
            {items.length > 0 && (
              <span style={{ background: pendingCount > 0 ? "#f59e0b" : "var(--primary)", color: "#000", padding: "2px 6px", borderRadius: "10px", fontSize: "0.75rem", fontWeight: 800 }}>
                {items.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area (Responsive Split) */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* MENU PANE */}
        <div className={`flex-1 flex-col overflow-hidden ${activeTab === "menu" ? "flex" : "hidden md:flex"}`}>
          {/* Sticky Search and Categories */}
          <div style={{ padding: "16px", borderBottom: "1px solid var(--card-border)", background: "var(--background)", display: "flex", flexDirection: "column", gap: "12px", flexShrink: 0 }}>
            {/* Search Bar */}
            <div style={{ position: "relative" }}>
              <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input 
                type="text" 
                placeholder="Search menu or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "12px", border: "1px solid var(--card-border)", background: "var(--card-bg)", color: "var(--foreground)", fontSize: "0.95rem", outline: "none" }}
              />
            </div>

            {/* Categories Scrollable Row */}
            {categories.length > 1 && (
              <div style={{ display: "flex", overflowX: "auto", gap: "8px", msOverflowStyle: "none", scrollbarWidth: "none" }}>
                {categories.map((cat: any) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: "none",
                      background: selectedCategory === cat ? "var(--primary)" : "var(--card-bg)",
                      color: selectedCategory === cat ? "#000" : "var(--foreground)",
                      fontWeight: selectedCategory === cat ? 700 : 500,
                      cursor: "pointer",
                      boxShadow: selectedCategory === cat ? "0 2px 8px rgba(var(--primary-rgb), 0.2)" : "0 1px 2px rgba(0,0,0,0.05)"
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Grid (Scrollable) */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {filteredMenu.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "40px" }}>No items match your search.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                {filteredMenu.map(mi => {
                  const isAvailable = mi.is_available === 1;
                  const addedCount = items.filter((i: any) => i.name === mi.name).reduce((sum: number, i: any) => sum + i.quantity, 0);
                  return (
                    <div key={mi.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", background: "var(--card-bg)", border: isAvailable ? "1px solid var(--card-border)" : "1px dashed rgba(239,68,68,0.4)", borderRadius: "16px", boxShadow: "0 2px 8px rgba(0,0,0,0.02)", opacity: isAvailable ? 1 : 0.6 }}>
                      <div style={{ flex: 1, paddingRight: "16px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "4px" }}>
                          <div style={{ fontSize: "1.05rem", color: "var(--foreground)", fontWeight: "700" }}>
                            {mi.name}
                            {!isAvailable && <span style={{ marginLeft: "8px", fontSize: "0.65rem", background: "rgba(239,68,68,0.1)", color: "#ef4444", padding: "2px 6px", borderRadius: "4px", verticalAlign: "middle" }}>STOP LIST</span>}
                          </div>
                        </div>
                        
                        {/* Price and Spiciness */}
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                          <div style={{ fontSize: "0.95rem", color: isAvailable ? "var(--primary)" : "var(--text-muted)", fontWeight: "800" }}>{mi.price} {waiter.currency}</div>
                          {mi.spiciness > 0 && (
                            <div style={{ display: "flex" }}>
                              {Array.from({ length: mi.spiciness }).map((_, i) => <Flame key={i} size={14} color={isAvailable ? "#ef4444" : "var(--text-muted)"} style={{ marginLeft: "-2px" }} />)}
                            </div>
                          )}
                          {mi.calories && (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "rgba(0,0,0,0.04)", padding: "2px 6px", borderRadius: "4px" }}>{mi.calories} kcal</span>
                          )}
                        </div>

                        {/* Ingredients Hint */}
                        {mi.ingredients && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.4, marginBottom: "8px" }}>
                            <span style={{ fontWeight: 600 }}>Includes:</span> {mi.ingredients}
                          </div>
                        )}

                        {/* Dietary Tags */}
                        {mi.dietary_tags && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {mi.dietary_tags.split(',').map((tag: string) => {
                              const trimmed = tag.trim();
                              if (!trimmed) return null;
                              const isVegan = trimmed.toLowerCase() === 'vegan';
                              const isGF = trimmed.toLowerCase().includes('gluten');
                              return (
                                <span key={trimmed} style={{ 
                                  fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                                  background: isVegan && isAvailable ? "rgba(34, 197, 94, 0.1)" : isGF && isAvailable ? "rgba(234, 179, 8, 0.1)" : "rgba(0,0,0,0.05)",
                                  color: isVegan && isAvailable ? "#16a34a" : isGF && isAvailable ? "#ca8a04" : "var(--text-muted)"
                                }}>
                                  {trimmed}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      
                      <div style={{ position: "relative" }}>
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={async () => {
                            if (!isAvailable) return;
                            const res = await addItemToSpotCart({
                              businessId: spot.business_id,
                              spotId: spot.id,
                              spotLabel: spot.label,
                              item: { name: mi.name, price: mi.price, quantity: 1, isDraft: true, deviceId: "waiter" }
                            });
                            if (res.success) router.refresh();
                          }}
                          style={{ 
                            background: isAvailable ? "var(--primary)" : "var(--input-bg)", 
                            color: isAvailable ? "#000" : "var(--text-muted)", 
                            border: isAvailable ? "none" : "1px solid var(--card-border)", 
                            borderRadius: "12px", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", cursor: isAvailable ? "pointer" : "not-allowed", flexShrink: 0, 
                            boxShadow: isAvailable ? "0 4px 12px rgba(var(--primary-rgb), 0.2)" : "none" 
                          }}
                        >
                          <Plus size={24} />
                        </button>
                        {addedCount > 0 && (
                          <div style={{ position: "absolute", top: "-8px", right: "-8px", background: "#ef4444", color: "#fff", fontSize: "0.75rem", fontWeight: 800, width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(239,68,68,0.4)" }}>
                            {addedCount}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* CART PANE */}
        <div className={`w-full md:w-[400px] lg:w-[450px] md:border-l border-[var(--card-border)] bg-[var(--background)] flex-col overflow-hidden ${activeTab === "cart" ? "flex" : "hidden md:flex"}`}>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column" }}>
            {!activeBill || items.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", marginTop: "60px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <ShoppingBag size={48} style={{ opacity: 0.2 }} />
                <p>Cart is empty. Add items from the menu.</p>
                <button 
                  onClick={() => setActiveTab("menu")} 
                  style={{ padding: "10px 20px", background: "var(--card-bg)", color: "var(--foreground)", border: "1px solid var(--card-border)", borderRadius: "8px", fontWeight: 600, marginTop: "12px" }}
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingBottom: "16px" }}>
                {items.map((item: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "16px", background: "var(--card-bg)", border: item.status === 'PENDING' ? "1px solid #f59e0b" : "1px solid var(--card-border)", borderRadius: "12px", opacity: item.isDraft ? 0.8 : 1 }}>
                      {/* Top Row: Name and Price */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ color: "var(--foreground)", fontWeight: 700, fontSize: "1rem", lineHeight: "1.3" }}>
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{item.price} {waiter.currency} each</span>
                          )}
                          {item.note && (
                            <div style={{ fontSize: "0.85rem", color: "#f59e0b", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", background: "rgba(245,158,11,0.1)", padding: "4px 8px", borderRadius: "8px" }}>
                              <MessageSquare size={14} />
                              <span style={{ fontWeight: 600 }}>Note:</span> {item.note}
                            </div>
                          )}
                        </div>
                        <span style={{ color: "var(--foreground)", fontWeight: "800", fontSize: "1.05rem", whiteSpace: "nowrap" }}>
                          {item.originalPrice !== undefined && item.originalPrice > item.price && (
                            <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: "0.85rem", marginRight: "6px" }}>
                              {item.originalPrice * item.quantity}
                            </span>
                          )}
                          {item.price * item.quantity} {waiter.currency}
                        </span>
                      </div>

                      {/* Bottom Row: Badges and Controls */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "4px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          {item.isDraft && <span style={{fontSize: "0.75rem", fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "4px 8px", borderRadius: 6}}>DRAFT</span>}
                          {item.status === 'PENDING' && <span style={{fontSize: "0.75rem", fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "4px 8px", borderRadius: 6}}>REVIEW PENDING</span>}
                          
                          {/* Note Button */}
                          {(item.isDraft || item.status === 'PENDING') && (
                            <button
                              type="button"
                              onClick={async () => {
                                const newNote = prompt("Add a note for the kitchen (e.g., 'No onions'):", item.note || "");
                                if (newNote !== null) {
                                  const res = await updateWaiterCartItemNote({ billId: activeBill.id, itemIndex: idx, note: newNote });
                                  if (res.success) router.refresh();
                                }
                              }}
                              style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)", borderRadius: "6px", color: "var(--text-muted)", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}
                            >
                              <Pencil size={12} /> {item.note ? "Edit Note" : "Add Note"}
                            </button>
                          )}
                          
                          {/* Manager Price Edit Button */}
                          {waiter.role_id === SystemRole.BUSINESS_MANAGER && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditTarget(idx);
                                setEditTab("quantity");
                                setDiscountMode("percent");
                                setPriceMode("total");
                                setInputValue(item.quantity.toString());
                                setEditReason("");
                                setEditModalOpen(true);
                              }}
                              style={{ background: "var(--input-bg)", border: "1px solid var(--card-border)", borderRadius: "6px", color: "#d97706", cursor: "pointer", padding: "4px 8px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.75rem", fontWeight: 600 }}
                            >
                              <Pencil size={12} /> Discount / Edit
                            </button>
                          )}
                        </div>

                        {(item.isDraft || item.status === 'PENDING') ? (
                          <div style={{ display: "flex", alignItems: "center", background: "var(--input-bg)", borderRadius: "8px", overflow: "hidden" }}>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await updateWaiterCartQuantity({ billId: activeBill.id, itemIndex: idx, delta: -1 });
                                if (res.success) router.refresh();
                              }}
                              style={{ padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)" }}
                            >
                              <Minus size={16} />
                            </button>
                            <span style={{ padding: "0 8px", fontWeight: "800", fontSize: "1.1rem" }}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                const res = await updateWaiterCartQuantity({ billId: activeBill.id, itemIndex: idx, delta: 1 });
                                if (res.success) router.refresh();
                              }}
                              style={{ padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", color: "var(--foreground)" }}
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-muted)" }}>Qty: {item.quantity}</span>
                            {waiter.role_id === SystemRole.BUSINESS_MANAGER && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await removeItemFromSpotCart({ billId: activeBill.id, itemIndex: idx });
                                  if (res.success) router.refresh();
                                }}
                                style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "8px", color: "#ef4444", cursor: "pointer", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
            )}
          </div>

          {activeBill && items.length > 0 && (
            <div style={{ 
              padding: "16px", 
              background: "var(--background)", 
              borderTop: "1px solid var(--card-border)",
              boxShadow: "0 -8px 24px rgba(0,0,0,0.05)",
              zIndex: 20,
              flexShrink: 0
            }}>
              {/* Totals */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                    {pendingAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "600", fontSize: "0.95rem", color: "var(--text-muted)" }}>
                        <span>New Items (Draft):</span>
                        <span>{pendingAmount} {waiter.currency}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "1rem" }}>
                      <span style={{ color: "var(--foreground)" }}>Total (Confirmed):</span>
                      <span style={{ color: "var(--primary)" }}>{activeBill.amount} {waiter.currency}</span>
                    </div>
                    {pendingAmount > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "1.15rem", paddingTop: "8px", borderTop: "1px dashed var(--card-border)", marginTop: "4px" }}>
                        <span style={{ color: "var(--foreground)" }}>Total (Expected):</span>
                        <span style={{ color: "var(--primary)" }}>{activeBill.amount + pendingAmount} {waiter.currency}</span>
                      </div>
                    )}
                    
                    {/* Manager Bill Discount */}
                    {waiter.role_id === SystemRole.BUSINESS_MANAGER && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditTarget('bill');
                          setEditTab('discount');
                          setDiscountMode('percent');
                          setInputValue("");
                          setEditReason("");
                          setEditModalOpen(true);
                        }}
                        style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(217,119,6,0.1)", color: "#d97706", border: "1px dashed #d97706", cursor: "pointer", fontWeight: "700", fontSize: "0.9rem", marginTop: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        + Add Bill Discount
                      </button>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: "12px" }}>
                    {(items.length === pendingCount || waiter.role_id === SystemRole.BUSINESS_MANAGER) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (confirm("Cancel this entire order? This cannot be undone.")) {
                            const res = await cancelBill({ billId: activeBill.id });
                            if (res?.success) {
                              router.push(backUrl || `/individual/workspace/${workspaceId}`);
                            }
                          }
                        }}
                        style={{ 
                          width: pendingCount > 0 ? "64px" : "100%", 
                          padding: "16px", borderRadius: "12px", background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}
                      >
                        <Trash2 size={24} />
                        {pendingCount === 0 && <span style={{marginLeft: "8px", fontWeight: "700", fontSize: "1rem"}}>Cancel Order</span>}
                      </button>
                    )}
                    

                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await approvePendingItems({ spotId: spot.id });
                          if (res.success) router.refresh();
                        }}
                        style={{ flex: 1, padding: "16px", borderRadius: "12px", background: "var(--primary)", color: "#000", border: "none", cursor: "pointer", fontWeight: "800", fontSize: "1.1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(var(--primary-rgb), 0.2)" }}
                      >
                        <Check size={24} /> Confirm Order
                      </button>
                    )}
                  </div>
              </div>
            )}
        </div>
      </div>
      {/* Transfer Modal */}
      {transferModalOpen && activeBill && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "var(--background)", width: "100%", maxWidth: "500px", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", padding: "24px", paddingBottom: "max(24px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: "20px", maxHeight: "80vh" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--foreground)" }}>Transfer Order</h3>
              <button onClick={() => setTransferModalOpen(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.9rem" }}>Select a free table to move this order to.</p>
              
              {allSpots.filter(s => s.id !== spot.id).map(s => {
                const isFree = s.has_active_bill === 0;
                return (
                  <div 
                    key={s.id} 
                    onClick={async () => {
                      if (!isFree) return;
                      if (confirm(`Move order to ${s.label}?`)) {
                        const res = await transferBill({
                          billId: activeBill.id,
                          oldSpotId: spot.id,
                          targetSpotId: s.id,
                          targetSpotLabel: s.label,
                          keepOwnership: transferKeepOwnership,
                          currentWaiterId: waiter.id
                        });
                        if (res.success) {
                          setTransferModalOpen(false);
                          router.push(`/individual/workspace/${workspaceId}/spot/${s.id}`);
                        } else {
                          alert(res.error || "Failed to transfer");
                        }
                      }
                    }}
                    style={{ 
                      padding: "16px", borderRadius: "12px", border: "1px solid var(--card-border)", 
                      background: isFree ? "var(--card-bg)" : "rgba(0,0,0,0.05)",
                      opacity: isFree ? 1 : 0.5,
                      cursor: isFree ? "pointer" : "not-allowed",
                      display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{s.label}</span>
                    <span style={{ fontSize: "0.8rem", color: isFree ? "#10b981" : "var(--text-muted)", fontWeight: 700 }}>
                      {isFree ? "Free" : "Occupied"}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <label style={{ display: "flex", alignItems: "center", gap: "12px", background: "var(--card-bg)", padding: "16px", borderRadius: "12px", border: "1px solid var(--card-border)", cursor: "pointer" }}>
              <input 
                type="checkbox" 
                checked={transferKeepOwnership} 
                onChange={(e) => setTransferKeepOwnership(e.target.checked)} 
                style={{ width: "20px", height: "20px", accentColor: "var(--primary)" }} 
              />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontWeight: 700, color: "var(--foreground)" }}>Keep Ownership</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>I will continue serving these guests and receive their tips.</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && activeBill && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 110, display: "flex", alignItems: "flex-end", justifyContent: "center" }} className="md:items-center">
          <div style={{ background: "var(--background)", width: "100%", maxWidth: "450px", padding: "24px", paddingBottom: "max(24px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: "24px", maxHeight: "90vh" }} className="rounded-t-[24px] md:rounded-[24px]">
            
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "var(--foreground)" }}>
                {editTarget === 'bill' ? 'Edit Bill Discount' : `Edit Position`}
              </h3>
              <button 
                onClick={() => { setEditModalOpen(false); setEditTarget(null); setInputValue(""); setEditReason(""); }} 
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "8px", margin: "-8px" }}
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Main Tabs */}
            <div style={{ display: "flex", gap: "8px", background: "var(--input-bg)", padding: "4px", borderRadius: "12px" }}>
              {editTarget !== 'bill' && (
                <button
                  onClick={() => {
                    setEditTab("quantity");
                    if (typeof editTarget === 'number') {
                      setInputValue(items[editTarget].quantity.toString());
                    }
                  }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: editTab === "quantity" ? "var(--background)" : "transparent", color: editTab === "quantity" ? "var(--foreground)" : "var(--text-muted)", fontWeight: editTab === "quantity" ? 700 : 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: editTab === "quantity" ? "0 2px 8px rgba(0,0,0,0.05)" : "none" }}
                >
                  Quantity
                </button>
              )}
              <button
                onClick={() => {
                  setEditTab("discount");
                  setInputValue("");
                }}
                style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: editTab === "discount" ? "var(--background)" : "transparent", color: editTab === "discount" ? "var(--foreground)" : "var(--text-muted)", fontWeight: editTab === "discount" ? 700 : 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: editTab === "discount" ? "0 2px 8px rgba(0,0,0,0.05)" : "none" }}
              >
                Discount
              </button>
              {editTarget !== 'bill' && (
                <button
                  onClick={() => {
                    setEditTab("price");
                    if (typeof editTarget === 'number') {
                      const item = items[editTarget];
                      setInputValue((priceMode === 'total' ? item.price * item.quantity : item.price).toString());
                    }
                  }}
                  style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "none", background: editTab === "price" ? "var(--background)" : "transparent", color: editTab === "price" ? "var(--foreground)" : "var(--text-muted)", fontWeight: editTab === "price" ? 700 : 600, cursor: "pointer", fontSize: "0.9rem", boxShadow: editTab === "price" ? "0 2px 8px rgba(0,0,0,0.05)" : "none" }}
                >
                  Set Price
                </button>
              )}
            </div>

            {/* Sub-toggles based on active tab */}
            {editTab === "discount" && (
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", border: `2px solid ${discountMode === "percent" ? "var(--primary)" : "var(--card-border)"}`, background: discountMode === "percent" ? "rgba(var(--primary-rgb), 0.1)" : "transparent", cursor: "pointer", fontWeight: 700, color: discountMode === "percent" ? "var(--foreground)" : "var(--text-muted)" }}>
                  <input type="radio" checked={discountMode === "percent"} onChange={() => { setDiscountMode("percent"); setInputValue(""); }} style={{ display: "none" }} />
                  Percent (%)
                </label>
                <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", border: `2px solid ${discountMode === "amount" ? "var(--primary)" : "var(--card-border)"}`, background: discountMode === "amount" ? "rgba(var(--primary-rgb), 0.1)" : "transparent", cursor: "pointer", fontWeight: 700, color: discountMode === "amount" ? "var(--foreground)" : "var(--text-muted)" }}>
                  <input type="radio" checked={discountMode === "amount"} onChange={() => { setDiscountMode("amount"); setInputValue(""); }} style={{ display: "none" }} />
                  Amount (-$)
                </label>
              </div>
            )}

            {editTab === "price" && (
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", border: `2px solid ${priceMode === "per_item" ? "var(--primary)" : "var(--card-border)"}`, background: priceMode === "per_item" ? "rgba(var(--primary-rgb), 0.1)" : "transparent", cursor: "pointer", fontWeight: 700, color: priceMode === "per_item" ? "var(--foreground)" : "var(--text-muted)" }}>
                  <input type="radio" checked={priceMode === "per_item"} onChange={() => {
                    setPriceMode("per_item");
                    if (typeof editTarget === 'number') {
                      setInputValue(items[editTarget].price.toString());
                    }
                  }} style={{ display: "none" }} />
                  Per Item
                </label>
                <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px", borderRadius: "12px", border: `2px solid ${priceMode === "total" ? "var(--primary)" : "var(--card-border)"}`, background: priceMode === "total" ? "rgba(var(--primary-rgb), 0.1)" : "transparent", cursor: "pointer", fontWeight: 700, color: priceMode === "total" ? "var(--foreground)" : "var(--text-muted)" }}>
                  <input type="radio" checked={priceMode === "total"} onChange={() => {
                    setPriceMode("total");
                    if (typeof editTarget === 'number') {
                      const item = items[editTarget];
                      setInputValue((item.price * item.quantity).toString());
                    }
                  }} style={{ display: "none" }} />
                  Total Price
                </label>
              </div>
            )}

            {/* Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  placeholder={editTab === "quantity" ? "Enter quantity" : editTab === "discount" ? (discountMode === "percent" ? "e.g. 10" : "e.g. 50") : "Enter price"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--foreground)", fontSize: "1.25rem", fontWeight: 800, textAlign: "center" }}
                />
              </div>
              
              {editTab === "discount" && (
                <input
                  type="text"
                  placeholder="Reason (optional, e.g. Staff Discount)"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{ width: "100%", padding: "16px", borderRadius: "12px", border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--foreground)", fontSize: "1rem" }}
                />
              )}
            </div>

            {/* Actions */}
            <button
              onClick={async () => {
                const val = parseFloat(inputValue);
                if (isNaN(val) || val < 0) return alert("Please enter a valid number.");
                
                if (editTarget === 'bill') {
                  // Only discount tab applies to bill
                  let discountVal = val;
                  if (discountMode === 'percent') {
                    discountVal = activeBill.amount * (val / 100);
                  }
                  const res = await addBillDiscount({ billId: activeBill.id, discountAmount: discountVal, reason: editReason || "Manager Discount" });
                  if (res.success) {
                    setEditModalOpen(false);
                    router.refresh();
                  } else {
                    alert(res.error || "Failed to apply discount");
                  }
                } else if (typeof editTarget === 'number') {
                  const item = items[editTarget];
                  
                  if (editTab === 'quantity') {
                    const delta = val - item.quantity;
                    if (delta !== 0) {
                      const res = await updateWaiterCartQuantity({ billId: activeBill.id, itemIndex: editTarget, delta });
                      if (!res.success) alert(res.error || "Failed to update quantity");
                    }
                  } else if (editTab === 'price') {
                    const newPrice = priceMode === 'total' ? (val / item.quantity) : val;
                    const res = await updateWaiterCartItemPrice({ billId: activeBill.id, itemIndex: editTarget, newPrice });
                    if (!res.success) alert(res.error || "Failed to edit price");
                  } else if (editTab === 'discount') {
                    const newPrice = discountMode === 'amount' 
                      ? Math.max(0, item.price - (val / item.quantity))
                      : Math.max(0, item.price * (1 - val / 100));
                    const res = await updateWaiterCartItemPrice({ billId: activeBill.id, itemIndex: editTarget, newPrice });
                    if (!res.success) alert(res.error || "Failed to apply discount");
                  }
                  
                  setEditModalOpen(false);
                  router.refresh();
                }
              }}
              style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "var(--primary)", color: "#000", border: "none", cursor: "pointer", fontWeight: 800, fontSize: "1.1rem", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(var(--primary-rgb), 0.2)" }}
            >
              <Check size={20} /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

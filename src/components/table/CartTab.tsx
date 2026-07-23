"use client";

import React from "react";
import { ShoppingBag, Minus, Plus, Check } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useTableState } from "@/components/AppStateContext";

export default function CartTab() {
  const params = useParams();
  const router = useRouter();
  const tableCode = params.tableCode as string;

  const {
    displayCurrency,
    cartItems,
    addToCart,
    removeFromCart,
    placeOrder,
    isOrdering,
    orderingSuccess,
    setOrderingSuccess,
    language,
    tableLabel,
    pendingCartItems,
    pendingItems,
    deviceId,
    draftItems,
    othersDraftItems,
    waiterDraftItems,
    confirmedItems,
    currentBillAmount,
    resolvedSpotLabel,
    resolvedRoleLabel,
    resolvedRoleNoun,
    setActiveTab,
  } = useTableState();

  const hasAnyItems = draftItems.length > 0 || othersDraftItems.length > 0 || pendingItems.length > 0 || confirmedItems.length > 0;
  const isRTL = language === "ar";

  React.useEffect(() => {
    // Keep empty or just remove this block.
    // Cleaned up the 5 second timeout for order confirmation to fix bug.
  }, []);

  return (
    <div className="cart-page-wrapper" dir={isRTL ? "rtl" : "ltr"}>
      {/* Scoped CSS styles to isolate the cart and guarantee perfect visuals */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cart-page-wrapper {
          padding: 8px 20px;
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: cartFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes cartFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-amber {
          0% {
            box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(217, 119, 6, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(217, 119, 6, 0);
          }
        }

        /* Header block */
        .cart-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .cart-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: rgba(13, 148, 136, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0d9488;
        }
        .cart-header-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        /* Main Cart Card */
        .cart-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.015);
        }

        /* Cart Item Row */
        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
          margin-bottom: 12px;
        }
        .cart-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
          margin-bottom: 0;
        }
        
        .cart-item-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
          align-items: flex-start;
        }
        .cart-item-name {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .cart-item-price {
          font-size: 11px;
          font-weight: 800;
          color: #b58a1c;
        }

        /* Qty Selector */
        .cart-qty-selector {
          display: flex;
          align-items: center;
          background: #f0fdfa;
          border: 1px solid rgba(13, 148, 136, 0.2);
          border-radius: 9999px;
          padding: 2px;
          gap: 8px;
          height: 30px;
        }
        .cart-qty-btn {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(13, 148, 136, 0.1);
          color: #0d9488;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          outline: none;
          transition: background-color 0.2s, transform 0.1s ease;
        }
        .cart-qty-btn:active {
          background: #e0f2fe;
          transform: scale(0.92);
        }
        .cart-qty-val {
          font-size: 12px;
          font-weight: 800;
          color: #1e293b;
          min-width: 14px;
          text-align: center;
        }

        /* Empty Cart State */
        .cart-empty-card {
          text-align: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 48px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .cart-empty-title {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          margin: 4px 0 0 0;
        }
        .cart-empty-text {
          font-size: 11px;
          color: #94a3b8;
          max-width: 220px;
          line-height: 1.5;
          margin: 0;
        }
        .cart-empty-btn {
          background: #0d9488;
          color: #ffffff;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          margin-top: 8px;
          text-decoration: none;
        }

        /* Order Placing Loading Block */
        .cart-loading-card {
          text-align: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 48px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .cart-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e2e8f0;
          border-left-color: #0d9488;
          border-radius: 50%;
          animation: cartSpin 0.8s linear infinite;
        }
        @keyframes cartSpin {
          to { transform: rotate(360deg); }
        }
        .cart-loading-title {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        /* Success screen card */
        .cart-success-card {
          text-align: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 36px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }
        .cart-success-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: #f0fdf4;
          color: #22c55e;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #bbf7d0;
          box-shadow: 0 4px 10px rgba(34, 197, 94, 0.1);
        }
        .cart-success-title {
          font-size: 16px;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }
        .cart-success-text {
          font-size: 11px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 8px 0;
          max-width: 260px;
        }
        
        /* Action buttons */
        .cart-action-btn {
          width: 100%;
          height: 44px;
          border-radius: 14px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .cart-action-btn-primary {
          background: #0d9488;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
        }
        .cart-action-btn-primary:active {
          transform: scale(0.97);
          background: #0c857a;
        }
        
        /* Footer Checkout Summary */
        .cart-footer {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .cart-total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          padding: 0 4px;
        }
        .cart-total-price {
          font-size: 15px;
          font-weight: 800;
          color: #b58a1c;
        }
      ` }} />

      {/* Cart Title Header */}
      <div className="cart-header">
        <h3 className="cart-header-title">
          {language === "ar" ? "سلة الطلبات" : "Your Cart"}
        </h3>
      </div>
      
      {/* Dynamic Conditional Rendering */}
      {!hasAnyItems ? (
        <div className="cart-empty-card">
          <ShoppingBag size={40} style={{ strokeWidth: 1.5, opacity: 0.35, color: "#64748b" }} />
          <h3 className="cart-empty-title">
            {language === "ar" ? "سلتك فارغة" : "Your Cart is Empty"}
          </h3>
          <p className="cart-empty-text">
            {language === "ar" 
              ? "الرجاء اختيار وجباتك أولاً من قائمة المأكولات الرقمية." 
              : "Choose your dishes from our digital menu first."}
          </p>
          <button
            type="button"
            onClick={() => setActiveTab("menu")}
            className="cart-empty-btn"
            style={{ border: "none" }}
          >
            {language === "ar" ? "تصفح القائمة" : "Browse Menu"}
          </button>
        </div>
      ) : (
        <>
          {/* Top Banner Notifications */}
          {isOrdering && (
            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", color: "#d97706", padding: "12px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 700 }}>
              <div className="cart-loading-spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", borderLeftColor: "#d97706", flexShrink: 0 }} />
              {language === "ar" ? "جاري استدعاء النادل..." : "Calling Waiter..."}
            </div>
          )}
          {orderingSuccess && (
            <div style={{ background: "#dcfce7", border: "1px solid #bbf7d0", color: "#16a34a", padding: "12px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontWeight: 700, animation: "cartFadeIn 0.3s ease-out" }}>
              <Check size={18} strokeWidth={3} style={{ flexShrink: 0 }} />
              {language === "ar" ? "سيأتي النادل قريباً لمراجعة طلبك!" : "The waiter will be right with you!"}
            </div>
          )}

          {/* Printed thermal receipt style cart items */}
          <div className="printerSlotWrapper">
            <div className="printerSlot" />
            <div className="printOutputWrapper">
              <div className="receiptCard">
                <div style={{ textAlign: "center", marginBottom: "14px" }}>
                  <h4 style={{ margin: "0", fontSize: "14px", fontWeight: 800, letterSpacing: "0.05em", color: "#0f172a" }}>
                    {language === "ar" ? "تفاصيل الطلب الجديد" : "NEW ORDER DETAILS"}
                  </h4>
                  <div style={{ fontSize: "9px", color: "#64748b", display: "flex", justifyContent: "space-between", width: "100%", marginTop: "6px" }}>
                    <span>{resolvedSpotLabel.toUpperCase()}: {tableLabel || tableCode}</span>
                    <span>{language === "ar" ? "الوقت" : "TIME"}: {new Date().toLocaleTimeString(language === "ar" ? "ar-EG" : "en-GB", { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                
                <div className="receiptDivider" />
                
                <div>
                  {/* --- Confirmed Items --- */}
                  {confirmedItems.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        {language === "ar" ? "طلبات مؤكدة" : "CONFIRMED ORDERS"}
                      </div>
                      {confirmedItems.map((item: any, idx: number) => (
                        <div className="receiptItem" key={item.id || `confirmed-${idx}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: item.price < 0 ? "#16a34a" : "#0f172a", marginBottom: "6px", fontFamily: "inherit" }}>
                          <span>{item.quantity} × {item.name}</span>
                          <span style={{ fontWeight: "bold" }}>
                            {item.originalPrice !== undefined && item.originalPrice > item.price && (
                              <span style={{ textDecoration: "line-through", color: "#94a3b8", marginRight: "6px", fontWeight: "normal" }}>
                                {item.originalPrice * item.quantity}
                              </span>
                            )}
                            {item.price * item.quantity} {displayCurrency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- Pending Items --- */}
                  {pendingItems.length > 0 && (
                    <div style={{ marginBottom: "16px", padding: "8px", background: "#fffbeb", border: "1px dashed #f59e0b", borderRadius: "8px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#d97706", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", textAlign: "center" }}>
                        {language === "ar" ? "في انتظار تأكيد النادل" : "WAITING FOR WAITER APPROVAL"}
                      </div>
                      {pendingItems.map((item: any, idx: number) => (
                        <div className="receiptItem" key={item.id || `pending-${idx}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: item.price < 0 ? "#16a34a" : "#92400e", marginBottom: "6px", fontFamily: "inherit" }}>
                          <span>{item.quantity} × {item.name}</span>
                          <span style={{ fontWeight: "bold" }}>
                            {item.originalPrice !== undefined && item.originalPrice > item.price && (
                              <span style={{ textDecoration: "line-through", color: "#94a3b8", marginRight: "6px", fontWeight: "normal" }}>
                                {item.originalPrice * item.quantity}
                              </span>
                            )}
                            {item.price * item.quantity} {displayCurrency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- Others' Drafts --- */}
                  {othersDraftItems.length > 0 && (
                    <div style={{ marginBottom: "16px", opacity: 0.6 }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        {language === "ar" ? "ضيوف آخرون يختارون..." : "OTHER GUESTS ARE CHOOSING..."}
                      </div>
                      {othersDraftItems.map((item: any, idx: number) => (
                        <div className="receiptItem" key={item.id || `other-draft-${idx}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b", marginBottom: "6px", fontFamily: "inherit" }}>
                          <span>{item.quantity} × {item.name}</span>
                          <span>{item.price * item.quantity} {displayCurrency}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- Waiter Drafts --- */}
                  {waiterDraftItems.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#f59e0b", animation: "cartSpin 1.5s linear infinite" }}></span>
                        {language === "ar" ? "النادل يقوم بإضافة..." : "WAITER IS ADDING..."}
                      </div>
                      {waiterDraftItems.map((item: any, idx: number) => (
                        <div className="receiptItem" key={item.id || `waiter-draft-${idx}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#b45309", marginBottom: "6px", fontFamily: "inherit" }}>
                          <span>{item.quantity} × {item.name}</span>
                          <span>{item.price * item.quantity} {displayCurrency}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* --- Your Drafts --- */}
                  {draftItems.length > 0 && (
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: "bold", color: "#0d9488", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                        {language === "ar" ? "طلبك (مسودة)" : "YOUR ORDER (DRAFT)"}
                      </div>
                      {draftItems.map((item: any, idx: number) => (
                        <div className="receiptItem" key={item.id || `draft-${idx}`} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "4px", marginBottom: "12px", minHeight: "auto", fontFamily: "'Courier New', Courier, monospace" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", width: "100%" }}>
                            <span className="receiptItemName" style={{ fontSize: "12px", fontWeight: 700, color: "#0f172a", whiteSpace: "normal", wordBreak: "break-word", lineHeight: "1.3" }}>
                              {item.name}
                            </span>
                            <div className="cart-qty-selector" style={{ flexShrink: 0 }}>
                              <button type="button" className="cart-qty-btn" onClick={() => removeFromCart(item.id!)}>
                                <Minus size={8} strokeWidth={4} />
                              </button>
                              <span className="cart-qty-val">{item.quantity}</span>
                              <button type="button" className="cart-qty-btn" onClick={() => addToCart({ id: item.id!, name: item.name, price: item.price, original_price: item.originalPrice } as any)}>
                                <Plus size={8} strokeWidth={4} />
                              </button>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingLeft: isRTL ? "0" : "12px", paddingRight: isRTL ? "12px" : "0", fontSize: "11px", color: "#64748b" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span className="receiptItemPrice" style={{ color: item.originalPrice ? "#16a34a" : "#0f172a", fontFamily: "inherit", fontWeight: item.quantity > 1 ? 600 : 800 }}>
                                {item.quantity > 1 ? `${item.quantity} × ${item.price} ${displayCurrency}` : `${item.price} ${displayCurrency}`}
                              </span>
                              {item.originalPrice !== undefined && item.originalPrice > item.price && (
                                <span style={{ fontSize: "10px", textDecoration: "line-through", color: "#94a3b8" }}>
                                  {item.originalPrice}
                                </span>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <span className="receiptItemPrice" style={{ color: "#0f172a", fontFamily: "inherit", fontWeight: 800 }}>
                                {item.price * item.quantity} {displayCurrency}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="receiptDivider" />
                
                <div className="receiptTotal" style={{ flexDirection: "column", alignItems: "stretch", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>{language === "ar" ? "الإجمالي (المؤكد)" : "Total (Confirmed)"}</span>
                    <span>{currentBillAmount} {displayCurrency}</span>
                  </div>
                  
                  {(draftItems.length > 0 || othersDraftItems.length > 0 || waiterDraftItems.length > 0) && (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                        <span>{language === "ar" ? "عناصر جديدة (مسودة)" : "New Items (Draft)"}</span>
                        <span>
                          {[...draftItems, ...othersDraftItems, ...waiterDraftItems].reduce((s, i) => s + (i.price * i.quantity), 0)} {displayCurrency}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed rgba(0,0,0,0.1)", marginTop: "4px", color: "#0d9488" }}>
                        <span>{language === "ar" ? "الإجمالي (المتوقع)" : "Total (Expected)"}</span>
                        <span>
                          {currentBillAmount + [...draftItems, ...othersDraftItems, ...waiterDraftItems].reduce((s, i) => s + (i.price * i.quantity), 0)} {displayCurrency}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Checkout block */}
          {draftItems.length > 0 && (
            <div className="cart-footer">
              <button
                type="button"
                className="cart-action-btn cart-action-btn-primary"
                onClick={placeOrder}
              >
                {language === "ar" ? "استدعاء النادل" : "Call Waiter"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

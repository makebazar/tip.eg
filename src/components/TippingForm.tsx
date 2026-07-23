"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import NumberFlow from "@number-flow/react";
import { useTableState, EXCHANGE_RATE, FEE_RATE, menuDb, defaultMenuItems } from "./AppStateContext";

// Build once at module load — does not depend on component state
const allMenuItems = [...Object.values(menuDb).flat(), ...defaultMenuItems];
const dishNameArMap: Record<string, string> = {};
allMenuItems.forEach((item) => {
  if (item.name_ar) dishNameArMap[item.name] = item.name_ar;
});

export default function TippingForm() {
  const params = useParams();
  const isPersonal = !!params.profileCode;

  const {
    waiter,
    displayCurrency,
    language,
    t,
    payBill,
    setPayBill,
    rating,
    selectedTags,
    comments,
    setComments,
    currentBill,
    currentBillItems,
    currentBillAmount,
    isBillPaid,
    selectedPreset,
    setSelectedPreset,
    tipAmountInput,
    setTipAmountInput,
    coverFee,
    setCoverFee,
    checkoutState,
    errorMessage,
    triggerPayment,
    tableLabel,
    resolvedRoleLabel,
    resolvedSpotLabel,
    resolvedRoleNoun,
    confirmedItems,
  } = useTableState();

  const [isFeeExpanded, setIsFeeExpanded] = useState(false);
  const [feeTapCount, setFeeTapCount] = useState(0);

  const handleSecretFeeTap = () => {
    // Easter egg: triple-tap reveals the processing fee toggle
    const nextCount = feeTapCount + 1;
    setFeeTapCount(nextCount);
    if (nextCount >= 3) {
      setIsFeeExpanded((prev) => !prev);
      setFeeTapCount(0);
    }
  };

  const handlePresetClick = (val: number | "custom") => {
    setSelectedPreset(val);
    if (val === "custom") {
      setTipAmountInput("");
    } else {
      if (!currentBill) {
        setTipAmountInput(val.toString());
      }
    }
  };

  const activeProfile = {
    id: waiter.id,
    name: (language === "ar" && waiter.name_ar) ? waiter.name_ar : waiter.name,
    avatar_url: waiter.avatar_url,
    saving_goal: (language === "ar" && waiter.saving_goal_ar) ? waiter.saving_goal_ar : waiter.saving_goal,
    label: resolvedRoleLabel
  };

  const personalPresets = displayCurrency === "USD" ? [5, 10, 20] : [50, 100, 200];

  // Calculations (FEE_RATE fee on both bill and tips)
  const enteredTipAmount = parseFloat(tipAmountInput) || 0;
  const activeBillAmount = displayCurrency === "USD" ? (currentBillAmount / EXCHANGE_RATE) : currentBillAmount;
  const activeBillToPay = payBill ? activeBillAmount : 0;
  
  const subtotal = activeBillToPay + enteredTipAmount;
  const feeAmount = coverFee ? subtotal * FEE_RATE : 0;
  const totalAmount = subtotal + feeAmount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {isBillPaid && (
        <div style={{
          width: "100%",
          background: "rgba(13, 148, 136, 0.1)",
          border: "1px solid #0d9488",
          color: "#0d9488",
          padding: "12px 16px",
          borderRadius: "16px",
          textAlign: "center",
          fontSize: "0.85rem",
          fontWeight: "600"
        }}>
          {t.billAlreadyPaid}
          <br/>
          <span style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 500 }}>
            {t.stillLeaveTip}
          </span>
        </div>
      )}
      
      {/* Bill Details if present at the top of the form */}
      {currentBill ? (
        <div className="printerSlotWrapper" id="printer-slot-section">
          <div className="printerSlot" />
          <div className="printOutputWrapper">
          <div className="receiptCard">
            <div style={{ textAlign: "center", marginBottom: "14px", display: "flex", flexDirection: "column", gap: "2px" }}>
              <h4 style={{ margin: "0", fontSize: "14px", fontWeight: 800, letterSpacing: "0.05em", color: "#0f172a" }}>
                {waiter.restaurant_name ? waiter.restaurant_name.toUpperCase() : "RECEIPT"}
              </h4>
              <div style={{ fontSize: "9px", color: "#64748b", display: "flex", justifyContent: "space-between", width: "100%", marginTop: "6px" }}>
                <span>{resolvedRoleNoun}: {(language === "ar" && waiter.name_ar) ? waiter.name_ar : waiter.name.toUpperCase()}</span>
                <span>{t.date}: {new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB")}</span>
              </div>
            </div>
            
            <div className="receiptDivider" />
            
            <div>
              {confirmedItems.map((item, idx) => (
                <div className="receiptItem" key={`${item.name}-${idx}`}>
                  <span className="receiptItemName">
                    <span className="receiptItemQty">{item.quantity}</span> × {language === "ar" ? (dishNameArMap[item.name] || item.name) : item.name}
                  </span>
                  <span className="receiptItemPrice" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: '1.2' }}>
                    {item.originalPrice !== undefined && item.originalPrice > item.price && (
                      <span style={{ textDecoration: "line-through", color: "#94a3b8", fontSize: "0.85em" }}>
                        {((item.originalPrice * item.quantity) * (displayCurrency === "USD" ? 1 / EXCHANGE_RATE : 1)).toFixed(2)} {displayCurrency}
                      </span>
                    )}
                    <span>
                      {((item.price * item.quantity) * (displayCurrency === "USD" ? 1 / EXCHANGE_RATE : 1)).toFixed(2)} {displayCurrency}
                    </span>
                  </span>
                </div>
              ))}
            </div>
            
            <div className="receiptDivider" />
            
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: "2px 0" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                {t.includeFoodBill}
              </span>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={payBill}
                  onChange={(e) => setPayBill(e.target.checked)}
                  className="absolute opacity-0 w-0 h-0 toggleInput"
                />
                <span className="toggleSlider" />
              </div>
            </label>

            <div className="receiptDivider" />
            
            <div className="receiptTotal">
              <span>{t.billSubtotal}</span>
              <span>
                {activeBillToPay.toFixed(2)} {displayCurrency}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "20px" }}>
              <div style={{ letterSpacing: "5px", fontSize: "14px", color: "#475569", fontFamily: "monospace", opacity: 0.6, userSelect: "none" }}>
                ||||| | |||| ||| | |||
              </div>
            </div>
          </div>
          </div>
        </div>
      ) : isPersonal ? null : (
        <div style={{
          width: "100%",
          background: "#ffffff",
          border: "1px dashed #cbd5e1",
          color: "#64748b",
          padding: "24px 20px",
          borderRadius: "24px",
          textAlign: "center",
          fontSize: "0.85rem",
          fontWeight: "500",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.015)"
        }}>
          <span style={{ fontSize: "1.5rem" }}>🍽️</span>
          <span style={{ fontWeight: "700", color: "#334155" }}>
            {language === "ar" ? "في انتظار الطلب" : "Waiting for Order"}
          </span>
          <span>
            {language === "ar" 
              ? "سيظهر تفاصيل طلبك هنا بمجرد تأكيده من قبل النادل." 
              : "Your order details will appear here once confirmed by the waiter."}
          </span>
        </div>
      )}

      {/* Waiter Details Card */}
      <div className="waiterCard">
        <div className="waiterAvatarWrapper" style={{ filter: "url(#SkiperSquiCircleFilterLayout)" }}>
          <img
            src={activeProfile.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
            alt={activeProfile.name}
            className="waiterAvatar"
          />
        </div>
        <div className="waiterInfo">
          <span className="waiterLabel">{activeProfile.label}</span>
          <h2 className="waiterName">{activeProfile.name}</h2>
          {activeProfile.saving_goal && (
            <span className="waiterGoalText">
              {activeProfile.saving_goal}
            </span>
          )}
        </div>
      </div>

      {/* Tip Picker */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="sectionTitle">{t.selectTipAmount}</span>
        </div>

        {/* Large Centered Tip Card (Single Animated / Editable Block without cents) */}
        <div
          onClick={() => {
            if (selectedPreset !== "custom") {
              setSelectedPreset("custom");
            }
          }}
          style={{
            background: "#ffffff",
            border: selectedPreset === "custom" ? "1.5px solid #0d9488" : "1px solid #e2e8f0",
            borderRadius: "24px",
            padding: "24px 16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: selectedPreset === "custom" ? "0 0 0 4px rgba(13, 148, 136, 0.1)" : "0 4px 16px rgba(0, 0, 0, 0.015)"
          }}
        >
          {selectedPreset === "custom" ? (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "6px", width: "100%" }}>
              <input
                type="number"
                value={tipAmountInput === "0" ? "" : tipAmountInput}
                onChange={(e) => {
                  setSelectedPreset("custom");
                  setTipAmountInput(e.target.value);
                }}
                placeholder="0"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: "36px",
                  fontWeight: 800,
                  color: "#0f172a",
                  textAlign: "center",
                  width: "160px"
                }}
                autoFocus
              />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>{displayCurrency}</span>
            </div>
          ) : (
            <div style={{ fontSize: "36px", fontWeight: 800, color: "#0f172a", display: "flex", alignItems: "baseline", gap: "6px" }}>
              <NumberFlow
                value={Math.round(enteredTipAmount)}
                format={{ style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }}
              />
              <span style={{ fontSize: "14px", fontWeight: 700, color: "#64748b" }}>{displayCurrency}</span>
            </div>
          )}
        </div>

        {/* Presets Grid */}
        {currentBill ? (
          <div className="presetsGrid">
            {[10, 15, 20].map((percent) => (
              <button
                type="button"
                key={percent}
                onClick={() => handlePresetClick(percent)}
                className={`presetBtn ${selectedPreset === percent ? "presetBtnActive" : ""}`}
              >
                {percent}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePresetClick("custom")}
              className={`presetBtn ${selectedPreset === "custom" ? "presetBtnActive" : ""}`}
            >
              {t.customTip}
            </button>
          </div>
        ) : (
          <div className="presetsGrid">
            {personalPresets.map((amount) => (
              <button
                type="button"
                key={amount}
                onClick={() => handlePresetClick(amount)}
                className={`presetBtn ${selectedPreset === amount ? "presetBtnActive" : ""}`}
              >
                {displayCurrency === "USD" ? `$${amount}` : `${amount} ${displayCurrency}`}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePresetClick("custom")}
              className={`presetBtn ${selectedPreset === "custom" ? "presetBtnActive" : ""}`}
            >
              {t.customTip}
            </button>
          </div>
        )}
      </div>

      {/* Single-line Expandable Processing Fee Info */}
      <div style={{ marginTop: "8px", width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => setIsFeeExpanded(!isFeeExpanded)}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px"
            }}
          >
            <span>{t.processingFeeInfo}</span>
            <span style={{ fontSize: "9px" }}>{isFeeExpanded ? "▲" : "▼"}</span>
          </button>
        </div>

        {isFeeExpanded && (
          <div
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "14px 18px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "16px",
              fontSize: "12px",
              color: "#475569",
              fontWeight: 500,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              boxSizing: "border-box"
            }}
          >
            <span>5% processing fee (bill + tips)</span>
            <label className="toggleSwitchWrapper" style={{ flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={coverFee}
                onChange={(e) => setCoverFee(e.target.checked)}
                className="toggleInput"
              />
              <span className="toggleSlider" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

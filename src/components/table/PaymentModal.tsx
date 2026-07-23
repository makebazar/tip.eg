"use client";

import React from "react";
import { Check, ShieldAlert } from "lucide-react";
import { useTableState } from "@/components/AppStateContext";

export default function PaymentModal() {
  const {
    waiter,
    t,
    checkoutState,
    setCheckoutState,
    receipt,
    errorMessage,
    setSelectedPreset,
    setComments,
    setTipAmountInput
  } = useTableState();

  if (checkoutState === "idle") return null;

  return (
    <>
      {/* Processing Overlay */}
      {checkoutState === "processing" && (
        <div className="dialogOverlay" style={{ zIndex: 9999 }}>
          <div className="dialogCard">
            <div className="spinnerElement" style={{ width: "36px", height: "36px", borderLeftColor: "#0f172a" }} />
            <h3 className="dialogTitle">{t.processing}</h3>
            <p className="dialogText">{t.contactingBank}</p>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {checkoutState === "success" && receipt && (
        <div className="dialogOverlay" style={{ zIndex: 9999 }}>
          <div className="dialogCard">
            <div className="dialogIconSuccess" style={{ background: "#f0fdf4", color: "#16a34a", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <Check size={24} />
            </div>
            <h3 className="dialogTitle">{t.shukran}</h3>
            <p className="dialogText">{t.paymentSuccess}</p>

            <div className="dialogReceipt" style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "16px", borderRadius: "16px", margin: "16px 0", fontSize: "13px", color: "#475569", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="dialogReceiptRow" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{t.recipient}</span>
                <span style={{ fontWeight: 650, color: "#0f172a" }}>
                  {waiter.name}
                </span>
              </div>
              {receipt.billPaid > 0 && (
                <div className="dialogReceiptRow" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t.foodBill}</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {receipt.billPaid.toFixed(2)} {receipt.currencyPaid}
                  </span>
                </div>
              )}
              {receipt.tipPaid > 0 && (
                <div className="dialogReceiptRow" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t.tip}</span>
                  <span style={{ fontWeight: 700, color: "#0f172a" }}>
                    {receipt.tipPaid.toFixed(2)} {receipt.currencyPaid}
                  </span>
                </div>
              )}
              <div className="dialogReceiptRow dialogReceiptRowTotal" style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "8px", fontWeight: 800, color: "#0f172a", fontSize: "14px" }}>
                <span>{t.totalPaid}</span>
                <span>
                  {receipt.totalPaid.toFixed(2)} {receipt.currencyPaid}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="dialogCloseBtn"
              style={{ width: "100%", padding: "12px", background: "#0f172a", color: "#ffffff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}
              onClick={() => {
                setCheckoutState("idle");
                setTipAmountInput("0");
                setSelectedPreset(10);
                setComments("");
                window.location.reload();
              }}
            >
              {t.done}
            </button>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {checkoutState === "error" && (
        <div className="dialogOverlay" style={{ zIndex: 9999 }}>
          <div className="dialogCard">
            <div style={{ background: "#fef2f2", color: "#ef4444", width: "48px", height: "48px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
              <ShieldAlert size={24} />
            </div>
            <h3 className="dialogTitle" style={{ color: "#ef4444" }}>{t.paymentFailed}</h3>
            <p className="dialogText">
              {errorMessage}
            </p>
            <button
              type="button"
              className="dialogCloseBtn"
              style={{ width: "100%", padding: "12px", background: "#ef4444", color: "#ffffff", border: "none", borderRadius: "12px", fontWeight: 700, cursor: "pointer" }}
              onClick={() => setCheckoutState("idle")}
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

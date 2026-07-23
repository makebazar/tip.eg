"use client";

import React from "react";
import { Wifi } from "lucide-react";
import { useTableState } from "@/components/AppStateContext";

interface WifiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WifiModal({ isOpen, onClose }: WifiModalProps) {
  const { waiter, language, t } = useTableState();
  if (!isOpen) return null;

  const isRTL = language === "ar";
  const ssid = waiter.restaurant_name ? `${waiter.restaurant_name.replace(/\s+/g, "_")}_Guest` : "Baksheesh_Guest_WiFi";
  const password = "welcomeegyptegypt";

  return (
    <div className="dialogOverlay">
      <div className="dialogCard">
        <h3 className="dialogTitle" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
          <Wifi size={18} style={{ color: "#b58a1c" }} /> {t.guestWifi}
        </h3>
        <p className="dialogText">
          {language === "ar" ? "امسح رمز QR أو انسخ كلمة المرور للاتصال بشبكة المطعم." : "Scan the QR code or copy the password to connect to the restaurant network."}
        </p>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "14px", borderRadius: "12px", textAlign: isRTL ? "right" : "left", fontSize: "12px", marginBottom: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
          <div>
            <span style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.network}</span>
            <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {ssid}
            </div>
          </div>
          <div>
            <span style={{ fontSize: "9px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.password}</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
              <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#0f172a" }}>{password}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(password);
                  alert(language === "ar" ? "تم النسخ!" : "Password copied!");
                }}
                style={{ background: "#e2e8f0", border: "none", color: "#475569", padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 700, cursor: "pointer" }}
              >
                {t.copy}
              </button>
            </div>
          </div>
        </div>

        <div style={{ width: "100px", height: "100px", margin: "0 auto 20px auto", border: "1px solid #e2e8f0", padding: "6px", borderRadius: "12px", background: "#ffffff" }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=WIFI:S:${ssid};T:WPA;P:${password};;`}
            alt="WiFi QR Code"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </div>

        <button
          type="button"
          className="dialogCloseBtn"
          style={{ background: "#f1f5f9", color: "#475569" }}
          onClick={onClose}
        >
          {t.close}
        </button>
      </div>
    </div>
  );
}

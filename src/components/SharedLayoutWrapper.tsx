"use client";

import React, { useState } from "react";
import { useTableState } from "./AppStateContext";
import { SquiCircleFilterStatic } from "@/components/ui/skiper-ui/skiper63";
import TableHeader from "./table/TableHeader";
import TableNav from "./table/TableNav";
import CheckoutBar from "./table/CheckoutBar";
import WifiModal from "./table/WifiModal";
import PaymentModal from "./table/PaymentModal";

export default function SharedLayoutWrapper({
  tableId,
  children
}: {
  tableId?: string;
  children: React.ReactNode;
}) {
  const {
    language,
    tableLabel,
    activeTab,
    payBill,
    currentBillAmount,
    tipAmountInput,
    coverFee,
  } = useTableState();
  const [isWifiOpen, setIsWifiOpen] = useState(false);
  const isRTL = language === "ar";

  const enteredTipAmount = parseFloat(tipAmountInput) || 0;
  const subtotal = (payBill ? currentBillAmount : 0) + enteredTipAmount;
  const totalAmount = subtotal + (coverFee ? subtotal * 0.05 : 0);
  const isPayBarVisible = tableLabel && activeTab === "bill" && totalAmount > 0;

  return (
    <div className="pageContainer" dir={isRTL ? "rtl" : "ltr"} style={{ fontFamily: isRTL ? "'Cairo', 'Segoe UI', sans-serif" : undefined }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes success-pop {
          0% { transform: scale(0.96); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes highlightPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0px rgba(13,148,136,0); }
          50% { transform: scale(1.01); box-shadow: 0 0 0 6px rgba(13,148,136,0.15); }
          100% { transform: scale(1); box-shadow: 0 0 0 0px rgba(13,148,136,0); }
        }

        /* Core layout */
        .pageContainer {
          position: relative;
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          padding: 0;
          background: #FAF9F5;
          animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .scrollableContent {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          padding: 0;
          -ms-overflow-style: none;
          scrollbar-width: none;
          touch-action: pan-y;
          -webkit-overflow-scrolling: touch;
        }
        .scrollableContent::-webkit-scrollbar {
          display: none;
        }
        .highlight-section {
          animation: highlightPulse 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2 alternate;
          border-radius: 20px;
        }

        /* Typography & Titles */
        .sectionTitle {
          font-size: 10px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 8px;
          margin-top: 4px;
          padding: 0 20px;
        }

        /* Header */
        .topHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(226, 232, 240, 0.6);
          padding: 16px 20px;
          margin-bottom: 10px;
          width: 100%;
        }
        .headerTitle {
          font-size: 1.15rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0;
        }
        .headerTableText {
          color: #64748b;
          font-size: 11px;
          font-weight: 500;
          margin-top: 3px;
          display: inline-block;
          line-height: 1.2;
        }
        .headerActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .headerBtn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }
        .headerBtn:hover {
          border-color: #cbd5e1;
          background: #f8fafc;
        }
        .headerTextLink {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: color 0.2s;
          padding: 6px 4px;
          outline: none;
        }
        .headerTextLink:hover {
          color: #0f172a;
          text-decoration: underline;
        }

        /* Printer Slot & Printing Animation */
        .printerSlotWrapper {
          position: relative;
          width: 100%;
          padding-top: 6px;
        }
        .printerSlot {
          width: 96%;
          margin: 0 auto -5px auto;
          height: 8px;
          background: linear-gradient(90deg, #1e293b 0%, #334155 40%, #1e293b 100%);
          border-radius: 4px 4px 0 0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.7), 0 2px 4px rgba(0,0,0,0.2);
          position: relative;
          z-index: 5;
        }
        .printerSlot::after {
          content: "";
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 30px;
          height: 3px;
          background: rgba(0,0,0,0.4);
          border-radius: 2px;
        }

        /* Overflow hidden wrapper that grows downward */
        .printOutputWrapper {
          overflow: hidden;
          max-height: 0;
          animation: paperFeed 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes paperFeed {
          0%   { max-height: 0px; }
          100% { max-height: 1400px; }
        }

        /* Thermal Paper Receipt Card */
        .receiptCard {
          position: relative;
          background: #ffffff;
          padding: 24px 20px;
          box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.03);
          margin: 0 0 20px 0;
          font-family: 'Courier New', Courier, monospace;
          color: #0f172a;
          border-radius: 4px;
        }

        /* Top serrated tooth edge */
        .receiptCard::before {
          content: "";
          position: absolute;
          top: -6px;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(135deg, transparent 4px, #ffffff 0),
                      linear-gradient(-135deg, transparent 4px, #ffffff 0);
          background-size: 8px 6px;
          background-repeat: repeat-x;
        }

        /* Bottom serrated tooth edge */
        .receiptCard::after {
          content: "";
          position: absolute;
          bottom: -6px;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(45deg, transparent 4px, #ffffff 0),
                      linear-gradient(-45deg, transparent 4px, #ffffff 0);
          background-size: 8px 6px;
          background-repeat: repeat-x;
        }

        .receiptHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          font-weight: 800;
          color: #64748b;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .receiptDivider {
          border-top: 1px dashed rgba(148, 163, 184, 0.6);
          margin: 14px 0;
        }
        .receiptItem {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #334155;
          margin-bottom: 8px;
          font-family: 'Courier New', Courier, monospace;
        }
        .receiptItemName {
          font-weight: 700;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .receiptItemQty {
          color: #64748b;
          font-size: 11px;
        }
        .receiptItemPrice {
          font-weight: 800;
          color: #0f172a;
        }
        .receiptTotal {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 800;
          font-size: 15px;
          color: #0f172a;
          margin-top: 4px;
          font-family: 'Courier New', Courier, monospace;
        }

        /* Waiter Card */
        .waiterCard {
          display: flex;
          align-items: center;
          gap: 16px;
          background: #ffffff;
          border: 1px solid rgba(226, 232, 240, 0.8);
          padding: 16px 20px;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }
        .waiterAvatarWrapper {
          position: relative;
          width: 52px;
          height: 52px;
          flex-shrink: 0;
        }
        .waiterAvatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
        .waiterInfo {
          display: flex;
          flex-direction: column;
        }
        .waiterLabel {
          font-size: 9px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .waiterName {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 1px 0 0 0;
        }
        .waiterGoalText {
          font-size: 11px;
          color: #b58a1c;
          font-weight: 600;
          margin-top: 2px;
        }

        /* Presets Grid */
        .presetsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .presetBtn {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #334155;
          padding: 14px 0;
          min-height: 44px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          outline: none;
        }
        .presetBtn:active {
          transform: scale(0.96);
          opacity: 0.9;
        }
        .presetBtnActive {
          background: #0d9488;
          border-color: #0d9488;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
        }

        /* Custom Tip Input */
        .customInputWrapper {
          position: relative;
          margin-top: 4px;
        }
        .customInput {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #0d9488;
          padding: 12px 16px;
          padding-right: 50px;
          border-radius: 16px;
          font-size: 14px;
          font-weight: 700;
          color: #0f172a;
          outline: none;
          box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
        }
        .customCurrencySymbol {
          position: absolute;
          inset-inline-end: 16px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 11px;
          font-weight: 800;
          color: #64748b;
        }

        /* Rating Stars */
        .ratingStarsRow {
          display: flex;
          gap: 12px;
          justify-content: center;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 16px;
          border-radius: 20px;
        }
        .starBtn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          transition: transform 0.15s;
          outline: none;
        }
        .starBtn:active {
          transform: scale(1.2);
        }
        .starActive {
          color: #eab308;
          fill: #eab308;
        }
        .starInactive {
          color: #cbd5e1;
        }
        .ratingLabelText {
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          height: 14px;
        }

        /* Feedback Tags */
        .tagsRow {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tagBtn {
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          color: #475569;
          padding: 8px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          outline: none;
        }
        .tagBtnActive {
          background: #f0fdfa;
          border-color: #0d9488;
          color: #0d9488;
          font-weight: 700;
        }

        /* Comment Textarea */
        .commentTextarea {
          width: 100%;
          background: #ffffff;
          border: 1.5px solid #e2e8f0;
          border-radius: 16px;
          padding: 12px 16px;
          font-size: 12px;
          color: #0f172a;
          outline: none;
          resize: none;
          font-family: inherit;
          transition: border-color 0.2s;
        }
        .commentTextarea:focus {
          border-color: #94a3b8;
        }

        /* Summary Breakdown Card */
        .summaryCard {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 20px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.015);
        }
        .summaryRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
          color: #475569;
          font-weight: 600;
        }
        .summaryDivider {
          border-top: 1px dashed #e2e8f0;
          margin: 4px 0;
        }
        .summaryTotalRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        /* Sticky Bottom Pay Bar */
        .stickyPayBar {
          position: absolute;
          bottom: calc(88px + env(safe-area-inset-bottom));
          left: 20px;
          right: 20px;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 20px;
          border-radius: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 12px 32px rgba(15, 23, 42, 0.25);
          z-index: 90;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .stickyPayInfo {
          display: flex;
          flex-direction: column;
        }
        .stickyPayLabel {
          font-size: 9px;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stickyPayAmount {
          font-size: 17px;
          font-weight: 800;
          color: #ffffff;
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        .stickyPaySuffix {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
        }
        .stickyPayBtn {
          background: #0d9488;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          border-radius: 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, background-color 0.2s;
          outline: none;
        }
        .stickyPayBtn:active {
          transform: scale(0.97);
        }

        /* Bottom Floating Navigation Dock */
        .bottomDock {
          position: absolute;
          bottom: calc(12px + env(safe-area-inset-bottom));
          left: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(20px) saturate(190%);
          -webkit-backdrop-filter: blur(20px) saturate(190%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          border-radius: 9999px;
          padding: 6px 8px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02);
          z-index: 100;
        }
        .dockBtn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          color: #64748b;
          text-decoration: none;
          font-size: 11px;
          font-weight: 600;
          padding: 8px 0;
          border-radius: 9999px;
          transition: color 0.25s ease, transform 0.15s ease;
          flex: 1;
          min-height: 48px;
          z-index: 1;
          outline: none;
        }
        .dockBtn:active {
          transform: scale(0.97);
        }
        .dockBtnActive {
          color: #0d9488;
          font-weight: 800;
        }
        .dockBtnActiveBg {
          position: absolute;
          inset: 4px;
          background: rgba(13, 148, 136, 0.08);
          border: 1px solid rgba(13, 148, 136, 0.05);
          border-radius: 9999px;
          z-index: -1;
        }
        .dockBadgeWrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dockBadge {
          position: absolute;
          top: -6px;
          right: -10px;
          background: #ef4444;
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #ffffff;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.2);
        }

        /* Modal Overlays */
        .dialogOverlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }
        .dialogCard {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          width: 100%;
          max-width: 360px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          animation: success-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .dialogTitle {
          font-size: 18px;
          font-weight: 800;
          color: #0f172a;
          margin: 0 0 6px 0;
        }
        .dialogText {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 20px 0;
          line-height: 1.4;
        }
        .dialogCloseBtn {
          width: 100%;
          padding: 12px 0;
          border: none;
          border-radius: 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .spinnerElement {
          width: 28px;
          height: 28px;
          border: 3px solid #e2e8f0;
          border-left-color: #0d9488;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 12px auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Top Navbar */}
      <TableHeader onOpenWifi={() => setIsWifiOpen(true)} />

      {/* Scrollable Container for Sub-pages */}
      <div className="scrollableContent">
        {children}
        {/* Physical spacer to ensure scroll height extends past floating elements (fixes Safari padding bug) */}
        <div 
          style={{ 
            height: isPayBarVisible 
              ? "calc(180px + env(safe-area-inset-bottom))" 
              : "calc(100px + env(safe-area-inset-bottom))",
            flexShrink: 0,
            width: "100%"
          }} 
          aria-hidden="true"
        />
      </div>

      {/* Sticky Bottom Pay Bar */}
      {tableLabel && activeTab === "bill" && <CheckoutBar />}

      {/* Bottom Floating Navigation Dock */}
      {tableLabel && <TableNav />}

      {/* Shared Wi-Fi Modal */}
      <WifiModal isOpen={isWifiOpen} onClose={() => setIsWifiOpen(false)} />

      {/* Payment Processing, Success & Error Modal */}
      <PaymentModal />

      {/* SVG squircle filter injection */}
      <SquiCircleFilterStatic />
    </div>
  );
}

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import NumberFlow from "@number-flow/react";
import { useTableState, EXCHANGE_RATE } from "@/components/AppStateContext";

export default function CheckoutBar() {
  const pathname = usePathname();
  const {
    displayCurrency,
    t,
    payBill,
    currentBillAmount,
    tipAmountInput,
    coverFee,
    setCoverFee,
    triggerPayment
  } = useTableState();

  const isIndividualActive = pathname.endsWith("/individual");
  const isMenuActive = pathname.endsWith("/menu");
  const isCartActive = pathname.endsWith("/cart");
  const isBillActive = !isIndividualActive && !isMenuActive && !isCartActive;

  const enteredTipAmount = parseFloat(tipAmountInput) || 0;
  const activeBillAmount = displayCurrency === "USD" ? (currentBillAmount / EXCHANGE_RATE) : currentBillAmount;
  const activeBillToPay = payBill ? activeBillAmount : 0;
  
  const subtotal = activeBillToPay + enteredTipAmount;
  const feeAmount = coverFee ? subtotal * 0.05 : 0;
  const totalAmount = subtotal + feeAmount;

  if (!isBillActive || totalAmount <= 0) return null;

  return (
    <div className="stickyPayBar">
      <div className="stickyPayInfo">
        <span className="stickyPayLabel">{t.totalToPay}</span>
        <div className="stickyPayAmount">
          <NumberFlow
            value={Math.round(totalAmount)}
            format={{ style: "decimal", minimumFractionDigits: 0, maximumFractionDigits: 0 }}
          />
          <span className="stickyPaySuffix">{displayCurrency}</span>
        </div>
      </div>
      <button
        type="button"
        className="stickyPayBtn"
        onClick={() => triggerPayment()}
      >
        {t.payNow}
      </button>
    </div>
  );
}

"use client";

import React from "react";
import { UtensilsCrossed, ShoppingCart, CreditCard } from "lucide-react";
import { useTableState } from "@/components/AppStateContext";
import { motion } from "framer-motion";

export default function TableNav() {
  const { t, cartItems, language, waiter, activeTab, setActiveTab } = useTableState();

  const totalCartItemsCount = cartItems.reduce((acc, curr) => acc + curr.quantity, 0);

  const isMenuActive = activeTab === "menu";
  const isCartActive = activeTab === "cart";
  const isBillActive = activeTab === "bill";

  const getMenuTitle = () => {
    const isAr = language === "ar";
    const isRestaurant = waiter.business_type === "RESTAURANT" || !waiter.business_type;
    if (isRestaurant) return t.menu;
    return isAr ? "الخدمات" : "Services";
  };

  return (
    <div className="bottomDock">
      <button
        type="button"
        onClick={() => setActiveTab("menu")}
        className={`dockBtn ${isMenuActive ? "dockBtnActive" : ""}`}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        {isMenuActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="dockBtnActiveBg"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <UtensilsCrossed size={18} />
        <span>{getMenuTitle()}</span>
      </button>
      
      <button
        type="button"
        onClick={() => setActiveTab("cart")}
        className={`dockBtn ${isCartActive ? "dockBtnActive" : ""}`}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        {isCartActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="dockBtnActiveBg"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <div className="dockBadgeWrapper">
          <ShoppingCart size={18} />
          {totalCartItemsCount > 0 && (
            <span className="dockBadge">
              {totalCartItemsCount}
            </span>
          )}
        </div>
        <span>{t.cart}</span>
      </button>
      
      <button
        type="button"
        onClick={() => setActiveTab("bill")}
        className={`dockBtn ${isBillActive ? "dockBtnActive" : ""}`}
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
      >
        {isBillActive && (
          <motion.div
            layoutId="activeTabIndicator"
            className="dockBtnActiveBg"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <CreditCard size={18} />
        <span>{t.bill}</span>
      </button>
    </div>
  );
}

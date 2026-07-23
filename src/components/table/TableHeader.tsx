"use client";

import React from "react";
import { Wifi } from "lucide-react";
import { useTableState } from "@/components/AppStateContext";

interface TableHeaderProps {
  onOpenWifi: () => void;
}

export default function TableHeader({ onOpenWifi }: TableHeaderProps) {
  const { waiter, displayCurrency, toggleCurrency, language, toggleLanguage, t, tableLabel } = useTableState();

  const restaurantTitle = waiter.restaurant_name || "Baksheesh Pay";
  const isRTL = language === "ar";

  return (
    <header className="topHeader">
      <div>
        <h1 className="headerTitle">{restaurantTitle}</h1>
        <span className="headerTableText">
          {tableLabel ? (language === "ar" ? tableLabel.replace("Table", "طاولة") : tableLabel) : (language === "ar" ? "دفع مباشر" : "Direct Pay")}
        </span>
      </div>
      <div className="headerActions">
        <button
          type="button"
          className="headerBtn"
          onClick={toggleLanguage}
        >
          {language === "en" ? "عربي" : "English"}
        </button>

        <button
          type="button"
          className="headerBtn"
          onClick={toggleCurrency}
        >
          {displayCurrency === "EGP" ? "USD $" : "EGP E£"}
        </button>

        {tableLabel && (
          <button
            type="button"
            className="headerTextLink"
            onClick={onOpenWifi}
            style={{ display: "flex", alignItems: "center", gap: "4px" }}
          >
            <Wifi size={14} /> {t.wifi}
          </button>
        )}
      </div>
    </header>
  );
}

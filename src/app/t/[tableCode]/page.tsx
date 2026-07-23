"use client";

import React from "react";
import TippingForm from "@/components/TippingForm";
import MenuTab from "@/components/table/MenuTab";
import CartTab from "@/components/table/CartTab";
import { useTableState } from "@/components/AppStateContext";
import { AnimatePresence, motion } from "framer-motion";

export default function TableTipPage() {
  const { activeTab } = useTableState();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ width: "100%", minHeight: "100%", display: "flex", flexDirection: "column" }}
      >
        {activeTab === "menu" && <MenuTab />}
        {activeTab === "cart" && <CartTab />}
        {activeTab === "bill" && <TippingForm />}
      </motion.div>
    </AnimatePresence>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import { X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkiperTab {
  id: string;
  icon: React.ElementType;
  label?: string;
}

interface SkiperNavProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  tabs: SkiperTab[];
}

const Skiper3 = ({ activeTab, onTabChange, tabs }: SkiperNavProps) => {
  const [toggle, setToggle] = useState(false);

  const ActiveIcon = tabs.find((t) => t.id === activeTab)?.icon || Menu;
  const expandedWidth = tabs.length * 50 + 60; // Dynamic width based on tabs count

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center justify-center pointer-events-auto">
      <motion.div layout>
        <motion.div
          className={cn(
            "relative flex items-center justify-between overflow-hidden rounded-full border shadow-lg",
            "bg-[#111827] border-[#ffffff]/10"
          )}
          style={{ borderRadius: 9999, height: 60 }}
          initial={{ scale: 0, y: "100%" }}
          transition={{ type: "spring", bounce: 0.16 }}
          animate={{ scale: 1, y: 0, width: !toggle ? 60 : expandedWidth }}
        >
          <div className="flex h-full flex-1 items-center justify-center rounded-full">
            <AnimatePresence>
              {toggle && (
                <motion.div
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-center gap-1 px-2 w-full"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onTabChange(tab.id);
                          setToggle(false);
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-full h-[44px] w-[44px] transition-all",
                          isActive
                            ? "bg-primary shadow-md"
                            : "hover:bg-[#ffffff]/10"
                        )}
                      >
                        <tab.icon size={22} color={isActive ? "#ffffff" : "rgba(255,255,255,0.6)"} />
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div
            className={cn(
              "flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center rounded-full cursor-pointer transition-colors",
              toggle ? "bg-transparent" : "bg-primary text-[#0b0f19] hover:bg-primary/90"
            )}
            onClick={() => setToggle(!toggle)}
          >
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
              className="flex items-center justify-center"
            >
              {toggle ? (
                <X size={24} color="rgba(255,255,255,0.8)" />
              ) : (
                <ActiveIcon size={24} color="#000000" />
              )}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export { Skiper3 };

"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DigitalMenuAiSection() {
  return (
    <section className="py-16 md:py-24 bg-[#FAF9F5] border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
            Digital QR Menu & AI Tools
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Interactive Digital Menu & Smart AI Utilities
          </h2>
          <p className="text-slate-600 text-base font-medium">
            Streamline dining with an instant QR menu, multilingual auto-translation, and automated ingredient & nutrition calculation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Block 1: Digital Menu */}
          <div className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#00D26A]">
                Digital QR Menu
              </div>
              <h3 className="text-2xl font-black text-slate-900">
                Contactless Digital Menu & Table Ordering
              </h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Guests scan table QR codes to view dish photos, filter categories, and order items directly from their mobile browser without waiting for paper menus.
              </p>

              <div className="space-y-2 text-sm text-slate-700 font-semibold pt-3 border-t border-slate-100">
                <div className="border-l-2 border-[#00D26A] pl-3">Dish photos & category filtering</div>
                <div className="border-l-2 border-[#00D26A] pl-3">Instant table cart & bill checkout</div>
                <div className="border-l-2 border-[#00D26A] pl-3">Unified bill payment and server tipping</div>
              </div>
            </div>

            <div className="pt-2">
              <a href="/t/kb4/menu" target="_blank">
                <Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-900 font-bold py-5 hover:bg-slate-50 gap-2">
                  <span>Preview Digital Menu Demo</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </a>
            </div>
          </div>

          {/* Block 2: AI Menu Tools */}
          <div className="rounded-3xl bg-slate-900 text-white p-8 shadow-md space-y-5 flex flex-col justify-between border border-slate-800">
            <div className="space-y-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#00D26A]">
                Smart AI Tools
              </div>
              <h3 className="text-2xl font-black text-white">
                AI Translation & Nutrition Generator
              </h3>
              <p className="text-slate-300 text-sm font-medium leading-relaxed">
                Automate menu management with built-in AI. Automatically translate dish names into 10+ global languages for tourists, generate mouth-watering descriptions, and estimate ingredient calories.
              </p>

              <div className="space-y-2 text-sm text-slate-300 font-semibold pt-3 border-t border-slate-800">
                <div className="border-l-2 border-[#00D26A] pl-3">Instant multi-language menu auto-translation</div>
                <div className="border-l-2 border-[#00D26A] pl-3">AI dish description & ingredient suggestions</div>
                <div className="border-l-2 border-[#00D26A] pl-3">Automated calorie calculation based on ingredients</div>
              </div>
            </div>

            <div className="pt-2">
              <a href="#register">
                <Button className="w-full rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-bold py-5 gap-2">
                  <span>Connect Venue & Enable AI Menu Tools</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

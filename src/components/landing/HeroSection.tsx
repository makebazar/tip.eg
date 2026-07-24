"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28 bg-gradient-to-b from-[#F0FDF4]/50 via-white to-white border-b border-slate-200/60">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center space-y-8">
        {/* Main Headline */}
        <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl lg:text-6xl leading-[1.12]">
          Cashless Tipping <br className="hidden sm:inline" />
          <span className="text-[#00D26A]">via QR Code</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto max-w-2xl text-base sm:text-xl text-slate-600 font-medium leading-relaxed">
          Guests pay tips in seconds by scanning a QR code. Staff receive instant automated payouts directly to <strong className="text-slate-900 font-extrabold">Vodafone Cash & InstaPay</strong>.
        </p>

        {/* Primary CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a href="#register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-black text-base px-9 py-6 shadow-xl shadow-[#00D26A]/25">
              <span>Connect Your Venue</span>
              <ArrowRight className="h-5 w-5 stroke-[2.5]" />
            </Button>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="pt-8 border-t border-slate-200/80 flex items-center justify-center gap-8 text-xs sm:text-sm font-bold text-slate-500">
          <div>15-Minute Setup</div>
          <div>•</div>
          <div>0 EGP Setup Fee</div>
          <div>•</div>
          <div>No App Required</div>
        </div>
      </div>
    </section>
  );
}

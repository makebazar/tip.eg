"use client";

import React from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function WaiterSolutionSection() {
  const features = [
    {
      title: "Personal QR Badge & Table Code",
      desc: "Wear your badge or place your table card. Guests scan with any camera without downloading an app.",
    },
    {
      title: "Instant 24/7 Cashout",
      desc: "Withdraw tips anytime directly to Vodafone Cash or InstaPay in 2 seconds.",
    },
    {
      title: "+30% to +50% Tip Growth",
      desc: "Pre-set tip percentage buttons (10%, 15%, 20%) make it effortless for guests to tip.",
    },
    {
      title: "Shift History & Analytics",
      desc: "Track your earnings, rating score, and cashouts shift by shift in your mobile dashboard.",
    },
  ];

  return (
    <section id="waiters" className="py-16 md:py-24 bg-[#FAF9F5] border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Waiter Card */}
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <div className="text-base font-extrabold text-slate-900">Amr Walid</div>
                <div className="text-xs font-semibold text-slate-500">Server • Kebab El Dahab</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                <div className="flex justify-between items-center text-xs text-slate-600 font-medium">
                  <span>Tip Balance:</span>
                  <span className="text-xl font-black text-emerald-800">3,450 EGP</span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">InstaPay (@amr_pay)</div>
              </div>

              <a href="/individual/login">
                <Button className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-5 shadow-sm gap-2">
                  <Wallet className="h-4 w-4 text-[#00D26A]" />
                  <span>Enter Staff Portal & Cashout</span>
                </Button>
              </a>
            </div>
          </div>

          {/* Right Text Column */}
          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
              For Waiters & Service Personnel
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Collect Cashless Tips Directly to Your Wallet
            </h2>

            <p className="text-slate-600 text-base font-medium leading-relaxed">
              No cash? No problem. tip.eg ensures every happy guest can thank you with a digital tip directly from their phone camera.
            </p>

            <div className="space-y-4 pt-2">
              {features.map((f, idx) => (
                <div key={idx} className="space-y-0.5 border-l-2 border-[#00D26A] pl-4">
                  <div className="font-bold text-slate-900 text-base">{f.title}</div>
                  <div className="text-sm text-slate-600 font-medium leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

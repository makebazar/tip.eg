"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VenueSolutionSection() {
  const features = [
    {
      title: "Table & Receipt QR Codes",
      desc: "Place durable QR stands on tables or print codes directly on bill receipts.",
    },
    {
      title: "Automated Tip Pooling or Individual Split",
      desc: "Configure split rules in your B2B dashboard — direct waiter tips or shared pool for kitchen staff.",
    },
    {
      title: "Unified Bill & Tip Checkout",
      desc: "Guests review bill items, pay the bill, and add server tips in a single transaction.",
    },
    {
      title: "Shift Reports & Financial Analytics",
      desc: "Track real-time tip distribution, active shifts, and revenue reports per hall section.",
    },
  ];

  return (
    <section id="restaurants" className="py-16 md:py-24 bg-white border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
              For Restaurants & Cafes
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Manage Staff Tips & Digital Operations in One Place
            </h2>

            <p className="text-slate-600 text-base font-medium leading-relaxed">
              tip.eg gives restaurant managers full operational control over cashless tips, staff payouts, and table orders.
            </p>

            <div className="space-y-4 pt-2">
              {features.map((f, idx) => (
                <div key={idx} className="space-y-0.5 border-l-2 border-[#00D26A] pl-4">
                  <div className="font-bold text-slate-900 text-base">{f.title}</div>
                  <div className="text-sm text-slate-600 font-medium leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <a href="#register">
                <Button className="rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-bold px-6 py-5 gap-2">
                  <span>Register Restaurant</span>
                  <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </a>
              <a href="/business/login">
                <Button variant="outline" className="rounded-xl border-slate-200 bg-white text-slate-800 font-bold px-5 py-5 hover:bg-slate-50">
                  Manager Portal
                </Button>
              </a>
            </div>
          </div>

          {/* Right Column: Dashboard Card */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl bg-slate-900 p-6 sm:p-8 text-white shadow-xl space-y-5 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-bold text-slate-400">Kebab El Dahab</div>
                  <div className="text-base font-extrabold text-white">Manager B2B Dashboard</div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                  Active Venue
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-800/80 space-y-1">
                  <div className="text-xs text-slate-400 font-medium">Total Monthly Tips</div>
                  <div className="text-3xl font-black text-[#00D26A]">148,500 EGP</div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/50 space-y-0.5">
                    <div className="text-slate-400 font-medium">Active Tables</div>
                    <div className="font-extrabold text-white">12 Tables</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/50 space-y-0.5">
                    <div className="text-slate-400 font-medium">Active Staff</div>
                    <div className="font-extrabold text-white">18 Waiters</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

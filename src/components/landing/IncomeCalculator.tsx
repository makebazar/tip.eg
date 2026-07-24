"use client";

import React, { useState } from "react";

export function IncomeCalculator() {
  const [shiftsCount, setShiftsCount] = useState<number>(20);
  const [tablesPerShift, setTablesPerShift] = useState<number>(12);
  const [avgCheck, setAvgCheck] = useState<number>(800); // EGP

  const estimatedTipPct = 0.12;
  const tipsPerShift = tablesPerShift * avgCheck * estimatedTipPct;
  const monthlyExtraIncome = Math.round(tipsPerShift * shiftsCount);

  return (
    <section id="calculator" className="py-16 md:py-24 bg-white border-y border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left info */}
          <div className="lg:col-span-5 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
              Earnings Calculator
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-tight">
              Calculate Additional Monthly Income
            </h2>

            <p className="text-slate-600 text-base leading-relaxed font-medium">
              Over 70% of restaurant guests no longer carry paper money. QR tipping ensures servers receive tips on digital card payments.
            </p>

            <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-slate-200 text-xs text-slate-600 font-medium space-y-1">
              <div className="font-bold text-slate-900 text-sm">+40% Average Tip Boost</div>
              <div>Servers report up to 50% higher personal tips when QR digital tipping is offered.</div>
            </div>
          </div>

          {/* Right interactive slider panel */}
          <div className="lg:col-span-7 bg-[#FAF9F5] rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-md space-y-6">
            <div className="space-y-6">
              {/* Slider 1: Shifts */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-800">Shifts per month:</span>
                  <span className="text-[#00D26A] font-black text-base">{shiftsCount} shifts</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={shiftsCount}
                  onChange={(e) => setShiftsCount(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-[#00D26A]"
                />
              </div>

              {/* Slider 2: Tables per shift */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-800">Tables / Orders per shift:</span>
                  <span className="text-[#00D26A] font-black text-base">{tablesPerShift} tables</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={30}
                  value={tablesPerShift}
                  onChange={(e) => setTablesPerShift(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-[#00D26A]"
                />
              </div>

              {/* Slider 3: Avg check */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-800">Average check per table (EGP):</span>
                  <span className="text-[#00D26A] font-black text-base">{avgCheck} EGP</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={3000}
                  step={50}
                  value={avgCheck}
                  onChange={(e) => setAvgCheck(Number(e.target.value))}
                  className="w-full h-2 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-[#00D26A]"
                />
              </div>
            </div>

            {/* Total Extra Income Result Box */}
            <div className="rounded-2xl bg-slate-900 p-6 text-white space-y-1.5 shadow-xl border border-slate-800">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Estimated Additional Income:
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-[#00D26A]">
                  +{monthlyExtraIncome.toLocaleString("en-US")} EGP
                </span>
                <span className="text-xs text-slate-400 font-bold">/ month</span>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-800 font-medium">
                Withdrawals transferred 24/7 to Vodafone Cash or InstaPay accounts.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

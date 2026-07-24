"use client";

import React from "react";

export function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Scan QR Code",
      desc: "Guest points phone camera at the QR code on the receipt, table stand, or staff badge. No app installation needed.",
    },
    {
      num: "02",
      title: "Select Tip Amount",
      desc: "An elegant web page opens. Guest selects tip percentage (10%, 15%, 20%) or inputs a custom EGP amount.",
    },
    {
      num: "03",
      title: "Instant Payout",
      desc: "Payment completes in 1 click. Tips instantly arrive into the server's wallet with 24/7 withdrawal to InstaPay or Vodafone Cash.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 md:py-24 bg-[#FAF9F5]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
            Simple & Fast
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            How tip.eg Works
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            3 seamless steps with zero friction for your guests.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className="rounded-3xl bg-white border border-slate-200 p-8 shadow-sm space-y-4"
            >
              <div className="text-3xl font-black text-[#00D26A]">
                {s.num}
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

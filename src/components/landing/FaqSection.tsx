"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How much does tip.eg cost for venue owners?",
      a: "Setup, management portal access, branded QR table stand designs, and merchant onboarding are completely free (0 EGP) for restaurants and cafes. tip.eg operates with zero subscription fees.",
    },
    {
      q: "Do servers or guests need to download a mobile app?",
      a: "No. Guests simply scan table or receipt QR codes using their smartphone's native camera app — opening a fast, responsive web interface. Staff access their personal payout dashboards directly via mobile browsers.",
    },
    {
      q: "How fast do staff receive payouts into their account?",
      a: "Payouts are automated and available 24/7. Employees can request instant withdrawals directly to their preferred Egyptian wallet (Vodafone Cash, InstaPay) or bank card anytime.",
    },
    {
      q: "How does tip pooling work vs individual tips?",
      a: "In the B2B Manager dashboard, venues can configure tip distribution rules: either direct individual tipping to assigned waiters or an automated equal-split pot shared across floor servers, kitchen, and bar teams.",
    },
    {
      q: "Can guests pay their food/drink bills alongside tips?",
      a: "Yes! tip.eg supports unified QR codes that allow guests to review bill items, pay table bills, and add server tips in a single 1-click transaction.",
    },
  ];

  return (
    <section id="faq" className="py-16 md:py-24 bg-[#FAF9F5] border-t border-slate-200">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#00D26A]">
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 text-sm sm:text-base font-medium">
            Answers to common questions from venue owners and service staff.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-slate-200 overflow-hidden transition-all shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between p-5 text-left font-bold text-base text-slate-900 hover:text-[#00D26A] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-[#00D26A]" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

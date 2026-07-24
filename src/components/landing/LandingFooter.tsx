"use client";

import React from "react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="bg-slate-950 text-white pt-12 pb-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-slate-400">
          <div className="space-y-2">
            <span className="text-xl font-black text-white">
              tip<span className="text-[#00D26A]">.eg</span>
            </span>
            <p className="text-slate-400 text-xs leading-relaxed font-medium">
              Cashless tipping and QR bill payment platform for Egypt.
            </p>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Portals</div>
            <ul className="space-y-1.5 font-medium">
              <li>
                <Link href="/business/login" className="hover:text-white transition-colors">
                  Manager B2B Portal
                </Link>
              </li>
              <li>
                <Link href="/individual/login" className="hover:text-white transition-colors">
                  Staff Portal
                </Link>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-white transition-colors">
                  Super Admin Panel
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">Support</div>
            <p className="text-slate-400 font-medium">Technical Support 24/7</p>
            <div className="text-white font-bold">support@tip.eg</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-900 text-[11px] text-slate-500 font-medium gap-3">
          <div>© {new Date().getFullYear()} tip.eg. All rights reserved.</div>
          <div>Egypt & MENA Region • EGP</div>
        </div>
      </div>
    </footer>
  );
}

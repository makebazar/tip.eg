"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [portalDropdownOpen, setPortalDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-1.5 group">
          <span className="text-2xl font-black tracking-tight text-slate-900">
            tip<span className="text-[#00D26A]">.eg</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
          <a href="#restaurants" className="hover:text-slate-900 transition-colors">
            For Restaurants
          </a>
          <a href="#menu-ai" className="hover:text-slate-900 transition-colors">
            Digital Menu & AI
          </a>
          <a href="#waiters" className="hover:text-slate-900 transition-colors">
            For Staff
          </a>
          <a href="#services" className="hover:text-slate-900 transition-colors">
            Salons & Drivers
          </a>
          <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
            How It Works
          </a>
          <a href="#calculator" className="hover:text-slate-900 transition-colors">
            Calculator
          </a>
          <a href="#faq" className="hover:text-slate-900 transition-colors">
            FAQ
          </a>
        </nav>

        {/* Header Actions */}
        <div className="hidden md:flex items-center gap-3">
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPortalDropdownOpen(!portalDropdownOpen)}
              className="gap-1.5 rounded-xl border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50"
            >
              <span>Sign In</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${portalDropdownOpen ? "rotate-180" : ""}`} />
            </Button>

            {portalDropdownOpen && (
              <div 
                className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl z-50"
                onMouseLeave={() => setPortalDropdownOpen(false)}
              >
                <Link
                  href="/business/login"
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                  onClick={() => setPortalDropdownOpen(false)}
                >
                  <div className="font-bold">Manager B2B</div>
                  <div className="text-[11px] text-slate-500">Venue & Reports</div>
                </Link>
                <Link
                  href="/individual/login"
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                  onClick={() => setPortalDropdownOpen(false)}
                >
                  <div className="font-bold">Staff Portal</div>
                  <div className="text-[11px] text-slate-500">Personal Tips & Cashout</div>
                </Link>
                <Link
                  href="/admin/login"
                  className="block rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                  onClick={() => setPortalDropdownOpen(false)}
                >
                  <div className="font-bold">Super Admin</div>
                  <div className="text-[11px] text-slate-500">Platform Settings</div>
                </Link>
              </div>
            )}
          </div>

          <a href="#register">
            <Button size="sm" className="rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-bold px-4">
              Get Started
            </Button>
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-lg"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-6 space-y-3">
          <nav className="flex flex-col gap-2.5 font-semibold text-slate-800 text-sm">
            <a href="#restaurants" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              For Restaurants
            </a>
            <a href="#menu-ai" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              Digital Menu & AI
            </a>
            <a href="#waiters" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              For Staff
            </a>
            <a href="#services" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              Salons & Drivers
            </a>
            <a href="#how-it-works" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#calculator" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              Calculator
            </a>
            <a href="#faq" className="py-2 border-b border-slate-100" onClick={() => setMobileMenuOpen(false)}>
              FAQ
            </a>
          </nav>

          <div className="pt-2 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <Link href="/business/login" className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-center" onClick={() => setMobileMenuOpen(false)}>
                Manager B2B
              </Link>
              <Link href="/individual/login" className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-center" onClick={() => setMobileMenuOpen(false)}>
                Staff Portal
              </Link>
            </div>
            <a href="#register" className="mt-1" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-bold">
                Get Started
              </Button>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

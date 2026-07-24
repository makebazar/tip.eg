"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ArrowLeft, Building2, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginBusiness, loginIndividual, loginAdmin } from "@/app/actions/auth";

type RoleTab = "business" | "individual" | "admin";

interface UnifiedLoginFormProps {
  defaultRole?: RoleTab;
}

export function UnifiedLoginForm({ defaultRole = "business" }: UnifiedLoginFormProps) {
  const [activeTab, setActiveTab] = useState<RoleTab>(defaultRole);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Tab configurations
  const tabs = [
    {
      id: "business" as RoleTab,
      label: "Manager B2B",
      icon: Building2,
      subtitle: "Sign in to manage venue, staff & reports",
      demoEmail: "manager1@kebab.com",
      demoPass: "manager123",
      action: loginBusiness,
    },
    {
      id: "individual" as RoleTab,
      label: "Staff Portal",
      icon: User,
      subtitle: "Sign in to view personal tips & cash out",
      demoEmail: "waiter1@kebab.com",
      demoPass: "waiter123",
      action: loginIndividual,
    },
    {
      id: "admin" as RoleTab,
      label: "Super Admin",
      icon: ShieldCheck,
      subtitle: "Sign in to access platform finances & settings",
      demoEmail: "admin@baksheesh.com",
      demoPass: "admin123",
      action: loginAdmin,
    },
  ];

  const currentTabConfig = tabs.find((t) => t.id === activeTab) || tabs[0];

  const handleTabChange = (newTab: RoleTab) => {
    setActiveTab(newTab);
    setError("");
    setEmail("");
    setPassword("");
  };

  const handleFillDemo = () => {
    setEmail(currentTabConfig.demoEmail);
    setPassword(currentTabConfig.demoPass);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await currentTabConfig.action(formData);

    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F5] flex flex-col justify-between py-10 px-4 sm:px-6 font-sans">
      {/* Top Header Link */}
      <div className="mx-auto w-full max-w-md flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to tip.eg</span>
        </Link>
        <div className="text-xl font-black text-slate-900">
          tip<span className="text-[#00D26A]">.eg</span>
        </div>
      </div>

      {/* Main Login Box */}
      <div className="mx-auto w-full max-w-md my-auto">
        <div className="rounded-3xl bg-white border border-slate-200/90 p-6 sm:p-8 shadow-xl space-y-6">
          {/* Role Tab Switcher */}
          <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 text-xs font-bold">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl transition-all ${
                    isActive
                      ? "bg-white text-slate-900 shadow-sm font-extrabold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-[#00D26A]" : ""}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header text for active role */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black text-slate-900">
              {currentTabConfig.label} Sign In
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {currentTabConfig.subtitle}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-600 font-bold text-center">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={currentTabConfig.demoEmail}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00D26A] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00D26A] hover:bg-[#00B85C] text-slate-950 font-extrabold py-5 text-sm shadow-md"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Quick Fill Button */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs font-bold text-slate-600 hover:text-[#00D26A] underline decoration-slate-300 underline-offset-4 transition-colors"
            >
              Use Demo Credentials ({currentTabConfig.demoEmail})
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 font-medium">
        © {new Date().getFullYear()} tip.eg. Cashless Tipping Platform
      </div>
    </div>
  );
}

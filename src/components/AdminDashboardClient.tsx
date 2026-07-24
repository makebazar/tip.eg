"use client";

import React, { useState } from "react";
import Link from "next/link";
import NumberFlow from "@number-flow/react";
import {
  LogOut,
  Building2,
  Users,
  Wallet,
  TrendingUp,
  Percent,
  Plus,
  Search,
  Check,
  X,
  RefreshCw,
  Globe,
  Activity,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sliders,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logoutAdmin } from "@/app/actions/auth";
import {
  toggleBusinessActive,
  updateBusinessCommission,
  createBusinessByAdmin,
  approvePayoutRequest,
  rejectPayoutRequest,
  updatePlatformSettings
} from "@/app/actions/admin";

interface BusinessData {
  id: string;
  name: string;
  business_type: string;
  address?: string | null;
  city?: string | null;
  currency: string;
  balance: number;
  is_active: number;
  platform_commission_rate: number;
  spots_count: number;
  staff_count: number;
  owner_email?: string | null;
  owner_name?: string | null;
  created_at?: string;
}

interface StaffData {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  rating: number;
  short_code: string;
  payout_method?: string | null;
  payout_detail?: string | null;
  business_name?: string | null;
  created_at?: string;
}

interface PayoutData {
  id: string;
  individual_id?: string | null;
  business_id?: string | null;
  amount: number;
  fee_amount?: number;
  net_amount?: number;
  payout_method: string;
  destination_detail: string;
  status: string;
  created_at: string;
  waiter_name?: string | null;
  restaurant_name?: string | null;
}

interface TransactionData {
  id: string;
  amount_bill: number;
  amount_tip: number;
  currency: string;
  payment_status: string;
  created_at: string;
  business_name?: string | null;
  waiter_name?: string | null;
}

interface StatsData {
  totalVolume: number;
  totalTips: number;
  transactionCommission: number;
  totalPayoutFees: number;
  platformCommission: number;
  commissionRate: number;
  transactionFeePercent: number;
  tipPayoutFeePercent: number;
  businessPayoutFeePercent: number;
  usdRate: number;
  eurRate: number;
  totalRestaurants: number;
  totalWaiters: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
}

interface AdminDashboardProps {
  businesses: BusinessData[];
  staff: StaffData[];
  payouts: PayoutData[];
  transactions: TransactionData[];
  stats: StatsData;
}

export default function AdminDashboardClient({
  businesses: initialBusinesses,
  staff: initialStaff,
  payouts: initialPayouts,
  transactions,
  stats: initialStats
}: AdminDashboardProps) {
  const [businesses, setBusinesses] = useState<BusinessData[]>(initialBusinesses);
  const [staff, setStaff] = useState<StaffData[]>(initialStaff);
  const [payouts, setPayouts] = useState<PayoutData[]>(initialPayouts);
  const [stats, setStats] = useState<StatsData>(initialStats);

  const [activeTab, setActiveTab] = useState<"overview" | "venues" | "staff" | "payouts" | "transactions" | "settings">("overview");

  // Search and filter states
  const [venueSearch, setVenueSearch] = useState("");
  const [venueStatusFilter, setVenueStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [staffSearch, setStaffSearch] = useState("");
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Modal State
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Settings State
  const [settingsCommission, setSettingsCommission] = useState((stats.transactionFeePercent || stats.commissionRate || 5.0).toString());
  const [settingsTipPayoutFee, setSettingsTipPayoutFee] = useState((stats.tipPayoutFeePercent || 2.0).toString());
  const [settingsBusinessPayoutFee, setSettingsBusinessPayoutFee] = useState((stats.businessPayoutFeePercent || 2.5).toString());
  const [settingsUsd, setSettingsUsd] = useState(stats.usdRate.toString());
  const [settingsEur, setSettingsEur] = useState(stats.eurRate.toString());
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Filtered Lists
  const filteredVenues = businesses.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(venueSearch.toLowerCase()) ||
      (b.city && b.city.toLowerCase().includes(venueSearch.toLowerCase())) ||
      (b.owner_email && b.owner_email.toLowerCase().includes(venueSearch.toLowerCase()));
    
    if (venueStatusFilter === "active") return matchesSearch && (b.is_active === 1 || b.is_active === undefined);
    if (venueStatusFilter === "suspended") return matchesSearch && b.is_active === 0;
    return matchesSearch;
  });

  const filteredStaff = staff.filter((s) =>
    s.name.toLowerCase().includes(staffSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(staffSearch.toLowerCase()) ||
    (s.business_name && s.business_name.toLowerCase().includes(staffSearch.toLowerCase()))
  );

  const filteredPayouts = payouts.filter((p) => {
    if (payoutStatusFilter === "pending") return p.status === "PENDING";
    if (payoutStatusFilter === "approved") return p.status === "APPROVED" || p.status === "SUCCESS";
    if (payoutStatusFilter === "rejected") return p.status === "REJECTED";
    return true;
  });

  // Handlers
  const handleToggleActive = async (businessId: string, currentActive: boolean) => {
    const nextState = !currentActive;
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, is_active: nextState ? 1 : 0 } : b))
    );
    await toggleBusinessActive({ businessId, isActive: nextState });
  };

  const handleUpdateVenueCommission = async (businessId: string, newRate: number) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === businessId ? { ...b, platform_commission_rate: newRate } : b))
    );
    await updateBusinessCommission({ businessId, commissionRate: newRate });
  };

  const handleCreateVenue = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createBusinessByAdmin(formData);

    setIsSubmitting(false);
    if (result.success) {
      setIsAddVenueOpen(false);
      window.location.reload();
    } else {
      setFormError(result.error || "Failed to create business venue");
    }
  };

  const handleApprovePayout = async (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: "APPROVED" } : p))
    );
    setStats((prev) => ({
      ...prev,
      pendingPayoutsCount: Math.max(0, prev.pendingPayoutsCount - 1)
    }));
    await approvePayoutRequest({ payoutId });
  };

  const handleRejectPayout = async (payoutId: string) => {
    setPayouts((prev) =>
      prev.map((p) => (p.id === payoutId ? { ...p, status: "REJECTED" } : p))
    );
    setStats((prev) => ({
      ...prev,
      pendingPayoutsCount: Math.max(0, prev.pendingPayoutsCount - 1)
    }));
    await rejectPayoutRequest({ payoutId });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);

    const commRate = parseFloat(settingsCommission) || 5.0;
    const tipFee = parseFloat(settingsTipPayoutFee) || 2.0;
    const bizFee = parseFloat(settingsBusinessPayoutFee) || 2.5;
    const usd = parseFloat(settingsUsd) || 50.0;
    const eur = parseFloat(settingsEur) || 55.0;

    const res = await updatePlatformSettings({
      transactionFeePercent: commRate,
      tipPayoutFeePercent: tipFee,
      businessPayoutFeePercent: bizFee,
      usdRate: usd,
      eurRate: eur
    });

    setSettingsLoading(false);
    if (res.success) {
      setSettingsSuccess(true);
      setStats((prev) => ({
        ...prev,
        commissionRate: commRate,
        transactionFeePercent: commRate,
        tipPayoutFeePercent: tipFee,
        businessPayoutFeePercent: bizFee,
        usdRate: usd,
        eurRate: eur,
        transactionCommission: prev.totalTips * (commRate / 100),
        platformCommission: (prev.totalTips * (commRate / 100)) + prev.totalPayoutFees
      }));
      setTimeout(() => setSettingsSuccess(false), 3000);
    }
  };

  return (
    <div className="w-full">
      {/* Sticky Top Navbar */}
      <header className="w-full sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 py-3.5">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="flex items-center gap-2 group select-none">
              <span className="text-2xl font-black tracking-tight text-slate-900">
                tip<span className="text-[#B58A1C]">.eg</span>
              </span>
            </Link>
            <Badge variant="outline" className="bg-[#B58A1C]/10 text-[#B58A1C] border-[#B58A1C]/30 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5">
              SUPER ADMIN
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <form action={logoutAdmin}>
              <Button variant="destructive" size="icon-sm" type="submit" title="Logout Super Admin">
                <LogOut className="w-4 h-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 pt-8">

        {/* Global Stat Cards with NumberFlow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {/* GMV Volume */}
          <Card className="p-4 flex flex-col justify-between shadow-xs bg-white border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Platform GMV</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-1">
                <NumberFlow value={stats.totalVolume} format={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                <span className="text-xs font-semibold text-slate-500">EGP</span>
              </div>
              <span className="text-[11px] text-slate-400">Total bill & tip volume</span>
            </div>
          </Card>

          {/* Platform Revenue */}
          <Card className="p-4 flex flex-col justify-between shadow-xs bg-white border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Net Revenue</span>
              <div className="p-1.5 rounded-lg bg-amber-50 text-[#B58A1C]">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-[#B58A1C] tracking-tight flex items-baseline gap-1">
                <NumberFlow value={stats.platformCommission} format={{ style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2 }} />
                <span className="text-xs font-semibold text-slate-500">EGP</span>
              </div>
              <span className="text-[11px] text-slate-400">{stats.commissionRate}% platform fee</span>
            </div>
          </Card>

          {/* Venues Count */}
          <Card className="p-4 flex flex-col justify-between shadow-xs bg-white border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Venues</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                <NumberFlow value={stats.totalRestaurants} />
              </div>
              <span className="text-[11px] text-slate-400">Active businesses</span>
            </div>
          </Card>

          {/* Staff Count */}
          <Card className="p-4 flex flex-col justify-between shadow-xs bg-white border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Specialists</span>
              <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 tracking-tight">
                <NumberFlow value={stats.totalWaiters} />
              </div>
              <span className="text-[11px] text-slate-400">Waiters & Staff</span>
            </div>
          </Card>

          {/* Pending Payout Queue */}
          <Card className="p-4 flex flex-col justify-between shadow-xs bg-white border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Payout Queue</span>
              <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl font-extrabold text-red-600 tracking-tight flex items-baseline gap-1">
                <NumberFlow value={stats.pendingPayoutsCount} />
                <span className="text-xs font-normal text-slate-500">reqs</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {stats.pendingPayoutsAmount.toFixed(0)} EGP pending
              </span>
            </div>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="w-full flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
            className="gap-2 text-xs font-bold"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Button>

          <Button
            variant={activeTab === "venues" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("venues")}
            className="gap-2 text-xs font-bold"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Venues ({businesses.length})</span>
          </Button>

          <Button
            variant={activeTab === "staff" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("staff")}
            className="gap-2 text-xs font-bold"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Staff ({staff.length})</span>
          </Button>

          <Button
            variant={activeTab === "payouts" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("payouts")}
            className="gap-2 text-xs font-bold relative"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Payout Requests</span>
            {stats.pendingPayoutsCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {stats.pendingPayoutsCount}
              </Badge>
            )}
          </Button>

          <Button
            variant={activeTab === "transactions" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("transactions")}
            className="gap-2 text-xs font-bold"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transactions</span>
          </Button>

          <Button
            variant={activeTab === "settings" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("settings")}
            className="gap-2 text-xs font-bold"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>System Settings</span>
          </Button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <Card className="p-6 bg-white border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Platform Financial Health</h3>
                  <p className="text-xs text-slate-500">Live operational snapshot of TIp / Baksheesh Pay platform</p>
                </div>
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-semibold border-emerald-200">
                  Live DB Synchronized
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Total Tips Processed</span>
                  <div className="text-2xl font-black text-slate-900">
                    {stats.totalTips.toFixed(2)} EGP
                  </div>
                  <p className="text-[11px] text-slate-500">Directly tipped to specialists</p>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100 space-y-1">
                  <span className="text-xs font-bold text-amber-700 uppercase">Platform Take-Rate</span>
                  <div className="text-2xl font-black text-[#B58A1C]">
                    {stats.commissionRate}%
                  </div>
                  <p className="text-[11px] text-amber-700/80">Configurable platform fee percentage</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase">Current FX Rates</span>
                  <div className="text-sm font-extrabold text-slate-900 space-x-3">
                    <span>1 USD = {stats.usdRate} EGP</span>
                    <span>1 EUR = {stats.eurRate} EGP</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Used for foreign card tipping</p>
                </div>
              </div>
            </Card>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6 bg-white border-slate-200 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Quick Venue Actions</h3>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => setIsAddVenueOpen(true)} className="justify-start gap-2">
                    <Plus className="w-4 h-4" />
                    <span>Create & Onboard New Venue</span>
                  </Button>
                  <Button variant="secondary" onClick={() => setActiveTab("payouts")} className="justify-start gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Review Pending Payouts ({stats.pendingPayoutsCount})</span>
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab("settings")} className="justify-start gap-2">
                    <Sliders className="w-4 h-4 text-slate-600" />
                    <span>Update Exchange Rates & Fees</span>
                  </Button>
                </div>
              </Card>

              <Card className="p-6 bg-white border-slate-200 space-y-4">
                <h3 className="text-sm font-extrabold text-slate-900">Platform Status Summary</h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-700">Active Business Venues</span>
                    <span className="font-bold text-slate-900">{businesses.filter(b => b.is_active !== 0).length} of {businesses.length}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-700">Registered Staff Accounts</span>
                    <span className="font-bold text-slate-900">{staff.length} active users</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-700">Completed Transactions</span>
                    <span className="font-bold text-slate-900">{transactions.length} total logged</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: VENUES / BUSINESSES */}
        {activeTab === "venues" && (
          <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search venue name, city, owner..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <select
                  value={venueStatusFilter}
                  onChange={(e: any) => setVenueStatusFilter(e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-700 outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <Button onClick={() => setIsAddVenueOpen(true)} size="sm" className="w-full sm:w-auto gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Add New Venue</span>
              </Button>
            </div>

            {/* Venues Table */}
            <Card className="overflow-hidden border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Venue & City</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Owner Contact</th>
                      <th className="py-3 px-4 text-center">Spots / Staff</th>
                      <th className="py-3 px-4 text-right">Balance</th>
                      <th className="py-3 px-4 text-center">Commission</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVenues.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          No business venues found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredVenues.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            <div>{b.name}</div>
                            <div className="text-[10px] font-normal text-slate-400">{b.address || b.city || "Egypt"}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                              {b.business_type || "RESTAURANT"}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{b.owner_name || "Manager"}</div>
                            <div className="text-[10px] text-slate-400">{b.owner_email || "N/A"}</div>
                          </td>
                          <td className="py-3.5 px-4 text-center font-semibold text-slate-700">
                            {b.spots_count || 0} spots / {b.staff_count || 0} staff
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                            {b.balance.toFixed(2)} {b.currency || "EGP"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              defaultValue={b.platform_commission_rate ?? 5.0}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val) && val !== b.platform_commission_rate) {
                                  handleUpdateVenueCommission(b.id, val);
                                }
                              }}
                              className="w-16 h-7 text-center rounded-lg border border-slate-200 text-xs font-bold bg-white text-slate-900"
                            />
                            <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {b.is_active === 0 ? (
                              <Badge variant="destructive" className="text-[10px]">Suspended</Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Active</Badge>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant={b.is_active === 0 ? "default" : "secondary"}
                              size="sm"
                              className="h-7 text-xs px-2.5"
                              onClick={() => handleToggleActive(b.id, b.is_active !== 0)}
                            >
                              {b.is_active === 0 ? "Activate" : "Suspend"}
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: STAFF & SPECIALISTS */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search staff name, email, venue..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Specialist & Role</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Assigned Venue</th>
                      <th className="py-3 px-4">Payout Method</th>
                      <th className="py-3 px-4 text-right">Personal Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No specialists found.
                        </td>
                      </tr>
                    ) : (
                      filteredStaff.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            <div>{s.name}</div>
                            <div className="text-[10px] font-normal text-slate-400">Code: {s.short_code}</div>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-600">{s.email}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {s.business_name || "Unassigned"}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{s.payout_method || "VODAFONE_CASH"}</div>
                            <div className="text-[10px] text-slate-400">{s.payout_detail || "Not set"}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                            {s.balance.toFixed(2)} EGP
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 4: PAYOUT REQUESTS */}
        {activeTab === "payouts" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant={payoutStatusFilter === "pending" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPayoutStatusFilter("pending")}
                  className="h-8 text-xs font-bold"
                >
                  Pending Queue ({payouts.filter(p => p.status === "PENDING").length})
                </Button>
                <Button
                  variant={payoutStatusFilter === "approved" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPayoutStatusFilter("approved")}
                  className="h-8 text-xs font-bold"
                >
                  Approved Log
                </Button>
                <Button
                  variant={payoutStatusFilter === "rejected" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPayoutStatusFilter("rejected")}
                  className="h-8 text-xs font-bold"
                >
                  Rejected
                </Button>
                <Button
                  variant={payoutStatusFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setPayoutStatusFilter("all")}
                  className="h-8 text-xs font-bold"
                >
                  All
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Requested By</th>
                      <th className="py-3 px-4">Payout Method & Detail</th>
                      <th className="py-3 px-4 text-right">Gross Amount</th>
                      <th className="py-3 px-4 text-right">Acquiring Fee</th>
                      <th className="py-3 px-4 text-right">Net Payout</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayouts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No payout requests in this view.
                        </td>
                      </tr>
                    ) : (
                      filteredPayouts.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">
                            <div>{p.waiter_name || p.restaurant_name || "Specialist Account"}</div>
                            <div className="text-[10px] font-normal text-slate-400">ID: {p.id}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-700">
                            <div>{p.payout_method}</div>
                            <div className="text-[10px] font-mono text-slate-500">{p.destination_detail}</div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-slate-900">
                            {p.amount.toFixed(2)} EGP
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#B58A1C]">
                            -{(p.fee_amount || 0).toFixed(2)} EGP
                          </td>
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600">
                            {(p.net_amount || p.amount).toFixed(2)} EGP
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {p.status === "PENDING" && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">PENDING</Badge>}
                            {(p.status === "APPROVED" || p.status === "SUCCESS") && <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">APPROVED</Badge>}
                            {p.status === "REJECTED" && <Badge variant="destructive" className="text-[10px]">REJECTED</Badge>}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {p.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 px-2.5"
                                  onClick={() => handleApprovePayout(p.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 text-xs px-2.5"
                                  onClick={() => handleRejectPayout(p.id)}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">Done</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 5: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="space-y-6">
            <Card className="overflow-hidden border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Transaction ID</th>
                      <th className="py-3 px-4">Venue</th>
                      <th className="py-3 px-4">Specialist</th>
                      <th className="py-3 px-4 text-right">Bill Amount</th>
                      <th className="py-3 px-4 text-right">Tip Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{t.id}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{t.business_name || "Direct Tipping"}</td>
                          <td className="py-3.5 px-4 text-slate-600">{t.waiter_name || "Platform Pool"}</td>
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">{t.amount_bill.toFixed(2)} {t.currency}</td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-[#B58A1C]">+{t.amount_tip.toFixed(2)} {t.currency}</td>
                          <td className="py-3.5 px-4 text-center">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">
                              {t.payment_status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB 6: SYSTEM SETTINGS */}
        {activeTab === "settings" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6 bg-white border-slate-200 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-base font-extrabold text-slate-900">Platform Global Configuration</h3>
                <p className="text-xs text-slate-500">Configure global take-rate percentage and currency conversion exchange rates.</p>
              </div>

              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Platform settings saved successfully!</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700">Platform Transaction Fee (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={settingsCommission}
                    onChange={(e) => setSettingsCommission(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-slate-400">Platform commission deducted from every bill/tip transaction (default 5%).</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Tip Withdrawal Fee (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settingsTipPayoutFee}
                      onChange={(e) => setSettingsTipPayoutFee(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-slate-400">Acquiring fee for specialist tip payouts.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">Business Withdrawal Fee (%)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={settingsBusinessPayoutFee}
                      onChange={(e) => setSettingsBusinessPayoutFee(e.target.value)}
                      required
                    />
                    <p className="text-[11px] text-slate-400">Acquiring fee for venue food/service payouts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">USD Exchange Rate (1 USD = X EGP)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      value={settingsUsd}
                      onChange={(e) => setSettingsUsd(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-slate-700">EUR Exchange Rate (1 EUR = X EGP)</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      value={settingsEur}
                      onChange={(e) => setSettingsEur(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={settingsLoading} className="w-full">
                  {settingsLoading ? "Saving Settings..." : "Save Platform Settings"}
                </Button>
              </form>
            </Card>
          </div>
        )}

      </main>

      {/* MODAL: Add New Venue */}
      {isAddVenueOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Onboard New Business Venue</h3>
              <Button variant="ghost" size="icon-sm" onClick={() => setIsAddVenueOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateVenue} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Business Venue Name *</label>
                <Input name="name" placeholder="e.g. Pyramids Palace Restaurant" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category Type</label>
                  <select name="business_type" className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-white text-slate-800">
                    <option value="RESTAURANT">RESTAURANT</option>
                    <option value="HOTEL">HOTEL</option>
                    <option value="SALON">SALON</option>
                    <option value="DELIVERY">DELIVERY</option>
                    <option value="CAR_WASH">CAR_WASH</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">City</label>
                  <Input name="city" placeholder="Cairo / Giza / Alex" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Address / Location</label>
                <Input name="address" placeholder="e.g. 123 Nile Corniche" />
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-extrabold text-slate-900 mb-2 text-xs">Manager / Owner Account Details</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Manager Name *</label>
                    <Input name="owner_name" placeholder="e.g. Ahmed Manager" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Manager Email *</label>
                      <Input type="email" name="owner_email" placeholder="manager@venue.com" required />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Password *</label>
                      <Input type="password" name="owner_password" placeholder="••••••••" required />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="secondary" onClick={() => setIsAddVenueOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Business"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

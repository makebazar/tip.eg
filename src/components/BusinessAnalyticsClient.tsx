"use client";

import React, { useState, useEffect } from "react";
import { Search, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getBusinessAnalyticsAndTransactions } from "@/app/actions/business";

interface TransactionItem {
  id: string;
  bill_id: string;
  amount_bill: number;
  amount_tip: number;
  currency: string;
  payment_status: string;
  created_at: string;
  table_number: string;
  spot_label?: string;
  staff_name?: string;
}

interface AnalyticsStats {
  totalTransactions: number;
  totalBillVolume: number;
  totalTipVolume: number;
  avgTipPercentage: string;
  avgBillAmount: string;
  qrScansCount: number;
  currency: string;
}

type DatePreset = "ALL" | "TODAY" | "YESTERDAY" | "WEEK" | "MONTH" | "CUSTOM";

export function BusinessAnalyticsClient({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await getBusinessAnalyticsAndTransactions(businessId);
      setLoading(false);
      if (res.success && res.stats && res.transactions) {
        setStats(res.stats);
        setTransactions(res.transactions);
      }
    }
    loadData();
  }, [businessId]);

  // Filtering transactions by search query AND date range
  const filteredTransactions = transactions.filter((t) => {
    // 1. Text Search Filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matches =
        (t.table_number && t.table_number.toLowerCase().includes(q)) ||
        (t.spot_label && t.spot_label.toLowerCase().includes(q)) ||
        (t.staff_name && t.staff_name.toLowerCase().includes(q)) ||
        t.id.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // 2. Date Filter
    if (datePreset === "ALL") return true;

    const txTime = new Date(t.created_at).getTime();
    const now = new Date();

    if (datePreset === "TODAY") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return txTime >= startOfDay;
    }

    if (datePreset === "YESTERDAY") {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      return txTime >= startOfYesterday && txTime < endOfYesterday;
    }

    if (datePreset === "WEEK") {
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return txTime >= sevenDaysAgo;
    }

    if (datePreset === "MONTH") {
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return txTime >= thirtyDaysAgo;
    }

    if (datePreset === "CUSTOM") {
      if (fromDate) {
        const fromTime = new Date(fromDate).getTime();
        if (txTime < fromTime) return false;
      }
      if (toDate) {
        const toTime = new Date(toDate).getTime() + 24 * 60 * 60 * 1000;
        if (txTime >= toTime) return false;
      }
    }

    return true;
  });

  // Re-calculate stats for filtered transactions dynamically
  const filteredBillVolume = filteredTransactions.reduce((sum, t) => sum + (t.amount_bill || 0), 0);
  const filteredTipVolume = filteredTransactions.reduce((sum, t) => sum + (t.amount_tip || 0), 0);
  const filteredAvgTipPct = filteredBillVolume > 0 ? ((filteredTipVolume / filteredBillVolume) * 100).toFixed(1) : "0";
  const filteredAvgBill = filteredTransactions.length > 0 ? (filteredBillVolume / filteredTransactions.length).toFixed(2) : "0.00";

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ["Transaction ID", "Date & Time", "Spot/Table", "Staff Member", "Bill Amount", "Tip Amount", "Status"];
    const rows = filteredTransactions.map((t) => [
      t.id,
      new Date(t.created_at).toLocaleString(),
      t.spot_label || t.table_number || "Direct",
      t.staff_name || "Team Pool",
      `${t.amount_bill} ${t.currency}`,
      `${t.amount_tip} ${t.currency}`,
      t.payment_status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transactions_${businessId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="w-full py-16 text-center text-xs text-slate-500">
        Loading business analytics & transactions...
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* QR Code Scans */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">QR Code Scans</span>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-slate-900">{stats?.qrScansCount || 0}</div>
            <p className="text-xs text-slate-500 mt-0.5">Total guest table scans</p>
          </div>
        </Card>

        {/* Total Tips Collected */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tips</span>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {filteredTipVolume.toFixed(2)} <span className="text-sm font-semibold text-slate-500">{stats?.currency}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Average tip: <strong className="text-teal-600 font-bold">{filteredAvgTipPct}%</strong></p>
          </div>
        </Card>

        {/* Billed Volume */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Volume</span>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {filteredBillVolume.toFixed(2)} <span className="text-sm font-semibold text-slate-500">{stats?.currency}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{filteredTransactions.length} completed orders</p>
          </div>
        </Card>

        {/* Average Bill Size */}
        <Card className="p-5 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Bill</span>
          <div className="my-2">
            <div className="text-3xl font-extrabold text-slate-900">
              {filteredAvgBill} <span className="text-sm font-semibold text-slate-500">{stats?.currency}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Per paid table</p>
          </div>
        </Card>
      </div>

      {/* Date Filter Toolbar & Search */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Period:</span>
            </span>
            <button
              onClick={() => setDatePreset("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "ALL"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDatePreset("TODAY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "TODAY"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDatePreset("YESTERDAY")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "YESTERDAY"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setDatePreset("WEEK")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "WEEK"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDatePreset("MONTH")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "MONTH"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDatePreset("CUSTOM")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                datePreset === "CUSTOM"
                  ? "bg-[#B58A1C] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Custom Range
            </button>
          </div>

          <Button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            variant="secondary"
            size="sm"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>

        {/* Custom Range Date Pickers */}
        {datePreset === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">From:</span>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-500">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(""); setToDate(""); }}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                Clear Range
              </button>
            )}
          </div>
        )}

        {/* Search input */}
        <div className="relative w-full pt-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder="Search transactions by spot label, waiter, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </Card>

      {/* Transactions & Closed Bills Table */}
      <Card className="overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-900">Transactions & Paid Bills</h3>
          <span className="text-xs font-semibold text-slate-500">{filteredTransactions.length} records</span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            {searchQuery || datePreset !== "ALL" ? "No transactions match your current filters." : "No transactions or paid bills recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/70 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Spot / Table</th>
                  <th className="px-4 py-3">Staff Member</th>
                  <th className="px-4 py-3">Bill Amount</th>
                  <th className="px-4 py-3">Tip Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((t) => {
                  const dateStr = new Date(t.created_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-900">
                        {dateStr}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="secondary">
                          {t.spot_label || t.table_number ? `${t.spot_label || t.table_number}` : "Direct"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-semibold text-slate-800">
                        {t.staff_name || "Team Pool"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-slate-900">
                        {t.amount_bill ? `${t.amount_bill.toFixed(2)} ${t.currency}` : "—"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap font-bold text-teal-600">
                        {t.amount_tip ? `+${t.amount_tip.toFixed(2)} ${t.currency}` : "0.00"}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge variant="success">
                          COMPLETED
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

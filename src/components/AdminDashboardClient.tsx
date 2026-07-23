"use client";

import React, { useState } from "react";
import { LogOut, ShieldCheck, ShieldAlert, Layers, Percent, Wallet, Settings, TrendingUp } from "lucide-react";
import styles from "@/app/admin/dashboard/admin.module.css";
import { logoutAdmin } from "@/app/actions/auth";

interface RestaurantData {
  id: string;
  name: string;
  address?: string | null;
  logo_url: string | null;
  currency: string;
  tip_distribution_mode: string;
  individual_percentage: number;
  balance: number;
}

interface PayoutData {
  id: string;
  individual_id: string | null;
  business_id: string | null;
  amount: number;
  payout_method: string;
  destination_detail: string;
  status: string;
  created_at: string;
  waiter_name?: string;
  restaurant_name?: string;
}

interface DashboardProps {
  restaurants: RestaurantData[];
  payouts: PayoutData[];
  stats: {
    totalVolume: number;
    platformCommission: number;
    totalRestaurants: number;
    totalWaiters: number;
  };
}

export default function AdminDashboardClient({ restaurants, payouts, stats }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<"restaurants" | "payouts" | "system">("restaurants");
  const [commissionRate, setCommissionRate] = useState<number>(5); // 5% default
  const [mockPaymentsEnabled, setMockPaymentsEnabled] = useState<boolean>(true);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h1>Super Admin Panel</h1>
          <p>Global Platform Control & Payouts Ledger</p>
        </div>
        <button className={styles.logoutBtn} onClick={() => logoutAdmin()}>
          <LogOut size={16} /> Logout
        </button>
      </div>

      {/* Stats dashboard */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "var(--accent)", background: "rgba(16,185,129,0.1)" }}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Global Volume (GMV)</span>
            <span className={styles.statValue}>{stats.totalVolume.toFixed(2)} EGP</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <Percent size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Platform Revenue</span>
            <span className={styles.statValue}>{stats.platformCommission.toFixed(2)} EGP</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#3b82f6", background: "rgba(59,130,246,0.1)" }}>
            <Layers size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Restaurants</span>
            <span className={styles.statValue}>{stats.totalRestaurants}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "var(--primary)", background: "rgba(var(--primary-rgb),0.1)" }}>
            <Percent size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Service Specialists</span>
            <span className={styles.statValue}>{stats.totalWaiters}</span>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === "restaurants" ? styles.activeTab : ""}`} onClick={() => setActiveTab("restaurants")}>
          B2B Businesses
        </button>
        <button className={`${styles.tab} ${activeTab === "payouts" ? styles.activeTab : ""}`} onClick={() => setActiveTab("payouts")}>
          Automated Payout Logs
        </button>
        <button className={`${styles.tab} ${activeTab === "system" ? styles.activeTab : ""}`} onClick={() => setActiveTab("system")}>
          System Settings
        </button>
      </div>

      {/* Tab: Restaurants */}
      {activeTab === "restaurants" && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Restaurant Name</th>
              <th>Address</th>
              <th>Tipping Mode</th>
              <th>Food Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 700 }}>{r.name}</td>
                <td>{r.address}</td>
                <td style={{ fontSize: "0.85rem", color: "var(--primary)" }}>{r.tip_distribution_mode}</td>
                <td>{r.balance.toFixed(2)} EGP</td>
                <td>
                  <span style={{ color: "var(--accent)", fontWeight: "bold", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <ShieldCheck size={14} /> ACTIVE
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Tab: Payouts */}
      {activeTab === "payouts" && (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Scope</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((po) => (
              <tr key={po.id}>
                <td style={{ fontWeight: 700 }}>{po.waiter_name || po.restaurant_name || "Unknown"}</td>
                <td>{po.waiter_name ? "Specialist Payout" : "Business Payout"}</td>
                <td style={{ fontWeight: "bold" }}>{po.amount.toFixed(2)} EGP</td>
                <td>
                  {po.payout_method === "VODAFONE_CASH" ? "Vodafone Cash" : "Bank Transfer"} ({po.destination_detail})
                </td>
                <td>{new Date(po.created_at).toLocaleDateString()}</td>
                <td>
                  <span className={`${styles.badge} ${styles.badgeSuccess}`}>{po.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Tab: System Settings */}
      {activeTab === "system" && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: "var(--radius-lg)", padding: "24px" }}>
          <h3 style={{ color: "#fff", marginBottom: "20px" }}>Global Control Settings</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h4 style={{ color: "#fff", marginBottom: "4px" }}>Mock Payment Engine</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>When active, payments are simulated instantly for client demos.</p>
              </div>
              <button
                type="button"
                onClick={() => setMockPaymentsEnabled(!mockPaymentsEnabled)}
                style={{
                  background: mockPaymentsEnabled ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)",
                  border: `1px solid ${mockPaymentsEnabled ? "var(--accent)" : "#ef4444"}`,
                  color: mockPaymentsEnabled ? "var(--accent)" : "#fca5a5",
                  padding: "8px 16px",
                  borderRadius: "20px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {mockPaymentsEnabled ? "ENABLED" : "DISABLED"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--card-border)", paddingTop: "16px" }}>
              <div>
                <h4 style={{ color: "#fff", marginBottom: "4px" }}>Standard Platform Commission (%)</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Default percentage deducted from every tip for platform revenue.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  style={{ width: "60px", background: "var(--input-bg)", border: "1px solid var(--card-border)", color: "#fff", padding: "6px", borderRadius: "4px", textAlign: "center" }}
                />
                <span style={{ fontWeight: "bold" }}>%</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

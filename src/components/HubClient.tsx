"use client";

import React, { useState } from "react";
import { LogOut, Wallet, User, Settings, ArrowRight, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { logoutIndividual } from "@/app/actions/auth";
import { processPayoutRequest } from "@/app/actions/payouts";
import { Skiper3 } from "@/components/ui/skiper-ui/skiper3";
import styles from "@/app/individual/individual.module.css";

interface IndividualData {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  rating: number;
  balance: number;
  payout_method: string | null;
  payout_detail: string | null;
  role: string;
  short_code: string;
  business_id: string | null;
}

interface BusinessRef {
  id: string;
  name: string;
  logo_url: string | null;
  currency: string;
  business_type: string;
  member_role?: string;
}

interface HubProps {
  individual: IndividualData;
  businesses: BusinessRef[];
  payouts: any[];
}

export default function HubClient({ individual, businesses, payouts }: HubProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"home" | "settings">("home");
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState(individual.balance.toString());
  const [loading, setLoading] = useState(false);

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseFloat(amount) <= 0) return;
    
    setLoading(true);
    try {
      const res = await processPayoutRequest({
        individualId: individual.id,
        amount: parseFloat(amount),
        payoutMethod: individual.payout_method || "VODAFONE_CASH",
        destinationDetail: individual.payout_detail || ""
      });
      if (res.success) {
        setModalOpen(false);
        window.location.reload();
      } else {
        alert(res.error || "Payout failed");
      }
    } catch (e) {
      alert("Error requesting payout");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.profileInfo}>
          {individual.avatar_url ? (
            <img src={individual.avatar_url} alt={individual.name} className={styles.avatar} />
          ) : (
            <div className={styles.avatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', fontWeight: 'bold' }}>
              {getInitials(individual.name)}
            </div>
          )}
          <div>
            <h2 className={styles.name}>{individual.name}</h2>
          </div>
        </div>
      </div>

      {activeTab === "home" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* Global Balance Card using Premium Styles */}
          <div className={styles.balanceCard}>
            <p className={styles.balanceLabel}>Total Balance</p>
            <h1 className={styles.balanceAmount}>
              {individual.balance.toFixed(2)} <span style={{ fontSize: "1.2rem", fontWeight: 600, opacity: 0.8 }}>EGP</span>
            </h1>
            <button
              className={styles.withdrawBtn}
              onClick={() => { setAmount(individual.balance.toString()); setModalOpen(true); }}
              disabled={individual.balance <= 0}
            >
              Instant Payout
            </button>
          </div>

          <h3 style={{ color: "var(--foreground)", marginBottom: "16px", fontSize: "1.2rem" }}>Your Workspaces</h3>
          
          <div className={styles.list}>
            {/* Personal Workspace */}
            <button 
              onClick={() => router.push("/individual/workspace/personal")}
              className={styles.workspaceCard}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div>
                  <h4 className={styles.workspaceTitle}>Personal Profile</h4>
                  <p className={styles.workspaceRole}>Independent tips & QR</p>
                </div>
              </div>
              <ArrowRight size={20} color="var(--text-muted)" />
            </button>

            {/* Business Workspaces */}
            {businesses.map(biz => (
              <button 
                key={biz.id}
                onClick={() => router.push(`/individual/workspace/${biz.id}`)}
                className={styles.workspaceCard}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div>
                    <h4 className={styles.workspaceTitle}>{biz.name}</h4>
                    <p className={styles.workspaceRole}>{biz.member_role || "Staff Member"}</p>
                  </div>
                </div>
                <ArrowRight size={20} color="var(--text-muted)" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "20px", fontSize: "1.4rem" }}>Settings</h3>
          
          <div className={styles.settingsSection}>
            <h4 className={styles.settingsTitle}>
              <User size={18} color="var(--primary)"/> Personal Details
            </h4>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Full Name</label>
              <input type="text" defaultValue={individual.name} className={styles.inputField} />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Email</label>
              <input type="email" defaultValue={individual.email || ""} className={styles.inputField} />
            </div>
            <button className={styles.saveBtn}>Save Details</button>
          </div>

          <div className={styles.settingsSection}>
            <h4 className={styles.settingsTitle}>
              <Wallet size={18} color="#10b981"/> Payout Method
            </h4>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Method</label>
              <select defaultValue={individual.payout_method || "VODAFONE_CASH"} className={styles.inputField}>
                <option value="VODAFONE_CASH">Vodafone Cash</option>
                <option value="INSTAPAY">InstaPay</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>Account Details / Number</label>
              <input type="text" defaultValue={individual.payout_detail || ""} placeholder="e.g. 01012345678" className={styles.inputField} />
            </div>
            <button className={styles.saveBtn}>Update Payout Info</button>
          </div>

          <div style={{ marginTop: "32px", marginBottom: "32px" }}>
            <button 
              onClick={() => logoutIndividual()} 
              className={styles.logoutBtn}
              style={{ width: "100%", padding: "16px", fontSize: "1rem", display: "flex", justifyContent: "center", alignItems: "center" }}
            >
              <LogOut size={20} style={{ marginRight: 8 }} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Reusing Skiper3 for Hub Navigation */}
      <Skiper3 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as any)} 
        tabs={[
          { id: "home", icon: Building, label: "Home" },
          { id: "settings", icon: Settings, label: "Settings" },
        ]}
      />

      {/* Withdraw Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Withdraw Funds</h3>
            <form onSubmit={handleWithdrawSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Amount (EGP)</label>
                <input
                  type="number"
                  step="0.01"
                  max={individual.balance}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              
              <div style={{ background: "rgba(var(--primary-rgb), 0.05)", border: "1px solid rgba(var(--primary-rgb), 0.2)", borderRadius: "var(--radius-md)", padding: "12px", marginBottom: "20px" }}>
                <p style={{ margin: "0 0 4px 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>Transferring to:</p>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--foreground)" }}>{individual.payout_method || "Wallet"} • {individual.payout_detail || "Not set"}</p>
                {(!individual.payout_method || !individual.payout_detail) && (
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#ef4444" }}>Please set payout details in Settings first.</p>
                )}
              </div>

              <div className={styles.btnGroup}>
                <button type="button" onClick={() => setModalOpen(false)} className={styles.cancelBtn}>Cancel</button>
                <button 
                  type="submit" 
                  disabled={loading || !individual.payout_detail || parseFloat(amount) > individual.balance} 
                  className={styles.confirmBtn}
                >
                  {loading ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

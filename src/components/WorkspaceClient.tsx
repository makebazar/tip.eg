"use client";

import React, { useState } from "react";
import { LogOut, Star, Wallet, Send, Smartphone, History, QrCode, ArrowRight, Copy, Check, Layers, Plus, Trash2, List } from "lucide-react";
import styles from "@/app/individual/individual.module.css";
import { logoutIndividual } from "@/app/actions/auth";
import { processPayoutRequest } from "@/app/actions/payouts";
import { assignIndividualToSpot, cancelBill, addItemToSpotCart, removeItemFromSpotCart, approvePendingItems } from "@/app/actions/business";
import { Skiper3 } from "@/components/ui/skiper-ui/skiper3";
import { useRouter } from "next/navigation";

interface IndividualData {
  id: string;
  name: string;
  avatar_url: string | null;
  rating: number;
  balance: number;
  payout_method: string | null;
  payout_detail: string | null;
  restaurant_name: string | null;
  currency: string;
  role: string;
  short_code: string;
}

interface TransactionData {
  id: string;
  amount_earned: number;
  currency: string;
  created_at: string;
  rating_stars: number | null;
  comments: string | null;
  tags: string | null;
}

interface SpotData {
  id: string;
  label: string;
  short_code: string;
  assigned_individual_id: string | null;
}

interface PayoutRequest {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  method: string;
  destination: string;
}

interface DashboardProps {
  waiter: IndividualData;
  transactions: TransactionData[];
  payouts: PayoutRequest[];
  spots: SpotData[];
  businesses: any[];
  activeBusinessId: string;
  bills?: any[];
  menuItems?: any[];
  isPersonal?: boolean;
}

export default function WorkspaceClient({ waiter, transactions, payouts, spots, businesses, activeBusinessId, bills = [], menuItems = [], isPersonal = false }: DashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reviews" | "qr" | "spots">(isPersonal ? "reviews" : "spots");
  const [spotsFilter, setSpotsFilter] = useState<"my" | "free">("my");
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Payout details state
  const [amount, setAmount] = useState<string>(waiter.balance.toString());
  const [payoutMethod, setPayoutMethod] = useState<"VODAFONE_CASH" | "INSTAPAY">(
    (waiter.payout_method as any) || "VODAFONE_CASH"
  );
  const [destination, setDestination] = useState<string>(waiter.payout_detail || "");

  // Request state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleWithdrawClick = () => {
    setAmount(waiter.balance.toString());
    setModalOpen(true);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (numericAmount > waiter.balance) {
      setError("Insufficient balance");
      return;
    }

    if (!destination.trim()) {
      setError(
        payoutMethod === "VODAFONE_CASH"
          ? "Please enter your Vodafone Cash phone number"
          : "Please enter your InstaPay IPA address"
      );
      return;
    }

    setLoading(true);

    // Simulate instant payout worker call delay (1 second)
    setTimeout(async () => {
      const res = await processPayoutRequest({
        individualId: waiter.id,
        amount: numericAmount,
        payoutMethod,
        destinationDetail: destination,
      });

      setLoading(false);
      if (res.success) {
        setModalOpen(false);
        alert(`Payout of ${numericAmount} EGP processed successfully!`);
        window.location.reload();
      } else {
        setError(res.error || "Failed to withdraw");
      }
    }, 1000);
  };

  const getRoleDisplayName = (r: string) => {
    switch (r?.toUpperCase()) {
      case "WAITER": return "Server / Waiter";
      case "BARBER": return "Barber / Stylist";
      case "COURIER": return "Courier / Delivery";
      case "HOUSEKEEPER": return "Housekeeper";
      case "VALET": return "Valet Attendant";
      case "DRIVER": return "Taxi Driver";
      default: return "Service Specialist";
    }
  };

  const copyTippingLink = () => {
    const link = `${window.location.origin}/p/${waiter.short_code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className={styles.container}>
      {/* Top Header */}
      <div className={styles.header} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button 
          onClick={() => window.location.href = "/individual/hub"}
          style={{ background: "transparent", border: "none", color: "var(--foreground)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ArrowRight size={24} style={{ transform: "rotate(180deg)" }} />
        </button>
        <div className={styles.profileInfo} style={{ flex: 1 }}>
          <div>
            <h2 className={styles.name} style={{ margin: 0 }}>{waiter.restaurant_name || "Personal Workspace"}</h2>
            <p className={styles.restaurant} style={{ margin: 0, opacity: 0.8 }}>
              {getRoleDisplayName(waiter.role)}
            </p>
          </div>
        </div>
      </div>


      {/* Reviews Tab */}
      {activeTab === "reviews" && (
        <div className={styles.list}>
          {transactions.length === 0 ? (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>
              No tips received yet. Show guests your QR code!
            </p>
          ) : (
            transactions.map((tx) => (
              <div className={styles.historyCard} key={tx.id}>
                <div className={styles.row} style={{ marginBottom: 0 }}>
                  <span className={styles.amount}>
                    +{tx.amount_earned} {tx.currency}
                  </span>
                  <span className={styles.date}>
                    {new Date(tx.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}



      {/* Spots Tab */}
      {activeTab === "spots" && (
        <div className={styles.list}>
          <div style={{ 
            display: "flex", 
            gap: "4px", 
            marginBottom: "24px", 
            background: "rgba(0, 0, 0, 0.04)", 
            padding: "4px", 
            borderRadius: "12px", 
            border: "1px solid rgba(0, 0, 0, 0.02)" 
          }}>
            <button 
              onClick={() => setSpotsFilter("my")}
              style={{
                flex: 1, padding: "12px", borderRadius: "8px", border: "none", outline: "none",
                background: spotsFilter === "my" ? "#ffffff" : "transparent",
                color: spotsFilter === "my" ? "#0f172a" : "#64748b",
                fontWeight: spotsFilter === "my" ? 700 : 500,
                boxShadow: spotsFilter === "my" ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                cursor: "pointer", transition: "all 0.2s ease"
              }}
            >
              My Tables
            </button>
            <button 
              onClick={() => setSpotsFilter("free")}
              style={{
                flex: 1, padding: "12px", borderRadius: "8px", border: "none", outline: "none",
                background: spotsFilter === "free" ? "#ffffff" : "transparent",
                color: spotsFilter === "free" ? "#0f172a" : "#64748b",
                fontWeight: spotsFilter === "free" ? 700 : 500,
                boxShadow: spotsFilter === "free" ? "0 2px 8px rgba(0, 0, 0, 0.08)" : "none",
                cursor: "pointer", transition: "all 0.2s ease"
              }}
            >
              Free Tables
            </button>
          </div>

          {(() => {
            const filteredSpots = spotsFilter === "my" 
              ? spots.filter((s) => s.assigned_individual_id === waiter.id)
              : spots.filter((s) => !s.assigned_individual_id);

            if (filteredSpots.length === 0) {
              return (
                <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px 0" }}>
                  {spotsFilter === "my" ? "You haven't opened any tables yet." : "No free tables available right now."}
                </p>
              );
            }

            return filteredSpots.map((spot) => {
              const isAssignedToMe = spot.assigned_individual_id === waiter.id;
              const activeBill = bills.find(b => b.spot_id === spot.id && b.status === "UNPAID");
              let hasPending = false;
              let itemsCount = 0;
              if (activeBill) {
                try {
                  const items = JSON.parse(activeBill.items);
                  hasPending = items.some((i: any) => i.status === 'PENDING');
                  itemsCount = items.length;
                } catch(e) {}
              }
              
              return (
                <div 
                  className={styles.historyCard} 
                  key={spot.id} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column",
                    border: "1px solid rgba(0,0,0,0.05)",
                    background: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    borderRadius: "16px",
                    padding: "16px",
                    marginBottom: "16px",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  {hasPending && isAssignedToMe && (
                    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "#f59e0b" }} />
                  )}

                  {/* Header Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.2rem" }}>
                        {spot.label}
                      </span>
                      {hasPending && <span style={{fontSize: "0.65rem", fontWeight: 700, color: "#d97706", background: "#fef3c7", border: "1px solid #fde68a", padding: "2px 6px", borderRadius: 4}}>NEW ORDERS</span>}
                    </div>

                    {isAssignedToMe && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (activeBill && itemsCount > 0) {
                            if (!window.confirm("This table has an open bill. Are you sure you want to release it?")) return;
                          }
                          const res = await assignIndividualToSpot({ spotId: spot.id, individualId: null });
                          if (res.success) window.location.reload();
                        }}
                        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem", fontWeight: 600 }}
                      >
                        <LogOut size={14} /> Release
                      </button>
                    )}
                  </div>

                  {/* Body Row (Bill Status) */}
                  <div style={{ marginBottom: "20px" }}>
                    {activeBill && itemsCount > 0 ? (
                      <div>
                        <span style={{ fontSize: "0.85rem", color: "#64748b", display: "block", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Open Bill</span>
                        <span style={{ fontSize: "1.8rem", color: "#0f172a", fontWeight: 800, lineHeight: 1 }}>{activeBill.amount} <span style={{ fontSize: "1rem", color: "#64748b", fontWeight: 600 }}>{waiter.currency}</span></span>
                      </div>
                    ) : (
                      <div style={{ padding: "8px 0" }}>
                        <span style={{ fontSize: "1rem", color: "#94a3b8", fontWeight: 500 }}>No open bill</span>
                      </div>
                    )}
                  </div>

                  {/* Action Row */}
                  <div>
                    {isAssignedToMe ? (
                      <button
                        type="button"
                        style={{ 
                          width: "100%",
                          padding: "14px", 
                          fontSize: "1rem", 
                          fontWeight: 700,
                          background: "var(--primary)",
                          color: "#000",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(var(--primary-rgb), 0.2)"
                        }}
                        onClick={() => router.push(`/individual/workspace/${activeBusinessId}/spot/${spot.id}`)}
                      >
                        <List size={18} /> Manage Order
                      </button>
                    ) : (
                      <button
                        type="button"
                        style={{ 
                          width: "100%",
                          padding: "14px", 
                          fontSize: "1rem", 
                          fontWeight: 700,
                          background: "#0f172a",
                          color: "#fff",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                        }}
                        onClick={async () => {
                          const res = await assignIndividualToSpot({ spotId: spot.id, individualId: waiter.id });
                          if (res.success) window.location.reload();
                        }}
                      >
                        <Check size={18} /> Open Table
                      </button>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* QR Code Tab */}
      {activeTab === "qr" && (
        <div className={styles.qrBox}>
          <div className={styles.qrImagePlaceholder}>
            <div style={{ padding: 12, background: "#fff", border: "1px solid #ccc" }}>
              <div style={{ width: 140, height: 140, background: "#111", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "0.8rem", fontWeight: "bold", textAlign: "center" }}>
                BAKSHEESH QR<br/>
                CODE: {waiter.short_code}
              </div>
            </div>
          </div>
          <h3 style={{ color: "var(--foreground)", marginBottom: "8px" }}>Scan to Tip Me</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "16px" }}>
            Show this screen to clients or print it to receive direct tips.
          </p>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", background: "#0b0f19", border: "1px solid var(--card-border)", borderRadius: "4px", padding: "6px 12px", width: "100%", maxWidth: "340px", marginBottom: "20px" }}>
            <span style={{ flex: 1, fontFamily: "monospace", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)", textAlign: "left" }}>
              {`${window.location.origin}/p/${waiter.short_code}`}
            </span>
            <button type="button" onClick={copyTippingLink} style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", display: "flex" }}>
              {copiedLink ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>

          <a
            href={`/p/${waiter.short_code}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              color: "var(--primary)",
              fontWeight: 700,
              fontSize: "0.9rem",
            }}
          >
            Open Tipping Page <ArrowRight size={14} />
          </a>
        </div>
      )}

      {/* Withdrawal Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleWithdrawSubmit} className={styles.modal}>
            <h3 className={styles.modalTitle}>Withdraw Funds</h3>
            <p className={styles.modalSub}>
              Select payout method and enter your details. Transfer will be instant.
            </p>

            {error && <div className={styles.errorBox}>{error}</div>}

            <h4 className={styles.sectionTitle}>Payout Method</h4>
            <div className={styles.methodSelector}>
              <button
                type="button"
                className={`${styles.methodBtn} ${payoutMethod === "VODAFONE_CASH" ? styles.methodBtnActive : ""}`}
                onClick={() => {
                  setPayoutMethod("VODAFONE_CASH");
                  setDestination(waiter.payout_detail && waiter.payout_method === "VODAFONE_CASH" ? waiter.payout_detail : "");
                }}
              >
                <Smartphone size={20} />
                Vodafone Cash
              </button>
              <button
                type="button"
                className={`${styles.methodBtn} ${payoutMethod === "INSTAPAY" ? styles.methodBtnActive : ""}`}
                onClick={() => {
                  setPayoutMethod("INSTAPAY");
                  setDestination(waiter.payout_detail && waiter.payout_method === "INSTAPAY" ? waiter.payout_detail : "");
                }}
              >
                <Send size={20} />
                InstaPay IPA
              </button>
            </div>

            <h4 className={styles.sectionTitle}>Withdrawal Amount</h4>
            <input
              type="number"
              className={styles.modalInput}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              max={waiter.balance}
              min="1"
              required
            />

            <h4 className={styles.sectionTitle}>
              {payoutMethod === "VODAFONE_CASH" ? "Vodafone Phone Number" : "InstaPay Address (IPA)"}
            </h4>
            <input
              type="text"
              className={styles.modalInput}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={payoutMethod === "VODAFONE_CASH" ? "+201012345678" : "username@instapay"}
              required
            />

            <div className={styles.btnGroup}>
              <button type="button" className={styles.cancelBtn} onClick={() => setModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.confirmBtn} disabled={loading}>
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}



      <Skiper3 
        activeTab={activeTab} 
        onTabChange={(tab) => setActiveTab(tab as any)} 
        tabs={[
          { id: "reviews", icon: History, label: "Reviews" },
          ...(isPersonal ? [{ id: "qr", icon: QrCode, label: "My QR" }] : []),
          ...(!isPersonal ? [{ id: "spots", icon: Layers, label: "Spots" }] : []),
        ]}
      />
    </div>
  );
}

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { LogOut, Users, Utensils, Star, Plus, Settings, TrendingUp, Trash2, QrCode, Globe, Copy, Check, UserPlus, Receipt, Pencil, Building2 } from "lucide-react";
import styles from "@/app/business/dashboard/business.module.css";
import { logoutBusiness } from "@/app/actions/auth";
import { addIndividualToBusiness, updateTipSettings, updateBusinessType, createMockBill, withdrawBusinessBalance, assignIndividualToSpot, createSpot, updateBill, cancelBill, deleteSpot, findIndividualByEmail, linkIndividualToBusiness, unlinkIndividualFromBusiness, updateMemberRole, toggleStopList, addItemToSpotCart, removeItemFromSpotCart, approvePendingItems } from "@/app/actions/business";
import { BusinessAnalyticsClient } from "@/components/BusinessAnalyticsClient";

interface WaiterData {
  id: string;
  name: string;
  email: string;
  balance: number;
  rating: number;
  avatar_url: string | null;
  role: string;
}

interface BillData {
  id: string;
  table_number: string; // Spot label e.g. "Table 4"
  amount: number;
  status: string;
  individual_id: string | null;
  spot_id: string | null;
  items: string;
  table_short_code?: string | null;
}

interface FeedbackData {
  rating_stars: number;
  comments: string | null;
  tags: string | null;
  created_at: string;
  waiter_name: string;
}

interface BusinessData {
  id: string;
  name: string;
  address?: string | null;
  logo_url: string | null;
  currency: string;
  tip_distribution_mode: string;
  individual_percentage: number;
  balance: number;
  business_type: string;
}

interface SpotData {
  id: string;
  business_id: string;
  number: number;
  label: string;
  short_code: string;
  assigned_individual_id: string | null;
}

interface MenuItemData {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  name: string;
  price: number;
  description: string | null;
  is_available: number;
}

interface DashboardProps {
  restaurant: BusinessData; // Aliased for prop backward compatibility
  waiters: WaiterData[];
  bills: BillData[];
  feedbacks: FeedbackData[];
  spots: SpotData[];
  stats: {
    totalTips: number;
    avgRating: number;
    totalBillsPaid: number;
  };
  menuItems?: MenuItemData[];
}

export default function BusinessDashboardClient({ restaurant: initialRestaurant, waiters, bills: initialBills, feedbacks, spots: initialSpots, stats, menuItems: initialMenuItems = [] }: DashboardProps) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [activeTab, setActiveTab] = useState<"bills" | "analytics" | "stoplist" | "settings">("bills");

  // Local state for SSE real-time updates
  const [bills, setBills] = useState(initialBills);
  const [spots, setSpots] = useState(initialSpots);
  const [menuItems, setMenuItems] = useState(initialMenuItems);

  useEffect(() => {
    const eventSource = new EventSource('/api/business/dashboard/stream');

    eventSource.onmessage = (event) => {
      try {
        if (event.data.trim() === "ping" || event.data.includes("ping")) return;
        const data = JSON.parse(event.data);
        if (data.bills) setBills(data.bills);
        if (data.spots) setSpots(data.spots);
        if (data.menuItems) setMenuItems(data.menuItems);
      } catch (err) {
        console.error("SSE parsing error", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Dynamic Spot & Staff terminology based on business type
  const [businessType, setBusinessType] = useState(restaurant.business_type || "RESTAURANT");

  const getTerminology = (type: string) => {
    switch (type) {
      case "RESTAURANT":
        return { spot: "Table", spotPlural: "Tables", staff: "Waiter", staffPlural: "Waiters", service: "Food" };
      case "SALON":
        return { spot: "Chair", spotPlural: "Chairs", staff: "Stylist", staffPlural: "Stylists", service: "Service" };
      case "HOTEL":
        return { spot: "Room", spotPlural: "Rooms", staff: "Attendant", staffPlural: "Attendants", service: "Room Service" };
      case "DELIVERY":
        return { spot: "Order", spotPlural: "Orders", staff: "Courier", staffPlural: "Couriers", service: "Delivery" };
      case "CAR_WASH":
        return { spot: "Lane", spotPlural: "Lanes", staff: "Attendant", staffPlural: "Attendants", service: "Wash Service" };
      default:
        return { spot: "Spot", spotPlural: "Spots", staff: "Specialist", staffPlural: "Specialists", service: "Service" };
    }
  };

  const terms = getTerminology(businessType);

  // Staff Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStaffMode, setAddStaffMode] = useState<"find" | "create">("find");
  const [findEmail, setFindEmail] = useState("");
  const [findLoading, setFindLoading] = useState(false);
  const [foundIndividual, setFoundIndividual] = useState<{ id: string; name: string; email: string; role: string; avatar_url: string | null } | null>(null);
  const [findError, setFindError] = useState("");
  const [linkRole, setLinkRole] = useState("WAITER");
  const [waiterName, setWaiterName] = useState("");
  const [waiterEmail, setWaiterEmail] = useState("");
  const [waiterRole, setWaiterRole] = useState("WAITER");
  const [waiterPayoutMethod, setWaiterPayoutMethod] = useState("VODAFONE_CASH");
  const [waiterPayoutDetail, setWaiterPayoutDetail] = useState("");
  const [addError, setAddError] = useState("");
  const [newCredentials, setNewCredentials] = useState<{ name: string; email: string; password: string } | null>(null);
  const [credCopied, setCredCopied] = useState(false);
  // Per-row role editing: map of individualId → selected role string
  const [editingRoles, setEditingRoles] = useState<Record<string, string>>({});
  const [stopListSearch, setStopListSearch] = useState("");

  // Tip Split Settings state
  const [tipMode, setTipMode] = useState(restaurant.tip_distribution_mode);
  const [waiterPct, setWaiterPct] = useState(restaurant.individual_percentage.toString());
  const [settingsSaved, setSettingsSaved] = useState(false);



  // Withdraw Modal State
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(restaurant.balance.toString());
  const [withdrawMethod, setWithdrawMethod] = useState("BANK_TRANSFER");
  const [withdrawDetail, setWithdrawDetail] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const [openAssignSpot, setOpenAssignSpot] = useState<{ id: string; top: number; left: number; width: number } | null>(null);
  const [tableNumber, setTableNumber] = useState("");

  // Close assign popover on scroll or resize
  useEffect(() => {
    if (!openAssignSpot) return;
    const close = () => setOpenAssignSpot(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openAssignSpot]);


  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");

    if (!waiterName || !waiterEmail) {
      setAddError("Please fill in name and email.");
      return;
    }

    const res = await addIndividualToBusiness({
      businessId: restaurant.id,
      name: waiterName,
      email: waiterEmail,
      role: waiterRole,
      payoutMethod: "",
      payoutDetail: "",
    });

    if (res.success && res.credentials) {
      setAddModalOpen(false);
      setWaiterName("");
      setWaiterEmail("");
      setWaiterPayoutDetail("");
      setNewCredentials(res.credentials);
    } else {
      setAddError(res.error || "Failed to add staff member");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const resSettings = await updateTipSettings({
      businessId: restaurant.id,
      mode: tipMode,
      individualPercentage: parseFloat(waiterPct) || 100.0,
    });

    const resType = await updateBusinessType({
      businessId: restaurant.id,
      type: businessType,
    });

    if (resSettings.success && resType.success) {
      setSettingsSaved(true);
      setTimeout(() => {
        setSettingsSaved(false);
        window.location.reload();
      }, 1500);
    }
  };


  const handleWithdrawRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0 || amount > restaurant.balance) {
      alert("Invalid withdrawal amount");
      return;
    }

    setWithdrawLoading(true);

    setTimeout(async () => {
      const res = await withdrawBusinessBalance({
        businessId: restaurant.id,
        amount,
        payoutMethod: withdrawMethod,
        destinationDetail: withdrawDetail,
      });

      setWithdrawLoading(false);
      if (res.success) {
        setWithdrawModalOpen(false);
        alert(`Withdrawal of ${amount} EGP submitted successfully!`);
        window.location.reload();
      } else {
        alert(res.error || "Withdrawal failed");
      }
    }, 1000);
  };



  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case "WAITER": return "Server/Waiter";
      case "BARBER": return "Barber/Stylist";
      case "COURIER": return "Courier/Delivery";
      case "HOUSEKEEPER": return "Housekeeper";
      case "VALET": return "Valet Park";
      case "DRIVER": return "Driver/Taxi";
      default: return "Staff Specialist";
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h1>{restaurant.name} Dashboard</h1>
          <p>{restaurant.address || "Main Location"} | Category: <strong>{businessType}</strong></p>
        </div>
        <div className={styles.actions}>
          <Link href="/business/locations" className={styles.secondaryBtn} style={{ textDecoration: "none" }}>
            <Building2 size={16} />
            <span>Locations</span>
          </Link>
          <Link href="/business/settings" className={styles.secondaryBtn} style={{ textDecoration: "none" }}>
            Settings
          </Link>
          <button className={styles.secondaryBtn} onClick={() => setWithdrawModalOpen(true)} disabled={restaurant.balance <= 0}>
            Withdraw {terms.service} Funds
          </button>
          <button className={styles.logoutBtn} onClick={() => logoutBusiness()}>
            Logout
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{terms.service} Balance</span>
            <span className={styles.statValue}>
              {restaurant.balance.toFixed(2)} {restaurant.currency}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "var(--accent)", background: "rgba(16,185,129,0.1)" }}>
            <Utensils size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{terms.service} Sales</span>
            <span className={styles.statValue}>
              {stats.totalBillsPaid.toFixed(2)} {restaurant.currency}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ color: "#3b82f6", background: "rgba(59,130,246,0.1)" }}>
            <Users size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Tips</span>
            <span className={styles.statValue}>
              {stats.totalTips.toFixed(2)} {restaurant.currency}
            </span>
          </div>
        </div>
      </div>


      {/* Navigation tabs */}
      <div className={styles.tabs}>
        <button 
          className={`${styles.tab} ${activeTab === "bills" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("bills")}
        >
          Bills & {terms.spotPlural}
        </button>
        <button 
          className={`${styles.tab} ${activeTab === "analytics" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("analytics")}
        >
          Analytics & Transactions
        </button>
        <button 
          className={`${styles.tab} ${activeTab === "stoplist" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("stoplist")}
        >
          Stop List
        </button>
      </div>

      {/* Tab: Analytics & Transactions */}
      {activeTab === "analytics" && (
        <div className="py-2">
          <BusinessAnalyticsClient businessId={restaurant.id} />
        </div>
      )}

      {/* Tab: Bills & QRs */}
      {activeTab === "bills" && (
        <div>

          {/* Spot Cards Grid */}
          {spots.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <QrCode size={40} style={{ opacity: 0.3, marginBottom: "12px" }} />
              <p style={{ fontSize: "0.9rem" }}>No {terms.spotPlural.toLowerCase()} yet. Add your first {terms.spot.toLowerCase()} above.</p>
            </div>
          ) : (
            <div className={styles.spotGrid}>
              {spots.map((spot) => {
                const activeBill = bills.find(
                  (b) => b.spot_id === spot.id && b.status === "UNPAID"
                ) as (BillData & { spot_id?: string }) | undefined;
                const assignedWaiter = spot.assigned_individual_id
                  ? waiters.find((w) => w.id === spot.assigned_individual_id)
                  : null;

                const isActive = !!activeBill;
                const isAssigned = !!spot.assigned_individual_id;

                const cardClass = [
                  styles.spotCard,
                  isActive ? styles.spotCardActive : isAssigned ? styles.spotCardAssigned : styles.spotCardFree,
                ].join(" ");

                const badge = isAssigned
                  ? { label: "Assigned", cls: styles.badgeAssigned }
                  : { label: "Free", cls: styles.badgeFree };

                return (
                  <div key={spot.id} className={cardClass}>
                    {/* Header */}
                    <div className={styles.spotCardHeader}>
                      <div className={styles.spotLabel}>{spot.label}</div>
                      {isActive && activeBill && (
                        <div className={styles.spotBillAmount}>
                          {activeBill.amount} {restaurant.currency}
                        </div>
                      )}
                    </div>

                    {/* Waiter row */}
                    <div className={styles.spotWaiterRow}>
                      {assignedWaiter ? (
                        <>
                          <img
                            src={assignedWaiter.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"}
                            alt={assignedWaiter.name}
                            className={styles.spotWaiterAvatar}
                          />
                          <span className={styles.spotWaiterName}>{assignedWaiter.name}</span>
                        </>
                      ) : (
                        <span className={styles.spotWaiterPool}>Unassigned</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className={styles.spotActions}>

                      <button
                        className={styles.spotActionBtn}
                        type="button"
                        onClick={(e) => {
                          if (openAssignSpot?.id === spot.id) {
                            setOpenAssignSpot(null);
                            return;
                          }
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setOpenAssignSpot({
                            id: spot.id,
                            top: rect.bottom + 6,
                            left: rect.left,
                            width: Math.max(rect.width, 200),
                          });
                        }}
                      >
                        {assignedWaiter ? "Change" : "+ Assign"}
                      </button>

                      {isActive && activeBill ? (
                        <button
                          className={styles.spotActionBtnPrimary}
                          type="button"
                          onClick={() => router.push(`/business/spots/${spot.id}`)}
                        >
                          Cart ({(() => {
                            try { return JSON.parse(activeBill.items).reduce((s:number, i:any) => s + i.quantity, 0); } catch { return 0; }
                          })()})
                        </button>
                      ) : (
                        <button
                          className={styles.spotActionBtnPrimary}
                          type="button"
                          onClick={() => router.push(`/business/spots/${spot.id}`)}
                        >
                          + Cart
                        </button>
                      )}
                    </div>
                  </div>
                );

              })}
            </div>
          )}

          {/* Billing History — only closed bills */}
          {(() => {
            const closedBills = bills.filter((b) => b.status === "PAID" || b.status === "CANCELLED");
            if (closedBills.length === 0) return null;
            return (
              <>
                <div className={styles.billsSectionTitle}>
                  <TrendingUp size={16} /> Billing History
                </div>
                <div className={styles.billFeed}>
                  {closedBills.slice(0, 20).map((b) => (
                    <div key={b.id} className={styles.billCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{b.table_number}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "10px" }}>
                            {b.amount} {restaurant.currency}
                          </span>
                        </div>
                        <span
                          className={styles.billStatus}
                          style={{
                            background: b.status === "PAID"
                              ? "rgba(16,185,129,0.1)"
                              : "rgba(100,116,139,0.1)",
                            color: b.status === "PAID" ? "var(--accent)" : "#64748b",
                            border: `1px solid ${b.status === "PAID" ? "rgba(16,185,129,0.3)" : "rgba(100,116,139,0.25)"}`,
                          }}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Tab: Stop List */}
      {activeTab === "stoplist" && (
        <div className={styles.settingsCard}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "6px" }}>Stop List Management</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            Toggle items in and out of stock. Stop-listed items are blocked in bill creation and marked as Sold Out for guests.
          </p>

          {menuItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>
              No items added to catalog yet. Add items in Settings.
            </div>
          ) : (
            <>
              <input
                type="text"
                className={styles.input}
                placeholder="Search items or categories..."
                value={stopListSearch}
                onChange={(e) => setStopListSearch(e.target.value)}
                style={{ marginBottom: "16px", width: "100%" }}
              />
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {menuItems
                  .filter((item) => 
                    item.name.toLowerCase().includes(stopListSearch.toLowerCase()) || 
                    (item.category_name || "").toLowerCase().includes(stopListSearch.toLowerCase())
                  )
                  .map((item) => {
                    const isAvailable = item.is_available === 1;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 10,
                      opacity: isAvailable ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{item.name}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        {item.price} {restaurant.currency} • {item.category_name || "General"}
                      </div>
                    </div>
                    <button
                      type="button"
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: `1px solid ${isAvailable ? "#22c55e" : "#ef4444"}`,
                        background: isAvailable ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                        color: isAvailable ? "#22c55e" : "#ef4444",
                        cursor: "pointer",
                      }}
                      onClick={async () => {
                        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, is_available: isAvailable ? 0 : 1 } : m));
                        await toggleStopList({ itemId: item.id, isAvailable: isAvailable ? 0 : 1 });
                      }}
                    >
                      {isAvailable ? "Available" : "STOP LIST"}
                    </button>
                  </div>
                );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Settings */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className={styles.settingsCard}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "16px" }}>Company Settings & Tipping Configuration</h3>

          {settingsSaved && (
            <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid var(--accent)", color: "var(--accent)", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "20px", textAlign: "center" }}>
              Configuration settings saved successfully!
            </div>
          )}

          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>Business Category / Type</label>
            <p className={styles.settingsDesc}>Select the vertical that matches your business model to tailor labels.</p>
            <select className={styles.select} value={businessType} onChange={(e) => setBusinessType(e.target.value)}>
              <option value="RESTAURANT">Restaurant / Cafe</option>
              <option value="SALON">Beauty Salon / Barbershop</option>
              <option value="HOTEL">Hotel / Hospitality</option>
              <option value="DELIVERY">Delivery Service</option>
              <option value="CAR_WASH">Car Wash Service</option>
              <option value="OTHER">Other Service Business</option>
            </select>
          </div>

          <div className={styles.settingsRow}>
            <label className={styles.settingsLabel}>Tip Distribution Mode</label>
            <p className={styles.settingsDesc}>Choose how tips left by guests are shared among your staff members.</p>
            <select className={styles.select} value={tipMode} onChange={(e) => setTipMode(e.target.value)}>
              <option value="INDIVIDUAL">Individual ({terms.staff} keeps 100% of their tips)</option>
              <option value="EQUAL_SPLIT">Equal Split (Shared equally among all working {terms.staffPlural.toLowerCase()})</option>
              <option value="CUSTOM_SPLIT">Custom Split ({terms.staff} keeps % / Remaining goes to company/kitchen pool)</option>
            </select>
          </div>

          {tipMode === "CUSTOM_SPLIT" && (
            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>{terms.staff} Percentage (%)</label>
              <p className={styles.settingsDesc}>What percentage goes directly to the serving {terms.staff.toLowerCase()}. The rest goes to the company pool balance.</p>
              <input type="number" className={styles.input} value={waiterPct} onChange={(e) => setWaiterPct(e.target.value)} max="100" min="0" placeholder="70" required />
            </div>
          )}

          <button type="submit" className={styles.primaryBtn}>
            Save Configuration
          </button>
        </form>
      )}

      {activeTab === "settings" && (
        <div className={styles.settingsCard} style={{ marginTop: "20px" }}>
          <h3 style={{ color: "var(--foreground)", marginBottom: "6px" }}>{terms.spotPlural} Setup</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            Add or remove {terms.spotPlural.toLowerCase()} that appear on the Bills tab. Each {terms.spot.toLowerCase()} gets a unique QR short-code.
          </p>

          {/* Add spot form */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <input
              type="text"
              className={styles.input}
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder={`Label, e.g. 7, VIP-1, Terrace`}
              style={{ flex: 1 }}
              onKeyDown={async (e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                if (!tableNumber.trim()) return;
                const num = parseInt(tableNumber.replace(/\D/g, "")) || Date.now() % 10000;
                await createSpot({ businessId: restaurant.id, number: num, label: `${terms.spot} ${tableNumber.trim()}` });
                setTableNumber("");
                window.location.reload();
              }}
            />
            <button
              className={styles.primaryBtn}
              type="button"
              onClick={async () => {
                if (!tableNumber.trim()) return;
                const num = parseInt(tableNumber.replace(/\D/g, "")) || Date.now() % 10000;
                await createSpot({ businessId: restaurant.id, number: num, label: `${terms.spot} ${tableNumber.trim()}` });
                setTableNumber("");
                window.location.reload();
              }}
            >
              <Plus size={15} /> Add {terms.spot}
            </button>
          </div>

          {/* Spots list */}
          {spots.length === 0 ? (
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>
              No {terms.spotPlural.toLowerCase()} yet. Add your first one above.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {spots.map((spot) => {
                const assignedWaiter = spot.assigned_individual_id
                  ? waiters.find((w) => w.id === spot.assigned_individual_id)
                  : null;
                const hasActiveBill = bills.some((b) => b.spot_id === spot.id && b.status === "UNPAID");

                return (
                  <div
                    key={spot.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--input-bg)",
                      border: "1px solid var(--card-border)",
                      borderRadius: 10,
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--foreground)" }}>{spot.label}</div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{spot.short_code}</div>
                      </div>
                      {assignedWaiter && (
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 6, padding: "2px 8px" }}>
                          {assignedWaiter.name}
                        </span>
                      )}
                      {hasActiveBill && (
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 6, padding: "2px 8px" }}>
                          Active Bill
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      title={hasActiveBill ? "Cannot delete — has active bill" : `Delete ${spot.label}`}
                      disabled={hasActiveBill}
                      style={{
                        background: "none",
                        border: "1px solid",
                        borderColor: hasActiveBill ? "var(--card-border)" : "#ef4444",
                        color: hasActiveBill ? "var(--text-muted)" : "#ef4444",
                        borderRadius: 8,
                        padding: "5px 10px",
                        cursor: hasActiveBill ? "not-allowed" : "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        opacity: hasActiveBill ? 0.4 : 1,
                        transition: "0.15s",
                        flexShrink: 0,
                      }}
                      onClick={async () => {
                        if (!confirm(`Delete ${spot.label}? This cannot be undone.`)) return;
                        await deleteSpot({ spotId: spot.id });
                        window.location.reload();
                      }}
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Settings: Staff Management */}
      {activeTab === "settings" && (
        <div className={styles.settingsCard} style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <h3 style={{ color: "var(--foreground)", margin: 0 }}>{terms.staffPlural} Management</h3>
            <button className={styles.primaryBtn} style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={() => setAddModalOpen(true)}>
              <Plus size={14} /> Add {terms.staff}
            </button>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "20px" }}>
            Manage team members linked to this business. You can change their role or remove them at any time.
          </p>

          {waiters.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>
              <Users size={36} style={{ opacity: 0.3, marginBottom: "10px" }} />
              <p style={{ fontSize: "0.9rem" }}>No staff members yet. Add your first {terms.staff.toLowerCase()}.</p>
            </div>
          ) : (
            <table className={styles.staffTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Tips Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waiters.map((w) => {
                  const currentRole = editingRoles[w.id] ?? w.role;
                  const isDirty = currentRole !== w.role;
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className={styles.staffInfo}>
                          <img src={w.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"} alt={w.name} className={styles.staffAvatar} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{w.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{w.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          value={currentRole}
                          onChange={(e) => setEditingRoles((prev) => ({ ...prev, [w.id]: e.target.value }))}
                          style={{ fontSize: "0.82rem", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--card-border)", background: "var(--input-bg)", color: "var(--foreground)", cursor: "pointer" }}
                        >
                          <option value="WAITER">Waiter / Server</option>
                          <option value="BARBER">Barber / Stylist</option>
                          <option value="HOUSEKEEPER">Housekeeper</option>
                          <option value="VALET">Valet Specialist</option>
                          <option value="DRIVER">Courier / Driver</option>
                          <option value="OTHER">Other Specialist</option>
                        </select>
                      </td>
                      <td>{w.balance.toFixed(2)} {restaurant.currency}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          {isDirty && (
                            <button
                              type="button"
                              style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--primary)", background: "rgba(var(--primary-rgb),0.08)", color: "var(--primary)", cursor: "pointer" }}
                              onClick={async () => {
                                await updateMemberRole({ businessId: restaurant.id, individualId: w.id, role: currentRole });
                                setEditingRoles((prev) => { const n = { ...prev }; delete n[w.id]; return n; });
                                window.location.reload();
                              }}
                            >
                              Save
                            </button>
                          )}
                          <button
                            type="button"
                            style={{ fontSize: "0.78rem", fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "rgba(239,68,68,0.06)", color: "#ef4444", cursor: "pointer" }}
                            onClick={async () => {
                              if (!confirm(`Remove ${w.name} from your team?`)) return;
                              await unlinkIndividualFromBusiness({ businessId: restaurant.id, individualId: w.id });
                              window.location.reload();
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal: Add Waiter / Staff */}
      {addModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 440 }}>
            <h3 className={styles.modalTitle}>Add Staff Member</h3>

            {/* Mode Switcher */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
              <button
                type="button"
                onClick={() => { setAddStaffMode("find"); setFindError(""); setFoundIndividual(null); }}
                style={{ padding: "9px", borderRadius: 8, border: `2px solid ${addStaffMode === "find" ? "var(--primary)" : "var(--card-border)"}`, background: addStaffMode === "find" ? "rgba(var(--primary-rgb),0.08)" : "transparent", color: addStaffMode === "find" ? "var(--primary)" : "var(--text-muted)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Find by Email
              </button>
              <button
                type="button"
                onClick={() => { setAddStaffMode("create"); setAddError(""); }}
                style={{ padding: "9px", borderRadius: 8, border: `2px solid ${addStaffMode === "create" ? "var(--primary)" : "var(--card-border)"}`, background: addStaffMode === "create" ? "rgba(var(--primary-rgb),0.08)" : "transparent", color: addStaffMode === "create" ? "var(--primary)" : "var(--text-muted)", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Create New
              </button>
            </div>

            {/* Mode: Find existing individual by email */}
            {addStaffMode === "find" && (
              <div>
                <p className={styles.modalSub}>Search for an existing account and add them to your team.</p>
                {findError && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#ef4444", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "12px", textAlign: "center" }}>{findError}</div>}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                  <input
                    type="email"
                    className={styles.input}
                    value={findEmail}
                    onChange={(e) => { setFindEmail(e.target.value); setFoundIndividual(null); setFindError(""); }}
                    placeholder="staff@example.com"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    style={{ flexShrink: 0 }}
                    disabled={findLoading || !findEmail.trim()}
                    onClick={async () => {
                      setFindLoading(true);
                      setFindError("");
                      setFoundIndividual(null);
                      const res = await findIndividualByEmail(findEmail.trim());
                      setFindLoading(false);
                      if (!res.success || !res.individual) { setFindError(res.error || "Not found"); return; }
                      setFoundIndividual(res.individual as any);
                    }}
                  >
                    {findLoading ? "…" : "Search"}
                  </button>
                </div>

                {foundIndividual && (
                  <div style={{ background: "var(--input-bg)", border: "1.5px solid var(--primary)", borderRadius: 10, padding: "14px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <img src={foundIndividual.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"} alt={foundIndividual.name} style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover" }} />
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--foreground)" }}>{foundIndividual.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{foundIndividual.email}</div>
                      </div>
                    </div>
                    <div className={styles.settingsRow}>
                      <label className={styles.settingsLabel}>Role in your business</label>
                      <select className={styles.select} value={linkRole} onChange={(e) => setLinkRole(e.target.value)}>
                        <option value="WAITER">Waiter / Server</option>
                        <option value="BARBER">Barber / Stylist</option>
                        <option value="HOUSEKEEPER">Housekeeper</option>
                        <option value="VALET">Valet Specialist</option>
                        <option value="DRIVER">Courier / Driver</option>
                        <option value="OTHER">Other specialist</option>
                      </select>
                    </div>
                    <div className={styles.btnGroup}>
                      <button type="button" className={styles.cancelBtn} onClick={() => { setFoundIndividual(null); setFindEmail(""); }}>Cancel</button>
                      <button
                        type="button"
                        className={styles.primaryBtn}
                        style={{ justifyContent: "center" }}
                        onClick={async () => {
                          const res = await linkIndividualToBusiness({ businessId: restaurant.id, individualId: foundIndividual.id, role: linkRole });
                          if (!res.success) { setFindError(res.error || "Failed"); return; }
                          setAddModalOpen(false);
                          setFoundIndividual(null);
                          setFindEmail("");
                          window.location.reload();
                        }}
                      >
                        Add to Team
                      </button>
                    </div>
                  </div>
                )}

                <button type="button" className={styles.cancelBtn} style={{ width: "100%" }} onClick={() => setAddModalOpen(false)}>Close</button>
              </div>
            )}

            {/* Mode: Create new account */}
            {addStaffMode === "create" && (
              <form onSubmit={handleAddWaiter}>
                <p className={styles.modalSub}>Create a new account for a staff member who doesn&apos;t have one yet.</p>
                {addError && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid #ef4444", color: "#fca5a5", padding: "10px", borderRadius: "6px", fontSize: "0.85rem", marginBottom: "16px", textAlign: "center" }}>{addError}</div>}

                <div className={styles.settingsRow}>
                  <label className={styles.settingsLabel}>Full Name</label>
                  <input type="text" className={styles.input} value={waiterName} onChange={(e) => setWaiterName(e.target.value)} placeholder="e.g. John Doe" required />
                </div>
                <div className={styles.settingsRow}>
                  <label className={styles.settingsLabel}>Email Address</label>
                  <input type="email" className={styles.input} value={waiterEmail} onChange={(e) => setWaiterEmail(e.target.value)} placeholder="john@company.com" required />
                </div>
                <div className={styles.settingsRow}>
                  <label className={styles.settingsLabel}>Staff Role</label>
                  <select className={styles.select} value={waiterRole} onChange={(e) => setWaiterRole(e.target.value)}>
                    <option value="WAITER">Waiter / Server</option>
                    <option value="BARBER">Barber / Stylist</option>
                    <option value="HOUSEKEEPER">Housekeeper</option>
                    <option value="VALET">Valet Specialist</option>
                    <option value="DRIVER">Courier / Driver</option>
                    <option value="OTHER">Other specialist</option>
                  </select>
                </div>

                <div className={styles.btnGroup}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setAddModalOpen(false)}>Cancel</button>
                  <button type="submit" className={styles.primaryBtn} style={{ justifyContent: "center" }}>Add {terms.staff}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Withdraw Corporate Funds */}
      {withdrawModalOpen && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleWithdrawRestaurant} className={styles.modal} style={{ maxWidth: 400 }}>
            <h3 className={styles.modalTitle}>Withdraw Company Funds</h3>
            <p className={styles.modalSub}>Transfer your food/service sales balance directly to your company bank account.</p>

            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>Withdrawal Amount</label>
              <input type="number" className={styles.input} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} max={restaurant.balance} min="1" required />
            </div>

            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>Payout Method</label>
              <select className={styles.select} value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                <option value="BANK_TRANSFER">Bank Transfer (IBAN)</option>
                <option value="VODAFONE_CASH">Vodafone Corporate Wallet</option>
              </select>
            </div>

            <div className={styles.settingsRow}>
              <label className={styles.settingsLabel}>IBAN / Phone number</label>
              <input type="text" className={styles.input} value={withdrawDetail} onChange={(e) => setWithdrawDetail(e.target.value)} placeholder="EG12345..." required />
            </div>

            <div className={styles.btnGroup}>
              <button type="button" className={styles.cancelBtn} onClick={() => setWithdrawModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className={styles.primaryBtn} style={{ justifyContent: "center" }} disabled={withdrawLoading}>
                {withdrawLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}




      {/* Modal: New Staff Credentials — shown once after creation */}

      {newCredentials && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 420 }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>
              <h3 className={styles.modalTitle}>Account Created!</h3>
              <p className={styles.modalSub}>
                Share these login credentials with <strong>{newCredentials.name}</strong>. The password is shown only once.
              </p>
            </div>

            <div style={{ background: "var(--input-bg)", border: "1.5px solid var(--primary)", borderRadius: 10, padding: "16px", marginBottom: "20px" }}>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Login URL</div>
                <div style={{ fontSize: "0.85rem", color: "var(--foreground)", fontFamily: "monospace" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/individual/login` : "/individual/login"}
                </div>
              </div>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Email</div>
                <div style={{ fontSize: "0.9rem", color: "var(--foreground)", fontFamily: "monospace", fontWeight: 600 }}>{newCredentials.email}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Temporary Password</div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontSize: "1.2rem", color: "var(--primary)", fontFamily: "monospace", fontWeight: 800, letterSpacing: "0.1em", flex: 1 }}>
                    {newCredentials.password}
                  </div>
                  <button
                    type="button"
                    style={{ background: "none", border: "1px solid var(--primary)", color: "var(--primary)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      const text = `Login: ${typeof window !== "undefined" ? window.location.origin : ""}/individual/login\nEmail: ${newCredentials.email}\nPassword: ${newCredentials.password}`;
                      navigator.clipboard.writeText(text);
                      setCredCopied(true);
                      setTimeout(() => setCredCopied(false), 2500);
                    }}
                  >
                    {credCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy All</>}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: "20px", fontSize: "0.8rem", color: "#ef4444" }}>
              ⚠️ This password will not be shown again. Copy it before closing.
            </div>

            <button
              type="button"
              className={styles.primaryBtn}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                setNewCredentials(null);
                window.location.reload();
              }}
            >
              Done — Close
            </button>
          </div>
        </div>
      )}

      {/* Portal: Assign popover rendered at fixed screen coords */}
      {openAssignSpot && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 999 }}
            onClick={() => setOpenAssignSpot(null)}
          />
          {/* Floating menu */}
          <div
            style={{
              position: "fixed",
              top: openAssignSpot.top,
              left: openAssignSpot.left,
              width: openAssignSpot.width,
              zIndex: 1000,
              background: "var(--card-bg)",
              border: "1.5px solid var(--primary)",
              borderRadius: 10,
              padding: "8px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={styles.spotAssignOption}
              onClick={async () => {
                await assignIndividualToSpot({ spotId: openAssignSpot.id, individualId: null });
                setOpenAssignSpot(null);
              }}
            >
              <span>Unassigned</span>
            </div>
            {waiters.map((w) => (
              <div
                key={w.id}
                className={styles.spotAssignOption}
                onClick={async () => {
                  await assignIndividualToSpot({ spotId: openAssignSpot.id, individualId: w.id });
                  setOpenAssignSpot(null);
                }}
              >
                <img
                  src={w.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"}
                  alt={w.name}
                  className={styles.spotAssignOptionAvatar}
                />
                <span>{w.name}</span>
              </div>
            ))}
          </div>
        </>,
        document.body
      )}

    </div>
  );
}

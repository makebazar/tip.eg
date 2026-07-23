import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminDashboardClient from "@/components/AdminDashboardClient";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;

  if (adminSession !== "super-admin") {
    redirect("/admin/login");
  }

  // Fetch businesses
  const businesses = db.prepare("SELECT * FROM businesses").all() as any[];

  // Fetch payouts list
  const payouts = db.prepare(`
    SELECT 
      po.id, po.amount, po.payout_method, po.destination_detail, po.status, po.created_at,
      u.name as waiter_name,
      r.name as restaurant_name
    FROM payout_requests po
    LEFT JOIN individual_profiles wp ON wp.id = po.individual_id
    LEFT JOIN users u ON u.id = wp.user_id
    LEFT JOIN businesses r ON r.id = po.business_id
    ORDER BY po.created_at DESC
  `).all() as any[];

  // Statistics calculation
  const totalVolumeRow = db.prepare(`
    SELECT SUM(amount_bill + amount_tip) as total_volume 
    FROM transactions 
    WHERE payment_status = 'COMPLETED'
  `).get() as any;

  const totalTipsRow = db.prepare(`
    SELECT SUM(amount_tip) as total_tips 
    FROM transactions 
    WHERE payment_status = 'COMPLETED'
  `).get() as any;

  const totalWaitersRow = db.prepare("SELECT COUNT(*) as total_waiters FROM individual_profiles").get() as any;

  const stats = {
    totalVolume: totalVolumeRow?.total_volume || 0,
    platformCommission: (totalTipsRow?.total_tips || 0) * 0.05, // 5% fee model
    totalRestaurants: businesses.length,
    totalWaiters: totalWaitersRow?.total_waiters || 0,
  };

  return (
    <main style={{ minHeight: "100vh", padding: "20px 0" }}>
      <AdminDashboardClient
        restaurants={businesses}
        payouts={payouts}
        stats={stats}
      />
    </main>
  );
}

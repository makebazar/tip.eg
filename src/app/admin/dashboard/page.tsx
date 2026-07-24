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

  // 1. Fetch businesses with counts & owner details
  const businesses = await db.all(`
    SELECT 
      b.*,
      (SELECT COUNT(*) FROM spots s WHERE s.business_id = b.id) as spots_count,
      (SELECT COUNT(*) FROM business_members bm WHERE bm.business_id = b.id AND bm.status = 'ACTIVE') as staff_count,
      (SELECT u.email FROM users u WHERE u.id = b.owner_id) as owner_email,
      (SELECT u.name FROM users u WHERE u.id = b.owner_id) as owner_name
    FROM businesses b
    ORDER BY b.created_at DESC
  `);

  // 2. Fetch staff specialists list
  const staff = await db.all(`
    SELECT 
      ip.id, ip.role, ip.balance, ip.rating, ip.short_code, ip.payout_method, ip.payout_detail, ip.avatar_url, ip.created_at,
      u.name, u.email,
      b.name as business_name, b.id as business_id
    FROM individual_profiles ip
    JOIN users u ON u.id = ip.user_id
    LEFT JOIN business_members bm ON bm.individual_id = ip.id AND bm.status = 'ACTIVE'
    LEFT JOIN businesses b ON b.id = bm.business_id
    ORDER BY ip.created_at DESC
  `);

  // 3. Fetch payout requests
  const payouts = await db.all(`
    SELECT 
      po.id, po.individual_id, po.business_id, po.amount, po.payout_method, po.destination_detail, po.status, po.created_at,
      u.name as waiter_name,
      b.name as restaurant_name
    FROM payout_requests po
    LEFT JOIN individual_profiles wp ON wp.id = po.individual_id
    LEFT JOIN users u ON u.id = wp.user_id
    LEFT JOIN businesses b ON b.id = po.business_id
    ORDER BY po.created_at DESC
  `);

  // 4. Fetch recent transactions
  const transactions = await db.all(`
    SELECT 
      t.id, t.amount_bill, t.amount_tip, t.currency, t.payment_status, t.created_at,
      b.name as business_name,
      u.name as waiter_name
    FROM transactions t
    LEFT JOIN bills bill ON bill.id = t.bill_id
    LEFT JOIN businesses b ON b.id = bill.business_id
    LEFT JOIN individual_profiles ip ON ip.id = t.individual_id
    LEFT JOIN users u ON u.id = ip.user_id
    ORDER BY t.created_at DESC
    LIMIT 100
  `);

  // 5. Fetch Platform Settings
  const settingsRows = await db.all<{ key: string; value: string }>("SELECT key, value FROM platform_settings");
  const settingsMap: Record<string, string> = {};
  for (const s of settingsRows) {
    settingsMap[s.key] = s.value;
  }

  const transactionFeePercent = parseFloat(settingsMap["transaction_fee_percent"] || settingsMap["commission_rate"] || "5.0");
  const tipPayoutFeePercent = parseFloat(settingsMap["tip_payout_fee_percent"] || "2.0");
  const businessPayoutFeePercent = parseFloat(settingsMap["business_payout_fee_percent"] || "2.5");
  const usdRate = parseFloat(settingsMap["usd_rate"] || "50.0");
  const eurRate = parseFloat(settingsMap["eur_rate"] || "55.0");

  // 6. Aggregated Statistics
  const totalVolumeRow = await db.get<any>(`
    SELECT SUM(amount_bill + amount_tip) as total_volume 
    FROM transactions 
    WHERE payment_status = 'COMPLETED'
  `);

  const totalTipsRow = await db.get<any>(`
    SELECT SUM(amount_tip) as total_tips 
    FROM transactions 
    WHERE payment_status = 'COMPLETED'
  `);

  const pendingPayoutsRow = await db.get<any>(`
    SELECT COUNT(*) as count, SUM(amount) as total 
    FROM payout_requests 
    WHERE status = 'PENDING'
  `);

  const payoutFeesRow = await db.get<any>(`
    SELECT SUM(fee_amount) as total_payout_fees 
    FROM payout_requests 
    WHERE status = 'APPROVED' OR status = 'SUCCESS'
  `);

  const totalVolume = parseFloat(totalVolumeRow?.total_volume || "0");
  const totalTips = parseFloat(totalTipsRow?.total_tips || "0");
  const totalPayoutFees = parseFloat(payoutFeesRow?.total_payout_fees || "0");
  const transactionCommission = totalTips * (transactionFeePercent / 100);

  const stats = {
    totalVolume,
    totalTips,
    transactionCommission,
    totalPayoutFees,
    platformCommission: transactionCommission + totalPayoutFees,
    commissionRate: transactionFeePercent,
    transactionFeePercent,
    tipPayoutFeePercent,
    businessPayoutFeePercent,
    usdRate,
    eurRate,
    totalRestaurants: businesses.length,
    totalWaiters: staff.length,
    pendingPayoutsCount: parseInt(pendingPayoutsRow?.count || "0", 10),
    pendingPayoutsAmount: parseFloat(pendingPayoutsRow?.total || "0"),
  };

  return (
    <main className="min-h-screen bg-[#FAF9F5] text-slate-900 pb-16">
      <AdminDashboardClient
        businesses={businesses}
        staff={staff}
        payouts={payouts}
        transactions={transactions}
        stats={stats}
      />
    </main>
  );
}

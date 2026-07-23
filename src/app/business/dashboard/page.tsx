import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BusinessDashboardClient from "@/components/BusinessDashboardClient";

export const revalidate = 0;

export default async function BusinessDashboardPage() {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("business_id")?.value;

  if (!businessId) {
    redirect("/business/login");
  }

  // Fetch business details
  const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId) as any;

  if (!business) {
    cookieStore.delete("business_id");
    redirect("/business/login");
  }

  // Fetch staff members via business_members (global accounts)
  const waiters = db.prepare(`
    SELECT
      ip.id, ip.avatar_url, ip.balance, ip.rating, ip.short_code,
      bm.role,
      u.name, u.email
    FROM business_members bm
    JOIN individual_profiles ip ON ip.id = bm.individual_id
    JOIN users u ON u.id = ip.user_id
    WHERE bm.business_id = ? AND bm.status = 'ACTIVE'
  `).all(businessId) as any[];

  // Fetch bills with spot short codes
  const bills = db.prepare(`
    SELECT b.*, t.short_code as table_short_code FROM bills b
    LEFT JOIN spots t ON t.id = b.spot_id
    WHERE b.business_id = ?
    ORDER BY b.created_at DESC
  `).all(businessId) as any[];

  // Fetch all physical spots for spot management
  const spots = db.prepare(`
    SELECT s.*
    FROM spots s
    WHERE s.business_id = ?
    ORDER BY s.number ASC
  `).all(businessId) as any[];

  // Fetch stats calculations
  const totalTipsRow = db.prepare(`
    SELECT SUM(t.amount_tip) as total_tips 
    FROM transactions t 
    JOIN individual_profiles wp ON wp.id = t.individual_id 
    WHERE wp.business_id = ?
  `).get(businessId) as any;

  const totalBillsPaidRow = db.prepare(`
    SELECT SUM(t.amount_bill) as total_bills 
    FROM transactions t 
    JOIN bills b ON b.id = t.bill_id 
    WHERE b.business_id = ? AND t.payment_status = 'COMPLETED'
  `).get(businessId) as any;

  const stats = {
    totalTips: totalTipsRow?.total_tips || 0,
    avgRating: 5.0, // Hardcoded fallback or omitted
    totalBillsPaid: totalBillsPaidRow?.total_bills || 0,
  };

  // Fetch menu items for Stop List quick management and bill creation
  const menuItems = db.prepare(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `).all(businessId) as any[];

  return (
    <main style={{ minHeight: "100vh", padding: "24px 0" }}>
      <BusinessDashboardClient
        restaurant={business}
        waiters={waiters}
        bills={bills}
        feedbacks={[]}
        spots={spots}
        stats={stats}
        menuItems={menuItems}
      />
    </main>
  );
}

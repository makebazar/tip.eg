import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import WorkspaceClient from "@/components/WorkspaceClient";

export const revalidate = 0;

export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const individualId = cookieStore.get("individual_id")?.value;

  if (!individualId) {
    redirect("/individual/login");
  }

  const { id: workspaceId } = await params;

  // Fetch individual details
  const individual = db.prepare(`
    SELECT
      ip.id, ip.avatar_url, ip.balance, ip.rating, ip.payout_method, ip.payout_detail, ip.role, ip.short_code, ip.business_id,
      u.name
    FROM individual_profiles ip
    JOIN users u ON u.id = ip.user_id
    WHERE ip.id = ?
  `).get(individualId) as any;

  if (!individual) {
    cookieStore.delete("individual_id");
    redirect("/individual/login");
  }

  // Determine if it's personal or business workspace
  const isPersonal = workspaceId === "personal";
  let activeBusiness = null;
  let businesses: any[] = [];

  if (!isPersonal) {
    // Verify they belong to this business
    activeBusiness = db.prepare(`
      SELECT b.id, b.name, b.logo_url, b.currency, b.business_type, bm.role as member_role
      FROM businesses b
      JOIN business_members bm ON b.id = bm.business_id
      WHERE b.id = ? AND bm.individual_id = ? AND bm.status = 'ACTIVE'
    `).get(workspaceId, individualId) as any;

    if (!activeBusiness) {
      redirect("/individual/hub"); // Not authorized for this business
    }
  }

  // Spots for the active business
  const spots = activeBusiness ? db.prepare(`
    SELECT * FROM spots WHERE business_id = ? ORDER BY number ASC
  `).all(activeBusiness.id) as any[] : [];

  // Fetch bills with spot short codes
  const bills = activeBusiness ? db.prepare(`
    SELECT b.*, t.short_code as table_short_code FROM bills b
    LEFT JOIN spots t ON t.id = b.spot_id
    WHERE b.business_id = ?
    ORDER BY b.created_at DESC
  `).all(activeBusiness.id) as any[] : [];

  // Fetch menu items for the active business
  const menuItems = activeBusiness ? db.prepare(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `).all(activeBusiness.id) as any[] : [];

  // Transaction history (filter by business if not personal)
  let transactions;
  if (isPersonal) {
    transactions = db.prepare(`
      SELECT
        t.id, ts.amount as amount_earned, t.currency, t.created_at,
        f.rating_stars, f.comments, f.tags
      FROM tip_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      LEFT JOIN bills b ON b.id = t.bill_id
      LEFT JOIN feedback f ON f.transaction_id = t.id
      WHERE ts.individual_id = ? AND b.business_id IS NULL
      ORDER BY t.created_at DESC
    `).all(individualId) as any[];
  } else {
    transactions = db.prepare(`
      SELECT
        t.id, ts.amount as amount_earned, t.currency, t.created_at,
        f.rating_stars, f.comments, f.tags
      FROM tip_splits ts
      JOIN transactions t ON t.id = ts.transaction_id
      JOIN bills b ON b.id = t.bill_id
      LEFT JOIN feedback f ON f.transaction_id = t.id
      WHERE ts.individual_id = ? AND b.business_id = ?
      ORDER BY t.created_at DESC
    `).all(individualId, activeBusiness.id) as any[];
  }

  // Payout history
  const payouts = db.prepare(`
    SELECT * FROM payout_requests WHERE individual_id = ? ORDER BY created_at DESC
  `).all(individualId) as any[];

  return (
    <main style={{ minHeight: "100vh", padding: "0 0 20px 0" }}>
      <WorkspaceClient
        waiter={{ ...individual, restaurant_name: activeBusiness?.name, currency: activeBusiness?.currency || "AED" }}
        transactions={transactions}
        payouts={payouts}
        spots={spots}
        businesses={businesses} // Empty, since we don't switch businesses from here anymore
        activeBusinessId={activeBusiness?.id || ""}
        bills={bills}
        menuItems={menuItems}
        isPersonal={isPersonal}
      />
    </main>
  );
}

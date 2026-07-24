import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import HubClient from "@/components/HubClient";

export const revalidate = 0;

export default async function IndividualHubPage() {
  const cookieStore = await cookies();
  const individualId = cookieStore.get("individual_id")?.value;

  if (!individualId) {
    redirect("/individual/login");
  }

  // Fetch individual details
  const individual = await db.get(`
    SELECT
      ip.id, ip.avatar_url, ip.balance, ip.rating, ip.payout_method, ip.payout_detail, ip.role, ip.short_code, ip.business_id,
      u.name, u.email
    FROM individual_profiles ip
    JOIN users u ON u.id = ip.user_id
    WHERE ip.id = ?
  `, [individualId]);

  if (!individual) {
    cookieStore.delete("individual_id");
    redirect("/individual/login");
  }

  // Fetch all businesses this individual belongs to
  const memberBusinesses = await db.all(`
    SELECT b.id, b.name, b.logo_url, b.currency, b.business_type, bm.role as member_role
    FROM business_members bm
    JOIN businesses b ON b.id = bm.business_id
    WHERE bm.individual_id = ? AND bm.status = 'ACTIVE'
    ORDER BY bm.joined_at ASC
  `, [individualId]);

  let businesses = memberBusinesses;
  if (memberBusinesses.length === 0 && individual.business_id) {
    const single = await db.get("SELECT id, name, logo_url, currency, business_type FROM businesses WHERE id = ?", [individual.business_id]);
    businesses = single ? [single] : [];
  }

  // Payout history
  const payouts = await db.all(`
    SELECT * FROM payout_requests WHERE individual_id = ? ORDER BY created_at DESC
  `, [individualId]);

  return (
    <main style={{ minHeight: "100vh", padding: "20px 0" }}>
      <HubClient
        individual={individual}
        businesses={businesses}
        payouts={payouts}
      />
    </main>
  );
}

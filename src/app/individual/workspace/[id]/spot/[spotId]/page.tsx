import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SpotOrderClient from "@/components/SpotOrderClient";

export const revalidate = 0;

export default async function SpotOrderPage({ params }: { params: Promise<{ id: string, spotId: string }> }) {
  const cookieStore = await cookies();
  const individualId = cookieStore.get("individual_id")?.value;

  if (!individualId) {
    redirect("/individual/login");
  }

  const { id: workspaceId, spotId } = await params;

  if (workspaceId === "personal") {
    redirect("/individual/hub");
  }

  const activeBusiness = await db.get(`
    SELECT b.id, b.name, b.logo_url, b.currency, b.business_type, bm.role as member_role
    FROM businesses b
    JOIN business_members bm ON b.id = bm.business_id
    WHERE b.id = ? AND bm.individual_id = ? AND bm.status = 'ACTIVE'
  `, [workspaceId, individualId]);

  if (!activeBusiness) {
    redirect("/individual/hub");
  }

  const spot = await db.get(`
    SELECT * FROM spots WHERE id = ? AND business_id = ?
  `, [spotId, activeBusiness.id]);

  if (!spot) {
    redirect(`/individual/workspace/${workspaceId}`);
  }

  const individual = await db.get(`
    SELECT ip.id
    FROM individual_profiles ip
    WHERE ip.id = ?
  `, [individualId]);

  const bill = await db.get(`
    SELECT b.*, t.short_code as table_short_code 
    FROM bills b
    LEFT JOIN spots t ON t.id = b.spot_id
    WHERE b.spot_id = ? AND b.status = 'UNPAID'
  `, [spot.id]);

  const menuItems = await db.all(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `, [activeBusiness.id]);

  const rawSpots = await db.all<any>(`
    SELECT s.id, s.label, s.assigned_individual_id, 
           (SELECT count(*) FROM bills b WHERE b.spot_id = s.id AND b.status = 'UNPAID') as has_active_bill 
    FROM spots s 
    WHERE s.business_id = ?
    ORDER BY s.label ASC
  `, [activeBusiness.id]);

  const allSpots = rawSpots.map(s => ({
    ...s,
    has_active_bill: parseInt(s.has_active_bill || "0", 10)
  }));

  return (
    <SpotOrderClient
      waiter={{ ...individual, currency: activeBusiness.currency || "AED" }}
      spot={spot}
      activeBill={bill || null}
      menuItems={menuItems}
      workspaceId={workspaceId}
      allSpots={allSpots}
    />
  );
}

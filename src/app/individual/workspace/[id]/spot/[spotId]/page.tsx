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

  // Personal workspace doesn't have spots
  if (workspaceId === "personal") {
    redirect("/individual/hub");
  }

  // Verify they belong to this business
  const activeBusiness = db.prepare(`
    SELECT b.id, b.name, b.logo_url, b.currency, b.business_type, bm.role as member_role
    FROM businesses b
    JOIN business_members bm ON b.id = bm.business_id
    WHERE b.id = ? AND bm.individual_id = ? AND bm.status = 'ACTIVE'
  `).get(workspaceId, individualId) as any;

  if (!activeBusiness) {
    redirect("/individual/hub"); // Not authorized for this business
  }

  // Get the spot
  const spot = db.prepare(`
    SELECT * FROM spots WHERE id = ? AND business_id = ?
  `).get(spotId, activeBusiness.id) as any;

  if (!spot) {
    redirect(`/individual/workspace/${workspaceId}`); // Spot not found
  }

  // Waiter profile info needed for currency, id, etc.
  const individual = db.prepare(`
    SELECT ip.id
    FROM individual_profiles ip
    WHERE ip.id = ?
  `).get(individualId) as any;

  // Fetch the active bill for this spot
  const bill = db.prepare(`
    SELECT b.*, t.short_code as table_short_code 
    FROM bills b
    LEFT JOIN spots t ON t.id = b.spot_id
    WHERE b.spot_id = ? AND b.status = 'UNPAID'
  `).get(spot.id) as any;

  // Fetch menu items for the active business
  const menuItems = db.prepare(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `).all(activeBusiness.id) as any[];

  // Fetch all spots for the transfer modal
  const allSpots = db.prepare(`
    SELECT s.id, s.label, s.assigned_individual_id, 
           (SELECT count(*) FROM bills b WHERE b.spot_id = s.id AND b.status = 'UNPAID') as has_active_bill 
    FROM spots s 
    WHERE s.business_id = ?
    ORDER BY s.label ASC
  `).all(activeBusiness.id) as any[];

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

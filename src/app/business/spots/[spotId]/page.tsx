import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SpotOrderClient from "@/components/SpotOrderClient";
import { SystemRole } from "@/lib/roles";

export const revalidate = 0;

export default async function BusinessSpotOrderPage({ params }: { params: Promise<{ spotId: string }> }) {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("business_id")?.value;

  if (!businessId) {
    redirect("/business/login");
  }

  const { spotId } = await params;

  // 1. Fetch Manager
  const managerUser = await db.get<any>(`
    SELECT id, name, email, role_id, business_id 
    FROM users 
    WHERE business_id = ? AND role_id = ? 
    LIMIT 1
  `, [businessId, SystemRole.BUSINESS_MANAGER]);

  if (!managerUser) {
    cookieStore.delete("business_id");
    redirect("/business/login");
  }

  // 2. Fetch Spot
  const spot = await db.get(`SELECT * FROM spots WHERE id = ? AND business_id = ?`, [spotId, businessId]);
  if (!spot) {
    redirect("/business/dashboard");
  }

  // 3. Fetch Active Bill
  const activeBill = await db.get(`SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID'`, [spotId]);

  // 4. Fetch Menu Items
  const menuItems = await db.all(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `, [businessId]);

  const business = await db.get<any>(`SELECT currency FROM businesses WHERE id = ?`, [businessId]);
  managerUser.currency = business?.currency || "EGP";

  return (
    <SpotOrderClient
      waiter={managerUser}
      spot={spot}
      activeBill={activeBill || null}
      menuItems={menuItems}
      workspaceId="manager-override" 
      backUrl="/business/dashboard"
    />
  );
}

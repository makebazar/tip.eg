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
  const managerUser = db.prepare(`
    SELECT id, name, email, role_id, business_id 
    FROM users 
    WHERE business_id = ? AND role_id = ? 
    LIMIT 1
  `).get(businessId, SystemRole.BUSINESS_MANAGER) as any;

  if (!managerUser) {
    cookieStore.delete("business_id");
    redirect("/business/login");
  }

  // 2. Fetch Spot
  const spot = db.prepare(`SELECT * FROM spots WHERE id = ? AND business_id = ?`).get(spotId, businessId) as any;
  if (!spot) {
    redirect("/business/dashboard");
  }

  // 3. Fetch Active Bill
  const activeBill = db.prepare(`SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID'`).get(spotId) as any;

  // 4. Fetch Menu Items (for adding to cart)
  const menuItems = db.prepare(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `).all(businessId) as any[];

  // Also include the business currency inside the managerUser to satisfy SpotOrderClient's requirements
  const business = db.prepare(`SELECT currency FROM businesses WHERE id = ?`).get(businessId) as any;
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

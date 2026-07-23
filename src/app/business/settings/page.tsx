import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import BusinessSettingsClient from "@/components/BusinessSettingsClient";
import { getAdminPromotions } from "@/app/actions/promotions";
import { SystemRole } from "@/lib/roles";

export const revalidate = 0;

export default async function BusinessSettingsPage() {
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

  // Fetch staff members
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

  // Fetch physical spots
  const spots = db.prepare(`
    SELECT s.* FROM spots s WHERE s.business_id = ? ORDER BY s.number ASC
  `).all(businessId) as any[];

  // Fetch menu categories
  const categories = db.prepare(`
    SELECT * FROM menu_categories WHERE business_id = ? ORDER BY sort_order ASC, name ASC
  `).all(businessId) as any[];

  // Fetch menu items
  const menuItems = db.prepare(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `).all(businessId) as any[];

  // Fetch manager user details
  const managerUser = db.prepare(`
    SELECT id, name, email, role_id FROM users WHERE business_id = ? AND role_id = ? LIMIT 1
  `).get(businessId, SystemRole.BUSINESS_MANAGER) as { id: string; name: string; email: string; role_id: number } | undefined;

  const resPromotions = await getAdminPromotions(businessId);
  const promotions = resPromotions.promotions || [];

  return (
    <main style={{ minHeight: "100vh", padding: "24px 0" }}>
      <BusinessSettingsClient
        restaurant={business}
        waiters={waiters}
        spots={spots}
        categories={categories}
        menuItems={menuItems}
        managerUser={managerUser || null}
        promotions={promotions}
      />
    </main>
  );

}

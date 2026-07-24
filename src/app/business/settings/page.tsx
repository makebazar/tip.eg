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
  const business = await db.get("SELECT * FROM businesses WHERE id = ?", [businessId]);

  if (!business) {
    cookieStore.delete("business_id");
    redirect("/business/login");
  }

  // Fetch staff members
  const waiters = await db.all(`
    SELECT
      ip.id, ip.avatar_url, ip.balance, ip.rating, ip.short_code,
      bm.role,
      u.name, u.email
    FROM business_members bm
    JOIN individual_profiles ip ON ip.id = bm.individual_id
    JOIN users u ON u.id = ip.user_id
    WHERE bm.business_id = ? AND bm.status = 'ACTIVE'
  `, [businessId]);

  // Fetch physical spots
  const spots = await db.all(`
    SELECT s.* FROM spots s WHERE s.business_id = ? ORDER BY s.number ASC
  `, [businessId]);

  // Fetch menu categories
  const categories = await db.all(`
    SELECT * FROM menu_categories WHERE business_id = ? ORDER BY sort_order ASC, name ASC
  `, [businessId]);

  // Fetch menu items
  const menuItems = await db.all(`
    SELECT mi.*, mc.name as category_name
    FROM menu_items mi
    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
    WHERE mi.business_id = ?
    ORDER BY mi.created_at DESC
  `, [businessId]);

  // Fetch manager user details
  const managerUser = await db.get<{ id: string; name: string; email: string; role_id: number }>(`
    SELECT id, name, email, role_id FROM users WHERE business_id = ? AND role_id = ? LIMIT 1
  `, [businessId, SystemRole.BUSINESS_MANAGER]);

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

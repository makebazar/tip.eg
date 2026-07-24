"use server";

import db from "@/lib/db";

export async function getBusinessMenu(businessId: string) {
  try {
    const categories = await db.all(`
      SELECT * FROM menu_categories WHERE business_id = ? ORDER BY sort_order ASC, name ASC
    `, [businessId]);

    const items = await db.all(`
      SELECT mi.*, mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE mi.business_id = ?
      ORDER BY mi.created_at DESC
    `, [businessId]);

    const nowIso = new Date().toISOString();

    const promotions = await db.all(`
      SELECT p.*, mi.name as item_name, mi.price as item_original_price
      FROM promotions p
      LEFT JOIN menu_items mi ON (
        mi.id = p.item_id 
        OR mi.id = REPLACE(p.item_id, 'item-rest-', 'item-')
        OR mi.id = 'item-rest-' || REPLACE(REPLACE(p.item_id, 'item-rest-', ''), 'item-', '')
      )
      WHERE p.business_id = ? 
        AND (p.status = 'ACTIVE' OR p.status IS NULL)
        AND (p.active_from IS NULL OR p.active_from = '' OR p.active_from <= ? OR p.active_from <= CURRENT_TIMESTAMP)
        AND (p.active_to IS NULL OR p.active_to = '' OR p.active_to >= ? OR p.active_to >= CURRENT_TIMESTAMP)
      ORDER BY p.created_at DESC
    `, [businessId, nowIso, nowIso]);

    return { success: true, categories, items, promotions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load menu";
    console.error("Get business menu error:", error);
    return { success: false, error: message };
  }
}

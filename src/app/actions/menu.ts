"use server";

import db from "@/lib/db";

export async function getBusinessMenu(businessId: string) {
  try {
    const categories = db.prepare(`
      SELECT * FROM menu_categories WHERE business_id = ? ORDER BY sort_order ASC, name ASC
    `).all(businessId) as any[];

    const items = db.prepare(`
      SELECT mi.*, mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mc.id = mi.category_id
      WHERE mi.business_id = ?
      ORDER BY mi.created_at DESC
    `).all(businessId) as any[];

    const nowIso = new Date().toISOString();

    const promotions = db.prepare(`
      SELECT p.*, mi.name as item_name, mi.price as item_original_price
      FROM promotions p
      LEFT JOIN menu_items mi ON mi.id = p.item_id
      WHERE p.business_id = ? 
        AND (p.status = 'ACTIVE' OR p.status IS NULL)
        AND (p.active_from IS NULL OR p.active_from = '' OR p.active_from <= ?)
        AND (p.active_to IS NULL OR p.active_to = '' OR p.active_to >= ?)
      ORDER BY p.created_at DESC
    `).all(businessId, nowIso, nowIso) as any[];

    return { success: true, categories, items, promotions };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load menu";
    console.error("Get business menu error:", error);
    return { success: false, error: message };
  }
}

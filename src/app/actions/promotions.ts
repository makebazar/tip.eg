"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export interface Promotion {
  id: string;
  business_id: string;
  type: "BANNER" | "ITEM_DISCOUNT" | "COMBO";
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  image_url?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  item_original_price?: number | null;
  discount_price?: number | null;
  active_from?: string | null;
  active_to?: string | null;
  status: "ACTIVE" | "INACTIVE";
  effective_status?: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE";
  created_at: string;
}

export interface MenuItemSimple {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
}

export interface SavePromotionInput {
  id?: string | null;
  type: "BANNER" | "ITEM_DISCOUNT" | "COMBO";
  title: string;
  title_ar?: string | null;
  description?: string | null;
  description_ar?: string | null;
  image_url?: string | null;
  item_id?: string | null;
  discount_price?: number | null;
  active_from?: string | null;
  active_to?: string | null;
  status?: "ACTIVE" | "INACTIVE";
}

async function getAuthenticatedBusinessId(providedId?: string): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionBizId = cookieStore.get("business_id")?.value;
  if (sessionBizId) return sessionBizId;
  if (providedId) return providedId;
  return null;
}

export async function getAdminPromotions(businessIdInput?: string) {
  try {
    const bizId = await getAuthenticatedBusinessId(businessIdInput);
    if (!bizId) {
      return { success: false, error: "Authentication required", promotions: [], menuItems: [] };
    }

    const rawPromos = db.prepare(`
      SELECT p.*, mi.name as item_name, mi.price as item_original_price
      FROM promotions p
      LEFT JOIN menu_items mi ON mi.id = p.item_id
      WHERE p.business_id = ?
      ORDER BY p.created_at DESC
    `).all(bizId) as Promotion[];

    const nowIso = new Date().toISOString();

    const promotions: Promotion[] = rawPromos.map((p) => {
      let effectiveStatus: "ACTIVE" | "SCHEDULED" | "EXPIRED" | "INACTIVE" = "INACTIVE";

      if (p.status === "INACTIVE") {
        effectiveStatus = "INACTIVE";
      } else if (p.active_from && p.active_from > nowIso) {
        effectiveStatus = "SCHEDULED";
      } else if (p.active_to && p.active_to < nowIso) {
        effectiveStatus = "EXPIRED";
      } else {
        effectiveStatus = "ACTIVE";
      }

      return {
        ...p,
        effective_status: effectiveStatus,
      };
    });

    const menuItems = db.prepare(`
      SELECT id, name, price, image_url 
      FROM menu_items 
      WHERE business_id = ? AND is_available = 1
      ORDER BY name ASC
    `).all(bizId) as MenuItemSimple[];

    return { success: true, promotions, menuItems };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load promotions";
    console.error("Get admin promotions error:", error);
    return { success: false, error: message, promotions: [], menuItems: [] };
  }
}

export async function savePromotion(data: SavePromotionInput) {
  try {
    const bizId = await getAuthenticatedBusinessId();
    if (!bizId) {
      return { success: false, error: "Not authenticated as a business manager" };
    }

    if (!data.title || !data.title.trim()) {
      return { success: false, error: "Title (EN) is required" };
    }

    if (data.type === "ITEM_DISCOUNT" && (!data.item_id || !data.discount_price)) {
      return { success: false, error: "Item discount promotion requires selecting an item and entering a promo price" };
    }

    const isUpdate = !!data.id;
    const id = data.id || `promo-${Date.now()}`;
    const status = data.status || "ACTIVE";

    if (isUpdate) {
      db.prepare(`
        UPDATE promotions 
        SET type = ?, title = ?, title_ar = ?, description = ?, description_ar = ?, 
            image_url = ?, item_id = ?, discount_price = ?, active_from = ?, active_to = ?, status = ?
        WHERE id = ? AND business_id = ?
      `).run(
        data.type,
        data.title.trim(),
        data.title_ar?.trim() || null,
        data.description?.trim() || null,
        data.description_ar?.trim() || null,
        data.image_url?.trim() || null,
        data.item_id || null,
        data.discount_price ? Number(data.discount_price) : null,
        data.active_from || null,
        data.active_to || null,
        status,
        id,
        bizId
      );
    } else {
      db.prepare(`
        INSERT INTO promotions 
        (id, business_id, type, title, title_ar, description, description_ar, image_url, item_id, discount_price, active_from, active_to, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        bizId,
        data.type,
        data.title.trim(),
        data.title_ar?.trim() || null,
        data.description?.trim() || null,
        data.description_ar?.trim() || null,
        data.image_url?.trim() || null,
        data.item_id || null,
        data.discount_price ? Number(data.discount_price) : null,
        data.active_from || null,
        data.active_to || null,
        status
      );
    }

    revalidatePath("/business/promotions");
    revalidatePath("/business/settings");
    return { success: true, id };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save promotion";
    console.error("Save promotion error:", error);
    return { success: false, error: message };
  }
}

export async function togglePromotionStatus(id: string, newStatus: "ACTIVE" | "INACTIVE") {
  try {
    const bizId = await getAuthenticatedBusinessId();
    if (!bizId) {
      return { success: false, error: "Not authenticated" };
    }

    db.prepare(`
      UPDATE promotions SET status = ? WHERE id = ? AND business_id = ?
    `).run(newStatus, id, bizId);

    revalidatePath("/business/promotions");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update status";
    console.error("Toggle promotion status error:", error);
    return { success: false, error: message };
  }
}

export async function deletePromotion(id: string) {
  try {
    const bizId = await getAuthenticatedBusinessId();
    if (!bizId) {
      return { success: false, error: "Not authenticated" };
    }

    db.prepare(`
      DELETE FROM promotions WHERE id = ? AND business_id = ?
    `).run(id, bizId);

    revalidatePath("/business/promotions");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete promotion";
    console.error("Delete promotion error:", error);
    return { success: false, error: message };
  }
}

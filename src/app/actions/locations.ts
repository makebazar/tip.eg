"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export interface LocationWithStats {
  id: string;
  name: string;
  name_ar?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  currency: string;
  business_type: string;
  address?: string | null;
  city?: string | null;
  payout_method?: string | null;
  payout_detail?: string | null;
  owner_id?: string | null;
  balance: number;
  spots_count: number;
  staff_count: number;
  created_at: string;
  is_active: boolean;
}

export async function getManagerUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get("business_user_id")?.value;
  if (userId) return userId;

  // Fallback: If business_id cookie exists, find owner user_id from user_businesses or users
  const activeBizId = cookieStore.get("business_id")?.value;
  if (activeBizId) {
    const row = db.prepare(`
      SELECT user_id FROM user_businesses WHERE business_id = ?
      LIMIT 1
    `).get(activeBizId) as { user_id: string } | undefined;

    if (row?.user_id) return row.user_id;

    const userRow = db.prepare(`
      SELECT id FROM users WHERE business_id = ? AND role_id = 2
      LIMIT 1
    `).get(activeBizId) as { id: string } | undefined;

    if (userRow?.id) return userRow.id;
  }

  return null;
}

export async function getUserLocations(): Promise<{
  success: boolean;
  locations?: LocationWithStats[];
  activeBusinessId?: string | null;
  user?: { id: string; name: string; email: string };
  error?: string;
}> {
  try {
    const userId = await getManagerUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated as a business manager" };
    }

    const cookieStore = await cookies();
    const activeBusinessId = cookieStore.get("business_id")?.value || null;

    const user = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return { success: false, error: "User account not found" };
    }

    // Fetch all businesses linked to this user via user_businesses or owner_id
    const rows = db.prepare(`
      SELECT DISTINCT b.*
      FROM businesses b
      LEFT JOIN user_businesses ub ON ub.business_id = b.id
      WHERE ub.user_id = ? OR b.owner_id = ? OR (SELECT business_id FROM users WHERE id = ?) = b.id
      ORDER BY b.created_at DESC
    `).all(userId, userId, userId) as any[];

    const locations: LocationWithStats[] = rows.map((b) => {
      const spotsCountRow = db.prepare("SELECT COUNT(*) as c FROM spots WHERE business_id = ?").get(b.id) as { c: number };
      const staffCountRow = db.prepare("SELECT COUNT(*) as c FROM business_members WHERE business_id = ? AND status = 'ACTIVE'").get(b.id) as { c: number };

      return {
        id: b.id,
        name: b.name,
        name_ar: b.name_ar,
        logo_url: b.logo_url,
        cover_url: b.cover_url,
        currency: b.currency || "EGP",
        business_type: b.business_type || "RESTAURANT",
        address: b.address,
        city: b.city,
        payout_method: b.payout_method,
        payout_detail: b.payout_detail,
        owner_id: b.owner_id,
        balance: b.balance || 0,
        spots_count: spotsCountRow?.c || 0,
        staff_count: staffCountRow?.c || 0,
        created_at: b.created_at,
        is_active: b.id === activeBusinessId,
      };
    });

    return {
      success: true,
      locations,
      activeBusinessId,
      user,
    };
  } catch (error: any) {
    console.error("getUserLocations error:", error);
    return { success: false, error: error?.message || "Failed to load locations" };
  }
}

export async function selectActiveLocation(businessId: string) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify access
  const access = db.prepare(`
    SELECT b.id FROM businesses b
    LEFT JOIN user_businesses ub ON ub.business_id = b.id
    WHERE b.id = ? AND (ub.user_id = ? OR b.owner_id = ?)
  `).get(businessId, userId, userId);

  if (!access) {
    return { success: false, error: "Access denied to this business location" };
  }

  const cookieStore = await cookies();
  cookieStore.set("business_id", businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  revalidatePath("/business");
  redirect("/business/dashboard");
}

export async function createLocation(formData: FormData) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const name = (formData.get("name") as string)?.trim();
  const name_ar = (formData.get("name_ar") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const currency = (formData.get("currency") as string) || "EGP";
  const business_type = (formData.get("business_type") as string) || "RESTAURANT";
  const payout_method = (formData.get("payout_method") as string) || null;
  const payout_detail = (formData.get("payout_detail") as string) || null;

  if (!name) {
    return { success: false, error: "Please enter a location name" };
  }

  try {
    const businessId = `biz-${Date.now()}`;
    const ubId = `ub-${userId}-${businessId}`;

    db.transaction(() => {
      // Create business point
      db.prepare(`
        INSERT INTO businesses (id, name, name_ar, city, address, currency, business_type, payout_method, payout_detail, owner_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(businessId, name, name_ar, city, address, currency, business_type, payout_method, payout_detail, userId);

      // Link to user_businesses
      db.prepare(`
        INSERT OR IGNORE INTO user_businesses (id, user_id, business_id, role)
        VALUES (?, ?, ?, 'OWNER')
      `).run(ubId, userId, businessId);

      // Set user.business_id if null
      db.prepare(`
        UPDATE users SET business_id = ? WHERE id = ? AND business_id IS NULL
      `).run(businessId, userId);
    })();

    // Set cookie to newly created location
    const cookieStore = await cookies();
    cookieStore.set("business_id", businessId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    revalidatePath("/business/locations");
    return { success: true, businessId };
  } catch (error: any) {
    console.error("createLocation error:", error);
    return { success: false, error: error?.message || "Failed to create location" };
  }
}

export async function updateLocation(businessId: string, formData: FormData) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const name = (formData.get("name") as string)?.trim();
  const name_ar = (formData.get("name_ar") as string)?.trim() || null;
  const city = (formData.get("city") as string)?.trim() || null;
  const address = (formData.get("address") as string)?.trim() || null;
  const currency = (formData.get("currency") as string) || "EGP";
  const business_type = (formData.get("business_type") as string) || "RESTAURANT";
  const payout_method = (formData.get("payout_method") as string) || null;
  const payout_detail = (formData.get("payout_detail") as string) || null;

  if (!name) {
    return { success: false, error: "Name is required" };
  }

  try {
    db.prepare(`
      UPDATE businesses
      SET name = ?, name_ar = ?, city = ?, address = ?, currency = ?, business_type = ?, payout_method = ?, payout_detail = ?
      WHERE id = ?
    `).run(name, name_ar, city, address, currency, business_type, payout_method, payout_detail, businessId);

    revalidatePath("/business/locations");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update location" };
  }
}

export async function updateLocationPayouts(businessId: string, payoutMethod: string, payoutDetail: string) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    db.prepare(`
      UPDATE businesses
      SET payout_method = ?, payout_detail = ?
      WHERE id = ?
    `).run(payoutMethod, payoutDetail, businessId);

    revalidatePath("/business/locations");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update payout details" };
  }
}

export async function deleteLocation(businessId: string) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    // Check if user has permission
    const access = db.prepare(`
      SELECT b.id FROM businesses b
      LEFT JOIN user_businesses ub ON ub.business_id = b.id
      WHERE b.id = ? AND (ub.user_id = ? OR b.owner_id = ?)
    `).get(businessId, userId, userId);

    if (!access) {
      return { success: false, error: "Access denied" };
    }

    db.transaction(() => {
      db.prepare("DELETE FROM user_businesses WHERE business_id = ?").run(businessId);
      db.prepare("DELETE FROM businesses WHERE id = ?").run(businessId);
    })();

    const cookieStore = await cookies();
    if (cookieStore.get("business_id")?.value === businessId) {
      cookieStore.delete("business_id");
    }

    revalidatePath("/business/locations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete location" };
  }
}

export async function updateOwnerAccount(formData: FormData) {
  const userId = await getManagerUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const name = (formData.get("name") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();

  if (!name) {
    return { success: false, error: "Name is required" };
  }

  try {
    if (password && password.length >= 4) {
      db.prepare("UPDATE users SET name = ?, password_hash = ? WHERE id = ?").run(name, password, userId);
    } else {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, userId);
    }

    revalidatePath("/business/account");
    revalidatePath("/business/locations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update owner profile" };
  }
}

export async function getLocationManagers(businessId: string) {
  const userId = await getManagerUserId();
  if (!userId) return { success: false, managers: [] };

  try {
    const managers = db.prepare(`
      SELECT u.id, u.name, u.email, ub.role, ub.created_at
      FROM user_businesses ub
      JOIN users u ON u.id = ub.user_id
      WHERE ub.business_id = ?
      ORDER BY ub.created_at ASC
    `).all(businessId) as { id: string; name: string; email: string; role: string; created_at: string }[];

    return { success: true, managers };
  } catch (error: any) {
    return { success: false, error: error?.message, managers: [] };
  }
}

export async function addLocationManager(businessId: string, email: string) {
  const userId = await getManagerUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return { success: false, error: "Email is required" };

  try {
    let targetUser = db.prepare("SELECT id, name, email, role_id FROM users WHERE email = ?").get(cleanEmail) as { id: string; name: string; email: string; role_id: number } | undefined;
    let generatedPassword = "";
    let isNewUser = false;

    if (!targetUser) {
      isNewUser = true;
      // Auto-generate a clean 6-digit password
      generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();

      const newUserId = `usr-${Date.now()}`;
      const managerName = cleanEmail.split("@")[0];
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role_id, business_id)
        VALUES (?, ?, ?, ?, 2, ?)
      `).run(newUserId, managerName, cleanEmail, generatedPassword, businessId);

      targetUser = { id: newUserId, name: managerName, email: cleanEmail, role_id: 2 };
    } else {
      // If user exists as individual (role_id = 3), promote to manager (role_id = 2) if needed
      if (targetUser.role_id === 3) {
        db.prepare("UPDATE users SET role_id = 2 WHERE id = ?").run(targetUser.id);
      }
    }

    // Link in user_businesses junction table
    const ubId = `ub-${targetUser.id}-${businessId}`;
    db.prepare(`
      INSERT OR IGNORE INTO user_businesses (id, user_id, business_id, role)
      VALUES (?, ?, ?, 'MANAGER')
    `).run(ubId, targetUser.id, businessId);

    revalidatePath("/business/locations");
    return { 
      success: true, 
      user: targetUser, 
      generatedPassword: generatedPassword || "(Existing Password)",
      isNewUser,
      loginUrl: "/business/login" 
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add location manager" };
  }
}

export async function removeLocationManager(businessId: string, targetUserId: string) {
  const userId = await getManagerUserId();
  if (!userId) return { success: false, error: "Not authenticated" };

  try {
    db.prepare(`
      DELETE FROM user_businesses
      WHERE business_id = ? AND user_id = ?
    `).run(businessId, targetUserId);

    revalidatePath("/business/locations");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to remove manager" };
  }
}


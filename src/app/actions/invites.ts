"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getOrCreateInviteLink(businessId: string, role: "MANAGER" | "STAFF" = "MANAGER") {
  try {
    const existing = db.prepare(`
      SELECT token FROM business_invites
      WHERE business_id = ? AND role = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(businessId, role) as { token: string } | undefined;

    if (existing?.token) {
      return { success: true, token: existing.token };
    }

    const token = `${role.toLowerCase()}-${businessId}-${Math.random().toString(36).substring(2, 9)}`;
    const inviteId = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    db.prepare(`
      INSERT INTO business_invites (id, business_id, role, token)
      VALUES (?, ?, ?, ?)
    `).run(inviteId, businessId, role, token);

    return { success: true, token };
  } catch (error: any) {
    console.error("getOrCreateInviteLink error:", error);
    return { success: false, error: error?.message || "Failed to generate invite link" };
  }
}

export async function regenerateInviteLink(businessId: string, role: "MANAGER" | "STAFF" = "MANAGER") {
  try {
    db.prepare(`
      DELETE FROM business_invites WHERE business_id = ? AND role = ?
    `).run(businessId, role);

    const token = `${role.toLowerCase()}-${businessId}-${Math.random().toString(36).substring(2, 9)}`;
    const inviteId = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    db.prepare(`
      INSERT INTO business_invites (id, business_id, role, token)
      VALUES (?, ?, ?, ?)
    `).run(inviteId, businessId, role, token);

    revalidatePath("/business/locations");
    revalidatePath("/business/dashboard");
    return { success: true, token };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to regenerate invite link" };
  }
}

export async function getInviteDetails(token: string) {
  try {
    const row = db.prepare(`
      SELECT bi.token, bi.role, bi.business_id, b.name as business_name, b.city, b.business_type
      FROM business_invites bi
      JOIN businesses b ON b.id = bi.business_id
      WHERE bi.token = ?
    `).get(token) as {
      token: string;
      role: "MANAGER" | "STAFF";
      business_id: string;
      business_name: string;
      city?: string;
      business_type?: string;
    } | undefined;

    if (!row) {
      return { success: false, error: "Invalid or expired invitation link" };
    }

    const cookieStore = await cookies();
    const currentUserId = cookieStore.get("business_user_id")?.value || null;
    let currentUser = null;

    if (currentUserId) {
      currentUser = db.prepare("SELECT id, name, email FROM users WHERE id = ?").get(currentUserId) as { id: string; name: string; email: string } | undefined;
    }

    return {
      success: true,
      invite: row,
      currentUser
    };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to load invitation details" };
  }
}

export async function acceptInvite(token: string, formData?: FormData) {
  try {
    const inviteRow = db.prepare(`
      SELECT bi.token, bi.role, bi.business_id, b.name as business_name
      FROM business_invites bi
      JOIN businesses b ON b.id = bi.business_id
      WHERE bi.token = ?
    `).get(token) as { token: string; role: string; business_id: string; business_name: string } | undefined;

    if (!inviteRow) {
      return { success: false, error: "Invalid or expired invitation link" };
    }

    const cookieStore = await cookies();
    let userId = cookieStore.get("business_user_id")?.value || null;

    // If user is not logged in, register / log in user from formData
    if (!userId) {
      if (!formData) {
        return { success: false, error: "Please log in or fill out the registration form" };
      }

      const email = (formData.get("email") as string)?.trim().toLowerCase();
      const name = (formData.get("name") as string)?.trim();
      const password = (formData.get("password") as string)?.trim();

      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }

      let existingUser = db.prepare("SELECT id, role_id FROM users WHERE email = ?").get(email) as { id: string; role_id: number } | undefined;

      if (!existingUser) {
        userId = `usr-${Date.now()}`;
        const userName = name || email.split("@")[0];
        const roleId = inviteRow.role === "MANAGER" ? 2 : 3;

        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, role_id, business_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(userId, userName, email, password, roleId, inviteRow.business_id);
      } else {
        userId = existingUser.id;
        // Promote individual staff to manager if joining as manager
        if (inviteRow.role === "MANAGER" && existingUser.role_id === 3) {
          db.prepare("UPDATE users SET role_id = 2 WHERE id = ?").run(userId);
        }
      }

      // Set auth cookies
      cookieStore.set("business_user_id", userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }

    // Link user to business
    if (inviteRow.role === "MANAGER") {
      const ubId = `ub-${userId}-${inviteRow.business_id}`;
      db.prepare(`
        INSERT OR IGNORE INTO user_businesses (id, user_id, business_id, role)
        VALUES (?, ?, ?, 'MANAGER')
      `).run(ubId, userId, inviteRow.business_id);

      db.prepare("UPDATE users SET business_id = ? WHERE id = ? AND business_id IS NULL").run(inviteRow.business_id, userId);
    } else {
      // Staff member linking into business_members and individual_profiles
      const memberId = `bm-${userId}-${inviteRow.business_id}`;
      const indProfileId = `ind-${userId}`;

      db.transaction(() => {
        db.prepare(`
          INSERT OR IGNORE INTO individual_profiles (id, name, business_id, role)
          VALUES (?, (SELECT name FROM users WHERE id = ?), ?, 'WAITER')
        `).run(indProfileId, userId, inviteRow.business_id);

        db.prepare(`
          INSERT OR IGNORE INTO business_members (id, business_id, individual_id, role, status)
          VALUES (?, ?, ?, 'WAITER', 'ACTIVE')
        `).run(memberId, inviteRow.business_id, indProfileId);
      })();
    }

    cookieStore.set("business_id", inviteRow.business_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    const redirectUrl = inviteRow.role === "MANAGER" ? "/business/locations" : "/business/dashboard";
    return { success: true, redirectUrl };
  } catch (error: any) {
    console.error("acceptInvite error:", error);
    return { success: false, error: error?.message || "Failed to accept invitation" };
  }
}

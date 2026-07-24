"use server";

import db from "@/lib/db";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session")?.value;
  return adminSession === "super-admin";
}

// Toggle Business Active / Suspended Status
export async function toggleBusinessActive(data: { businessId: string; isActive: boolean }) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const { businessId, isActive } = data;

  try {
    await db.run("UPDATE businesses SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, businessId]);
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("toggleBusinessActive error:", error);
    return { success: false, error: error?.message || "Failed to update business status" };
  }
}

// Update Custom Platform Commission Rate per Venue
export async function updateBusinessCommission(data: { businessId: string; commissionRate: number }) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const { businessId, commissionRate } = data;

  try {
    await db.run("UPDATE businesses SET platform_commission_rate = ? WHERE id = ?", [commissionRate, businessId]);
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("updateBusinessCommission error:", error);
    return { success: false, error: error?.message || "Failed to update commission" };
  }
}

// Create New Business / Venue by Super Admin
export async function createBusinessByAdmin(formData: FormData) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const name = formData.get("name") as string;
  const businessType = (formData.get("business_type") as string) || "RESTAURANT";
  const address = formData.get("address") as string;
  const city = formData.get("city") as string;
  const ownerName = formData.get("owner_name") as string;
  const ownerEmail = formData.get("owner_email") as string;
  const ownerPassword = formData.get("owner_password") as string;

  if (!name || !ownerName || !ownerEmail || !ownerPassword) {
    return { success: false, error: "Missing required fields" };
  }

  try {
    const businessId = `rest-${Date.now()}`;
    const userId = `user-${Date.now()}`;

    await db.transaction(async (tx) => {
      // 1. Insert Business
      await tx`
        INSERT INTO businesses (id, name, business_type, address, city, currency, balance, is_active, platform_commission_rate)
        VALUES (${businessId}, ${name}, ${businessType}, ${address || null}, ${city || null}, 'EGP', 0.0, 1, 5.0)
      `;

      // 2. Insert User Owner
      await tx`
        INSERT INTO users (id, name, email, password_hash, role_id, business_id)
        VALUES (${userId}, ${ownerName}, ${ownerEmail}, ${ownerPassword}, 2, ${businessId})
      `;

      // 3. Link user to business in user_businesses
      await tx`
        INSERT INTO user_businesses (id, user_id, business_id, role)
        VALUES (${`ub-${userId}-${businessId}`}, ${userId}, ${businessId}, 'OWNER')
        ON CONFLICT DO NOTHING
      `;

      // 4. Update owner_id in businesses
      await tx`UPDATE businesses SET owner_id = ${userId} WHERE id = ${businessId}`;
    });

    revalidatePath("/admin/dashboard");
    return { success: true, businessId };
  } catch (error: any) {
    console.error("createBusinessByAdmin error:", error);
    return { success: false, error: error?.message || "Failed to create business" };
  }
}

// Approve Payout Request
export async function approvePayoutRequest(data: { payoutId: string }) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const { payoutId } = data;

  try {
    const payout = await db.get("SELECT * FROM payout_requests WHERE id = ?", [payoutId]);
    if (!payout) {
      return { success: false, error: "Payout request not found" };
    }

    await db.run("UPDATE payout_requests SET status = 'APPROVED' WHERE id = ?", [payoutId]);
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("approvePayoutRequest error:", error);
    return { success: false, error: error?.message || "Failed to approve payout" };
  }
}

// Reject Payout Request & Refund Balance
export async function rejectPayoutRequest(data: { payoutId: string }) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const { payoutId } = data;

  try {
    const payout = await db.get<any>("SELECT * FROM payout_requests WHERE id = ?", [payoutId]);
    if (!payout) {
      return { success: false, error: "Payout request not found" };
    }

    if (payout.status === "REJECTED") {
      return { success: false, error: "Payout already rejected" };
    }

    await db.transaction(async (tx) => {
      // 1. Mark status REJECTED
      await tx`UPDATE payout_requests SET status = 'REJECTED' WHERE id = ${payoutId}`;

      // 2. Refund balance back if individual or business
      if (payout.individual_id) {
        await tx`UPDATE individual_profiles SET balance = balance + ${payout.amount} WHERE id = ${payout.individual_id}`;
      } else if (payout.business_id) {
        await tx`UPDATE businesses SET balance = balance + ${payout.amount} WHERE id = ${payout.business_id}`;
      }
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("rejectPayoutRequest error:", error);
    return { success: false, error: error?.message || "Failed to reject payout" };
  }
}

// Update Global Platform Settings
export async function updatePlatformSettings(data: {
  transactionFeePercent: number;
  tipPayoutFeePercent: number;
  businessPayoutFeePercent: number;
  usdRate: number;
  eurRate: number;
}) {
  if (!(await verifySuperAdmin())) {
    return { success: false, error: "Unauthorized super admin action" };
  }

  const { transactionFeePercent, tipPayoutFeePercent, businessPayoutFeePercent, usdRate, eurRate } = data;

  try {
    await db.transaction(async (tx) => {
      const upsertSetting = async (key: string, value: string) => {
        await tx`
          INSERT INTO platform_settings (key, value, updated_at)
          VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
        `;
      };

      await upsertSetting("transaction_fee_percent", String(transactionFeePercent));
      await upsertSetting("tip_payout_fee_percent", String(tipPayoutFeePercent));
      await upsertSetting("business_payout_fee_percent", String(businessPayoutFeePercent));
      await upsertSetting("commission_rate", String(transactionFeePercent));
      await upsertSetting("usd_rate", String(usdRate));
      await upsertSetting("eur_rate", String(eurRate));

      // Update USD and EUR rates across all businesses as well
      await tx`UPDATE businesses SET usd_rate = ${usdRate}, eur_rate = ${eurRate}`;
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("updatePlatformSettings error:", error);
    return { success: false, error: error?.message || "Failed to update platform settings" };
  }
}

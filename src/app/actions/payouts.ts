"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function processPayoutRequest(data: {
  individualId: string;
  amount: number;
  payoutMethod: string;
  destinationDetail: string;
}) {
  const { individualId, amount, payoutMethod, destinationDetail } = data;

  try {
    const payoutId = `po-${Date.now()}`;

    // Get individual profile
    const individual = db.prepare("SELECT balance FROM individual_profiles WHERE id = ?").get(individualId) as any;

    if (!individual) {
      return { success: false, error: "Individual profile not found" };
    }

    if (individual.balance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid withdrawal amount" };
    }

    // Start SQL transaction
    const runTransaction = db.transaction(() => {
      // 1. Deduct balance from individual profile
      db.prepare("UPDATE individual_profiles SET balance = balance - ? WHERE id = ?").run(amount, individualId);

      // 2. Insert successful payout request
      db.prepare(`
        INSERT INTO payout_requests (id, individual_id, amount, payout_method, destination_detail, status)
        VALUES (?, ?, ?, ?, ?, 'SUCCESS')
      `).run(payoutId, individualId, amount, payoutMethod, destinationDetail);
    });

    runTransaction();
    revalidatePath("/individual/hub");
    return { success: true, payoutId };
  } catch (error: any) {
    console.error("Payout error:", error);
    return { success: false, error: error?.message || "Payout processing failed" };
  }
}

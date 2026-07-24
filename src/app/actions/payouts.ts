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

    const individual = await db.get<any>("SELECT balance FROM individual_profiles WHERE id = ?", [individualId]);

    if (!individual) {
      return { success: false, error: "Individual profile not found" };
    }

    if (individual.balance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid withdrawal amount" };
    }

    const settingRow = await db.get<any>("SELECT value FROM platform_settings WHERE key = 'tip_payout_fee_percent'");
    const feePercent = parseFloat(settingRow?.value || "2.0");
    const feeAmount = (amount * feePercent) / 100;
    const netAmount = amount - feeAmount;

    await db.transaction(async (tx) => {
      await tx`UPDATE individual_profiles SET balance = balance - ${amount} WHERE id = ${individualId}`;
      await tx`
        INSERT INTO payout_requests (id, individual_id, amount, fee_amount, net_amount, payout_method, destination_detail, status)
        VALUES (${payoutId}, ${individualId}, ${amount}, ${feeAmount}, ${netAmount}, ${payoutMethod}, ${destinationDetail}, 'PENDING')
      `;
    });

    revalidatePath("/individual/hub");
    return { success: true, payoutId };
  } catch (error: any) {
    console.error("Payout error:", error);
    return { success: false, error: error?.message || "Payout processing failed" };
  }
}

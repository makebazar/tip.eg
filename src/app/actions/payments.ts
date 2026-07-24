"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function processMockPayment(data: {
  waiterId: string;
  businessId?: string;
  billId: string | null;
  amountBill: number;
  amountTip: number;
  amountTipWaiter?: number;
  amountTipBartender?: number;
  amountTipKitchen?: number;
  ratingStars: number;
  comments: string;
  tags: string[];
}) {
  const { waiterId: individualId, businessId: propBusinessId, billId, amountBill, amountTip, amountTipWaiter = 0, amountTipBartender = 0, amountTipKitchen = 0, ratingStars, comments, tags } = data as any;

  try {
    const transactionId = `tx-${Date.now()}`;
    const feedbackId = `fb-${Date.now()}`;

    let individual: any = null;
    let businessId = propBusinessId || null;

    if (individualId === "common-pool") {
      individual = {
        id: "common-pool",
        restaurant_id: businessId,
        tip_distribution_mode: "COMMON_POOL",
        individual_percentage: 0
      };
    } else {
      individual = await db.get(`
        SELECT wp.id, wp.business_id as restaurant_id, r.tip_distribution_mode, r.individual_percentage
        FROM individual_profiles wp
        LEFT JOIN businesses r ON r.id = wp.business_id
        WHERE wp.id = ?
      `, [individualId]);

      if (individual) {
        businessId = individual.restaurant_id;
      }
    }

    if (!individual) {
      return { success: false, error: "Individual profile not found" };
    }

    await db.transaction(async (tx) => {
      // 1. Insert Transaction record
      await tx`
        INSERT INTO transactions (id, bill_id, individual_id, amount_bill, amount_tip, payment_status, payment_intent_id)
        VALUES (${transactionId}, ${billId}, ${individualId === "common-pool" ? null : individualId}, ${amountBill}, ${amountTip}, 'COMPLETED', ${`mock-pi-${Date.now()}`})
      `;

      // 2. Insert Feedback record
      await tx`
        INSERT INTO feedback (id, transaction_id, rating_stars, comments, tags)
        VALUES (${feedbackId}, ${transactionId}, ${ratingStars}, ${comments}, ${tags.join(",")})
      `;

      // 3. Update Bill status if it is linked
      if (billId) {
        await tx`UPDATE bills SET status = 'PAID' WHERE id = ${billId}`;
        
        if (businessId) {
          await tx`
            UPDATE businesses 
            SET balance = balance + ${amountBill} 
            WHERE id = ${businessId}
          `;
        }
      }

      // 4. Distribute Tips
      if (amountTip > 0) {
        const mode = individual.tip_distribution_mode || "INDIVIDUAL";

        if (individualId === "common-pool") {
          await tx`
            UPDATE businesses 
            SET balance = balance + ${amountTip} 
            WHERE id = ${businessId}
          `;

          await tx`
            INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
            VALUES (${`split-${Date.now()}-common`}, ${transactionId}, NULL, ${amountTip})
          `;
        } else if (amountTipWaiter > 0 || amountTipBartender > 0 || amountTipKitchen > 0) {
          if (amountTipWaiter > 0) {
            await tx`
              UPDATE individual_profiles 
              SET balance = balance + ${amountTipWaiter}
              WHERE id = ${individualId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-waiter`}, ${transactionId}, ${individualId}, ${amountTipWaiter})
            `;
          }

          if (amountTipBartender > 0 && businessId) {
            const bartenderId = `bartender-rest-${businessId}`;
            await tx`
              UPDATE individual_profiles 
              SET balance = balance + ${amountTipBartender}
              WHERE id = ${bartenderId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-bartender`}, ${transactionId}, ${bartenderId}, ${amountTipBartender})
            `;
          }

          if (amountTipKitchen > 0 && businessId) {
            const kitchenId = `kitchen-rest-${businessId}`;
            await tx`
              UPDATE individual_profiles 
              SET balance = balance + ${amountTipKitchen}
              WHERE id = ${kitchenId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-kitchen`}, ${transactionId}, ${kitchenId}, ${amountTipKitchen})
            `;
          }
        } else {
          if (!businessId || mode === "INDIVIDUAL") {
            await tx`
              UPDATE individual_profiles 
              SET balance = balance + ${amountTip}
              WHERE id = ${individualId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-1`}, ${transactionId}, ${individualId}, ${amountTip})
            `;
          } else if (mode === "EQUAL_SPLIT") {
            const businessSpecialists = await tx<{ id: string }[]>`
              SELECT id FROM individual_profiles WHERE business_id = ${businessId}
            `;

            const count = businessSpecialists.length;
            if (count > 0) {
              const splitAmount = parseFloat((amountTip / count).toFixed(2));
              for (let idx = 0; idx < businessSpecialists.length; idx++) {
                const w = businessSpecialists[idx];
                await tx`
                  UPDATE individual_profiles 
                  SET balance = balance + ${splitAmount} 
                  WHERE id = ${w.id}
                `;

                await tx`
                  INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
                  VALUES (${`split-${Date.now()}-${idx}`}, ${transactionId}, ${w.id}, ${splitAmount})
                `;
              }
            }
          } else if (mode === "CUSTOM_SPLIT") {
            const pctIndividual = individual.individual_percentage || 70.0;
            const individualShare = parseFloat((amountTip * (pctIndividual / 100)).toFixed(2));
            const companyShare = parseFloat((amountTip - individualShare).toFixed(2));

            await tx`
              UPDATE individual_profiles 
              SET balance = balance + ${individualShare}
              WHERE id = ${individualId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-w`}, ${transactionId}, ${individualId}, ${individualShare})
            `;

            await tx`
              UPDATE businesses 
              SET balance = balance + ${companyShare} 
              WHERE id = ${businessId}
            `;

            await tx`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (${`split-${Date.now()}-k`}, ${transactionId}, NULL, ${companyShare})
            `;
          }
        }

        await tx`
          UPDATE individual_profiles 
          SET rating = (rating * 4 + ${ratingStars}) / 5 
          WHERE id = ${individualId}
        `;
      }
    });

    const individualProfile = await db.get<{ short_code: string }>("SELECT short_code FROM individual_profiles WHERE id = ?", [individualId]);
    if (individualProfile) {
      revalidatePath(`/p/${individualProfile.short_code}`);
    }
    return { success: true, transactionId };
  } catch (error: any) {
    console.error("Payment action error:", error);
    return { success: false, error: error?.message || "Payment processing failed" };
  }
}

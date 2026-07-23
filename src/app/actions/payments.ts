"use server";

import db from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function processMockPayment(data: {
  waiterId: string; // Map to individualId under the hood
  businessId?: string; // Optional override: used when waiterId is 'common-pool'
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

    // Get individual profile & business details
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
      individual = db.prepare(`
        SELECT wp.id, wp.business_id as restaurant_id, r.tip_distribution_mode, r.individual_percentage
        FROM individual_profiles wp
        LEFT JOIN businesses r ON r.id = wp.business_id
        WHERE wp.id = ?
      `).get(individualId) as any;

      if (individual) {
        businessId = individual.restaurant_id;
      }
    }

    if (!individual) {
      return { success: false, error: "Individual profile not found" };
    }

    // Start SQL transaction
    const runTransaction = db.transaction(() => {
      // 1. Insert Transaction record
      db.prepare(`
        INSERT INTO transactions (id, bill_id, individual_id, amount_bill, amount_tip, payment_status, payment_intent_id)
        VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)
      `).run(transactionId, billId, individualId === "common-pool" ? null : individualId, amountBill, amountTip, `mock-pi-${Date.now()}`);

      // 2. Insert Feedback record
      db.prepare(`
        INSERT INTO feedback (id, transaction_id, rating_stars, comments, tags)
        VALUES (?, ?, ?, ?, ?)
      `).run(feedbackId, transactionId, ratingStars, comments, tags.join(","));

      // 3. Update Bill status if it is linked
      if (billId) {
        db.prepare(`UPDATE bills SET status = 'PAID' WHERE id = ?`).run(billId);
        
        // Add bill amount to business balance
        if (businessId) {
          db.prepare(`
            UPDATE businesses 
            SET balance = balance + ? 
            WHERE id = ?
          `).run(amountBill, businessId);
        }
      }

      // 4. Distribute Tips based on Business settings
      if (amountTip > 0) {
        const mode = individual.tip_distribution_mode || "INDIVIDUAL";

        if (individualId === "common-pool") {
          // All tips go to the company balance (common pool)
          db.prepare(`
            UPDATE businesses 
            SET balance = balance + ? 
            WHERE id = ?
          `).run(amountTip, businessId);

          db.prepare(`
            INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
            VALUES (?, ?, NULL, ?)
          `).run(`split-${Date.now()}-common`, transactionId, amountTip);
        } else if (amountTipWaiter > 0 || amountTipBartender > 0 || amountTipKitchen > 0) {
          // 4.1. Individual Tip
          if (amountTipWaiter > 0) {
            db.prepare(`
              UPDATE individual_profiles 
              SET balance = balance + ?
              WHERE id = ?
            `).run(amountTipWaiter, individualId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, ?, ?)
            `).run(`split-${Date.now()}-waiter`, transactionId, individualId, amountTipWaiter);
          }

          // 4.2. Bartender Tip
          if (amountTipBartender > 0 && businessId) {
            const bartenderId = `bartender-rest-${businessId}`;
            db.prepare(`
              UPDATE individual_profiles 
              SET balance = balance + ?
              WHERE id = ?
            `).run(amountTipBartender, bartenderId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, ?, ?)
            `).run(`split-${Date.now()}-bartender`, transactionId, bartenderId, amountTipBartender);
          }

          // 4.3. Kitchen Tip
          if (amountTipKitchen > 0 && businessId) {
            const kitchenId = `kitchen-rest-${businessId}`;
            db.prepare(`
              UPDATE individual_profiles 
              SET balance = balance + ?
              WHERE id = ?
            `).run(amountTipKitchen, kitchenId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, ?, ?)
            `).run(`split-${Date.now()}-kitchen`, transactionId, kitchenId, amountTipKitchen);
          }
        } else {
          // Fallback to the original distribution modes if individual amounts aren't provided
          if (!businessId || mode === "INDIVIDUAL") {
            // All tips go to the serving specialist
            db.prepare(`
              UPDATE individual_profiles 
              SET balance = balance + ?
              WHERE id = ?
            `).run(amountTip, individualId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, ?, ?)
            `).run(`split-${Date.now()}-1`, transactionId, individualId, amountTip);
          } else if (mode === "EQUAL_SPLIT") {
            // Get all active specialists in this business
            const businessSpecialists = db.prepare(`
              SELECT id FROM individual_profiles WHERE business_id = ?
            `).all(businessId) as { id: string }[];

            const count = businessSpecialists.length;
            if (count > 0) {
              const splitAmount = parseFloat((amountTip / count).toFixed(2));
              businessSpecialists.forEach((w, idx) => {
                db.prepare(`
                  UPDATE individual_profiles 
                  SET balance = balance + ? 
                  WHERE id = ?
                `).run(splitAmount, w.id);

                db.prepare(`
                  INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
                  VALUES (?, ?, ?, ?)
                `).run(`split-${Date.now()}-${idx}`, transactionId, w.id, splitAmount);
              });
            }
          } else if (mode === "CUSTOM_SPLIT") {
            // Custom split: e.g. 70% goes to waiter, 30% goes to company balance
            const pctIndividual = individual.individual_percentage || 70.0;
            const individualShare = parseFloat((amountTip * (pctIndividual / 100)).toFixed(2));
            const companyShare = parseFloat((amountTip - individualShare).toFixed(2));

            // Waiter/individual share
            db.prepare(`
              UPDATE individual_profiles 
              SET balance = balance + ?
              WHERE id = ?
            `).run(individualShare, individualId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, ?, ?)
            `).run(`split-${Date.now()}-w`, transactionId, individualId, individualShare);

            // Kitchen/company share goes to business balance
            db.prepare(`
              UPDATE businesses 
              SET balance = balance + ? 
              WHERE id = ?
            `).run(companyShare, businessId);

            db.prepare(`
              INSERT INTO tip_splits (id, transaction_id, individual_id, amount)
              VALUES (?, ?, NULL, ?)
            `).run(`split-${Date.now()}-k`, transactionId, companyShare);
          }
        }

        // Always update the average rating of the serving waiter specifically
        db.prepare(`
          UPDATE individual_profiles 
          SET rating = (rating * 4 + ?) / 5 
          WHERE id = ?
        `).run(ratingStars, individualId);
      }
    });

    runTransaction();
    const individualProfile = db.prepare("SELECT short_code FROM individual_profiles WHERE id = ?").get(individualId) as { short_code: string } | undefined;
    if (individualProfile) {
      revalidatePath(`/p/${individualProfile.short_code}`);
    }
    return { success: true, transactionId };
  } catch (error: any) {
    console.error("Payment action error:", error);
    return { success: false, error: error?.message || "Payment processing failed" };
  }
}

"use server";

import db from "@/lib/db";
import { eventBus } from "@/lib/events";
import { revalidatePath } from "next/cache";
import { SystemRole } from "@/lib/roles";
import { translateMenuItemWithAI, enhanceDescriptionWithAI, suggestIngredientsWithAI, calculateCaloriesFromIngredients } from "@/lib/aiTranslation";

import fs from "fs";
import path from "path";

export async function uploadMenuImage(base64Data: string) {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { success: false, error: "Invalid image data format" };
    }
    const ext = matches[1].split("/")[1] || "jpeg";
    const buffer = Buffer.from(matches[2], "base64");
    const fileName = `item-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "menu");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    return { success: true, url: `/uploads/menu/${fileName}` };
  } catch (error: any) {
    console.error("uploadMenuImage error:", error);
    return { success: false, error: error?.message || "Failed to upload image" };
  }
}

export async function addIndividualToBusiness(data: {
  businessId: string;
  name: string;
  email: string;
  role: string;
  payoutMethod: string;
  payoutDetail: string;
}) {
  const { businessId, name, email, role, payoutMethod, payoutDetail } = data;

  try {
    const userId = `user-individual-${Date.now()}`;
    const profileId = `individual-${Date.now()}`;
    const memberId = `bm-${businessId}-${profileId}`;
    const shortCode = Math.random().toString(36).substring(2, 7);

    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const tempPassword = "Tip#" + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

    const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
    if (existing) {
      return { success: false, error: "Email is already in use" };
    }

    await db.transaction(async (tx) => {
      await tx`
        INSERT INTO users (id, name, email, password_hash, role_id, business_id)
        VALUES (${userId}, ${name}, ${email}, ${tempPassword}, ${SystemRole.STAFF}, NULL)
      `;

      await tx`
        INSERT INTO individual_profiles (id, user_id, business_id, role, avatar_url, qr_code_url, payout_method, payout_detail, balance, rating, short_code)
        VALUES (${profileId}, ${userId}, ${businessId}, ${role}, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', ${`/qrs/${profileId}.png`}, ${payoutMethod}, ${payoutDetail}, 0.0, 5.0, ${shortCode})
      `;

      await tx`
        INSERT INTO business_members (id, business_id, individual_id, role, status)
        VALUES (${memberId}, ${businessId}, ${profileId}, ${role}, 'ACTIVE')
        ON CONFLICT DO NOTHING
      `;
    });

    return { success: true, credentials: { email, password: tempPassword, name } };
  } catch (error: any) {
    console.error("Add individual error:", error);
    return { success: false, error: error?.message || "Failed to add individual" };
  }
}

export async function findIndividualByEmail(email: string) {
  try {
    const row = await db.get(`
      SELECT ip.id, ip.role, ip.avatar_url, ip.business_id,
             u.name, u.email
      FROM individual_profiles ip
      JOIN users u ON u.id = ip.user_id
      WHERE u.email = ?
    `, [email]);

    if (!row) return { success: false, error: "No account found with this email" };
    return { success: true, individual: row };
  } catch (error: any) {
    return { success: false, error: error?.message || "Search failed" };
  }
}

export async function linkIndividualToBusiness(data: {
  businessId: string;
  individualId: string;
  role: string;
}) {
  const { businessId, individualId, role } = data;
  try {
    const existing = await db.get(
      "SELECT id FROM business_members WHERE business_id = ? AND individual_id = ?",
      [businessId, individualId]
    );

    if (existing) {
      return { success: false, error: "This person is already part of your team" };
    }

    await db.run(`
      INSERT INTO business_members (id, business_id, individual_id, role, status)
      VALUES (?, ?, ?, ?, 'ACTIVE')
    `, [`bm-${businessId}-${individualId}`, businessId, individualId, role]);

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Link individual error:", error);
    return { success: false, error: error?.message || "Failed to link individual" };
  }
}

export async function unlinkIndividualFromBusiness(data: {
  businessId: string;
  individualId: string;
}) {
  const { businessId, individualId } = data;
  try {
    await db.run(
      "DELETE FROM business_members WHERE business_id = ? AND individual_id = ?",
      [businessId, individualId]
    );
    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to unlink" };
  }
}

export async function updateMemberRole(data: {
  businessId: string;
  individualId: string;
  role: string;
}) {
  const { businessId, individualId, role } = data;
  try {
    await db.run(
      "UPDATE business_members SET role = ? WHERE business_id = ? AND individual_id = ?",
      [role, businessId, individualId]
    );
    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update role" };
  }
}

export async function updateTipSettings(data: {
  businessId: string;
  mode: string;
  individualPercentage: number;
}) {
  const { businessId, mode, individualPercentage } = data;

  try {
    await db.run(`
      UPDATE businesses
      SET tip_distribution_mode = ?, individual_percentage = ?
      WHERE id = ?
    `, [mode, individualPercentage, businessId]);

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Update settings error:", error);
    return { success: false, error: error?.message || "Failed to update settings" };
  }
}

export async function updateBusinessDetails(data: {
  businessId: string;
  name: string;
  city?: string;
  address?: string;
}) {
  try {
    await db.run(`
      UPDATE businesses
      SET name = ?, city = ?, address = ?
      WHERE id = ?
    `, [data.name, data.city || null, data.address || null, data.businessId]);

    revalidatePath("/business/dashboard");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Update business details error:", error);
    return { success: false, error: error?.message || "Failed to update business details" };
  }
}

export async function updateBusinessType(data: {
  businessId: string;
  type: string;
}) {
  const { businessId, type } = data;

  try {
    await db.run(`
      UPDATE businesses
      SET business_type = ?
      WHERE id = ?
    `, [type, businessId]);

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Update business type error:", error);
    return { success: false, error: error?.message || "Failed to update business type" };
  }
}

export async function updateExchangeRates(data: {
  businessId: string;
  usdRate: number;
  eurRate: number;
}) {
  try {
    await db.run(`
      UPDATE businesses
      SET usd_rate = ?, eur_rate = ?
      WHERE id = ?
    `, [data.usdRate, data.eurRate, data.businessId]);

    revalidatePath("/business/dashboard");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Update exchange rates error:", error);
    return { success: false, error: error?.message || "Failed to update exchange rates" };
  }
}

export async function createMockBill(data: {
  businessId: string;
  individualId: string;
  spotLabel: string;
  amount: number;
  items: { name: string; price: number; quantity: number }[];
}) {
  const { businessId, individualId, spotLabel, amount, items } = data;

  try {
    const billId = `bill-${Date.now()}`;
    const cleanNum = parseInt(spotLabel.replace(/[^0-9]/g, ""), 10) || 1;

    let spot = await db.get<{ id: string; short_code: string }>(`
      SELECT id, short_code FROM spots 
      WHERE business_id = ? AND number = ?
    `, [businessId, cleanNum]);

    let spotId = spot?.id;
    let spotCode = spot?.short_code;

    if (!spotId) {
      spotId = `spot-${businessId}-${cleanNum}`;
      spotCode = Math.random().toString(36).substring(2, 7);
      
      await db.run(`
        INSERT INTO spots (id, business_id, number, label, short_code)
        VALUES (?, ?, ?, ?, ?)
      `, [spotId, businessId, cleanNum, spotLabel, spotCode]);
    }

    await db.run(`
      INSERT INTO bills (id, table_number, spot_id, business_id, individual_id, amount, status, items)
      VALUES (?, ?, ?, ?, ?, ?, 'UNPAID', ?)
    `, [billId, spotLabel, spotId, businessId, individualId, amount, JSON.stringify(items)]);

    eventBus.emit(`dashboard-update:${businessId}`);
    revalidatePath("/business/dashboard");
    return { success: true, billId, tableCode: spotCode };
  } catch (error: any) {
    console.error("Create bill error:", error);
    return { success: false, error: error?.message || "Failed to create bill" };
  }
}

export async function withdrawBusinessBalance(data: {
  businessId: string;
  amount: number;
  payoutMethod: string;
  destinationDetail: string;
}) {
  const { businessId, amount, payoutMethod, destinationDetail } = data;

  try {
    const payoutId = `po-${Date.now()}`;
    const business = await db.get<any>("SELECT balance FROM businesses WHERE id = ?", [businessId]);

    if (!business) {
      return { success: false, error: "Business not found" };
    }

    if (business.balance < amount) {
      return { success: false, error: "Insufficient balance" };
    }

    const settingRow = await db.get<any>("SELECT value FROM platform_settings WHERE key = 'business_payout_fee_percent'");
    const feePercent = parseFloat(settingRow?.value || "2.5");
    const feeAmount = (amount * feePercent) / 100;
    const netAmount = amount - feeAmount;

    await db.transaction(async (tx) => {
      await tx`UPDATE businesses SET balance = balance - ${amount} WHERE id = ${businessId}`;
      await tx`
        INSERT INTO payout_requests (id, business_id, amount, fee_amount, net_amount, payout_method, destination_detail, status)
        VALUES (${payoutId}, ${businessId}, ${amount}, ${feeAmount}, ${netAmount}, ${payoutMethod}, ${destinationDetail}, 'PENDING')
      `;
    });

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Business payout error:", error);
    return { success: false, error: error?.message || "Failed to withdraw" };
  }
}

export async function assignIndividualToSpot(data: {
  spotId: string;
  individualId: string | null;
}) {
  const { spotId, individualId } = data;
  try {
    await db.run(`
      UPDATE spots
      SET assigned_individual_id = ?
      WHERE id = ?
    `, [individualId ? individualId : null, spotId]);

    const s = await db.get<any>("SELECT business_id FROM spots WHERE id = ?", [spotId]);
    if (s) eventBus.emit(`dashboard-update:${s.business_id}`);

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Assign individual to spot error:", error);
    return { success: false, error: error?.message || "Failed to assign individual to spot" };
  }
}

export async function createSpot(data: {
  businessId: string;
  number?: number;
  label: string;
}) {
  const { businessId, label } = data;
  try {
    let number = data.number;
    if (!number) {
      const maxRow = await db.get<any>("SELECT MAX(number) as maxNum FROM spots WHERE business_id = ?", [businessId]);
      number = (maxRow?.maxNum || 0) + 1;
    }
    const id = `spot-${Date.now()}`;
    const shortCode = Math.random().toString(36).substring(2, 7);

    await db.run(`
      INSERT INTO spots (id, business_id, number, label, short_code)
      VALUES (?, ?, ?, ?, ?)
    `, [id, businessId, number, label, shortCode]);

    eventBus.emit(`dashboard-update:${businessId}`);
    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Create spot error:", error);
    return { success: false, error: error?.message || "Failed to create spot" };
  }
}

export async function updateBill(data: {
  billId: string;
  items: { name: string; price: number; quantity: number }[];
  individualId?: string;
}) {
  const { billId, items, individualId } = data;
  try {
    const amount = items.reduce((s, i) => s + i.price * i.quantity, 0);

    if (individualId !== undefined) {
      await db.run(`
        UPDATE bills SET items = ?, amount = ?, individual_id = ? WHERE id = ?
      `, [JSON.stringify(items), amount, individualId, billId]);
    } else {
      await db.run(`
        UPDATE bills SET items = ?, amount = ? WHERE id = ?
      `, [JSON.stringify(items), amount, billId]);
    }

    const b = await db.get<any>("SELECT business_id, spot_id FROM bills WHERE id = ?", [billId]);
    if (b) {
      eventBus.emit(`dashboard-update:${b.business_id}`);
      eventBus.emit(`table-update:${b.spot_id}`);
    }

    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Update bill error:", error);
    return { success: false, error: error?.message || "Failed to update bill" };
  }
}

export async function cancelBill(data: { billId: string }) {
  try {
    await db.run(`UPDATE bills SET status = 'CANCELLED' WHERE id = ?`, [data.billId]);
    const b = await db.get<any>("SELECT business_id, spot_id FROM bills WHERE id = ?", [data.billId]);
    if (b) {
      eventBus.emit(`dashboard-update:${b.business_id}`);
      eventBus.emit(`table-update:${b.spot_id}`);
    }
    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Cancel bill error:", error);
  }
}

export async function addItemToSpotCart(data: {
  businessId: string;
  spotId: string;
  spotLabel: string;
  item?: { id?: string; name: string; price: number; quantity: number; deviceId?: string; isDraft?: boolean; originalPrice?: number };
  items?: { id?: string; name: string; price: number; quantity: number; deviceId?: string; isDraft?: boolean; originalPrice?: number }[];
}) {
  const { businessId, spotId, spotLabel, item, items: incomingItems } = data;
  try {
    const toAdd = incomingItems ? incomingItems : (item ? [item] : []);
    if (toAdd.length === 0) return { success: true };

    let openBill = await db.get<any>("SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID' LIMIT 1", [spotId]);

    if (openBill) {
      const items = JSON.parse(openBill.items || "[]");
      
      for (const newItem of toAdd) {
        if (newItem.isDraft) {
          const existingDraftIndex = items.findIndex((i: any) => i.name === newItem.name && i.isDraft && i.deviceId === newItem.deviceId);
          if (existingDraftIndex >= 0) {
            items[existingDraftIndex].quantity += newItem.quantity;
            items[existingDraftIndex].price = newItem.price;
            if (newItem.originalPrice !== undefined) {
              items[existingDraftIndex].originalPrice = newItem.originalPrice;
            }
          } else {
            items.push(newItem);
          }
        } else {
          items.push(newItem);
        }
      }

      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, openBill.id]);
    } else {
      const billId = `bill-${Date.now()}`;
      const items = [...toAdd];
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run(`
        INSERT INTO bills (id, table_number, spot_id, business_id, amount, status, items)
        VALUES (?, ?, ?, ?, ?, 'UNPAID', ?)
      `, [billId, spotLabel, spotId, businessId, newAmount, JSON.stringify(items)]);
    }

    eventBus.emit(`dashboard-update:${businessId}`);
    eventBus.emit(`table-update:${spotId}`);
    revalidatePath("/business/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Add to cart error:", error);
    return { success: false, error: error?.message || "Failed to add item to cart" };
  }
}

export async function removeItemFromSpotCart(data: {
  billId: string;
  itemIndex: number;
}) {
  try {
    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [data.billId]);
    if (!bill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(bill.items || "[]");
    if (data.itemIndex >= 0 && data.itemIndex < items.length) {
      items.splice(data.itemIndex, 1);
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, bill.id]);
      eventBus.emit(`dashboard-update:${bill.business_id}`);
      eventBus.emit(`table-update:${bill.spot_id}`);
      revalidatePath("/business/dashboard");
    }
    return { success: true };
  } catch (error: any) {
    console.error("Remove from cart error:", error);
    return { success: false, error: error?.message || "Failed to remove item" };
  }
}

export async function updateWaiterCartQuantity(data: {
  billId: string;
  itemIndex: number;
  delta: number;
}) {
  try {
    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [data.billId]);
    if (!bill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(bill.items || "[]");
    if (data.itemIndex >= 0 && data.itemIndex < items.length) {
      items[data.itemIndex].quantity += data.delta;
      if (items[data.itemIndex].quantity <= 0) {
        items.splice(data.itemIndex, 1);
      }
      
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, bill.id]);
      eventBus.emit(`dashboard-update:${bill.business_id}`);
      eventBus.emit(`table-update:${bill.spot_id}`);
      return { success: true };
    }
    return { success: false, error: "Item not found" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update quantity" };
  }
}

export async function updateWaiterCartItemPrice(data: {
  billId: string;
  itemIndex: number;
  newPrice: number;
}) {
  try {
    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [data.billId]);
    if (!bill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(bill.items || "[]");
    if (data.itemIndex >= 0 && data.itemIndex < items.length) {
      if (items[data.itemIndex].price !== data.newPrice) {
        if (items[data.itemIndex].originalPrice === undefined) {
          items[data.itemIndex].originalPrice = items[data.itemIndex].price;
        }
        items[data.itemIndex].price = data.newPrice;
        
        const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
        await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, bill.id]);
        eventBus.emit(`dashboard-update:${bill.business_id}`);
        eventBus.emit(`table-update:${bill.spot_id}`);
        return { success: true };
      }
    }
    return { success: false, error: "Item not found" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update price" };
  }
}

export async function addBillDiscount(data: {
  billId: string;
  discountAmount: number;
  reason: string;
}) {
  try {
    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [data.billId]);
    if (!bill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(bill.items || "[]");
    const discountItem = {
      id: `discount-${Date.now()}`,
      name: data.reason || "Discount",
      price: -Math.abs(data.discountAmount),
      quantity: 1,
      status: "CONFIRMED"
    };
    items.push(discountItem);

    const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
    await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, bill.id]);
    eventBus.emit(`dashboard-update:${bill.business_id}`);
    eventBus.emit(`table-update:${bill.spot_id}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to add discount" };
  }
}

export async function updateWaiterCartItemNote(data: {
  billId: string;
  itemIndex: number;
  note: string;
}) {
  try {
    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [data.billId]);
    if (!bill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(bill.items || "[]");
    if (data.itemIndex >= 0 && data.itemIndex < items.length) {
      if (data.note.trim() === "") {
        delete items[data.itemIndex].note;
      } else {
        items[data.itemIndex].note = data.note.trim();
      }
      
      await db.run("UPDATE bills SET items = ? WHERE id = ?", [JSON.stringify(items), bill.id]);
      eventBus.emit(`dashboard-update:${bill.business_id}`);
      eventBus.emit(`table-update:${bill.spot_id}`);
      return { success: true };
    }
    return { success: false, error: "Item not found" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update note" };
  }
}

export async function deleteSpot(data: { spotId: string }) {
  try {
    const s = await db.get<any>("SELECT business_id FROM spots WHERE id = ?", [data.spotId]);
    await db.run(`DELETE FROM spots WHERE id = ?`, [data.spotId]);
    if (s) eventBus.emit(`dashboard-update:${s.business_id}`);
    revalidatePath("/business/dashboard");
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    console.error("Delete spot error:", error);
    return { success: false, error: error?.message || "Failed to delete spot" };
  }
}

export async function createCategory(data: { businessId: string; name: string; nameAr?: string }) {
  try {
    const id = `cat-${Date.now()}`;
    await db.run(`
      INSERT INTO menu_categories (id, business_id, name, name_ar)
      VALUES (?, ?, ?, ?)
    `, [id, data.businessId, data.name, data.nameAr || null]);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create category" };
  }
}

export async function deleteCategory(data: { categoryId: string }) {
  try {
    await db.run(`DELETE FROM menu_categories WHERE id = ?`, [data.categoryId]);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete category" };
  }
}

export async function createMenuItem(data: {
  businessId: string;
  categoryId?: string;
  name: string;
  price: number;
  priceTourist?: number;
  description?: string;
  imageUrl?: string;
  weightVolume?: string;
  ingredients?: string;
  spiciness?: number;
  dietaryTags?: string[];
  calories?: number;
}) {
  try {
    const id = `item-${Date.now()}`;
    const translations = await translateMenuItemWithAI(data.name, data.description);
    const translationsJson = JSON.stringify(translations);
    const dietaryTagsJson = data.dietaryTags && data.dietaryTags.length > 0 ? JSON.stringify(data.dietaryTags) : null;

    await db.run(`
      INSERT INTO menu_items (
        id, business_id, category_id, name, price, price_tourist, description, image_url,
        weight_volume, ingredients, spiciness, dietary_tags, calories, is_available, translations_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `, [
      id,
      data.businessId,
      data.categoryId || null,
      data.name,
      data.price,
      data.priceTourist || null,
      data.description || null,
      data.imageUrl || null,
      data.weightVolume || null,
      data.ingredients || null,
      data.spiciness || 0,
      dietaryTagsJson,
      data.calories || null,
      translationsJson
    ]);
    eventBus.emit(`dashboard-update:${data.businessId}`);
    revalidatePath("/business/settings");
    return { success: true, translations, id };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to create menu item" };
  }
}

export async function enhanceItemDescription(data: { name: string; currentDesc?: string }) {
  try {
    const enhanced = await enhanceDescriptionWithAI(data.name, data.currentDesc || "");
    return { success: true, enhanced };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to enhance description" };
  }
}

export async function suggestItemIngredients(data: { name: string; description?: string }) {
  try {
    const ingredients = await suggestIngredientsWithAI(data.name, data.description || "");
    return { success: true, ingredients };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to suggest ingredients" };
  }
}

export async function calculateItemCalories(data: { name: string; ingredients: string; weightVolume?: string }) {
  try {
    const calories = await calculateCaloriesFromIngredients(data.name, data.ingredients, data.weightVolume || "");
    return { success: true, calories };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to calculate calories" };
  }
}

export async function updateMenuItem(data: {
  itemId: string;
  name: string;
  price: number;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  weightVolume?: string;
  ingredients?: string;
  spiciness?: number;
  dietaryTags?: string[];
  calories?: number;
}) {
  try {
    const dietaryTagsJson = data.dietaryTags && data.dietaryTags.length > 0 ? JSON.stringify(data.dietaryTags) : null;
    const translations = await translateMenuItemWithAI(data.name, data.description);
    const translationsJson = JSON.stringify(translations);

    await db.run(`
      UPDATE menu_items
      SET name = ?, price = ?, category_id = ?, description = ?, image_url = ?,
          weight_volume = ?, ingredients = ?, spiciness = ?, dietary_tags = ?, calories = ?, translations_json = ?
      WHERE id = ?
    `, [
      data.name,
      data.price,
      data.categoryId || null,
      data.description || null,
      data.imageUrl || null,
      data.weightVolume || null,
      data.ingredients || null,
      data.spiciness || 0,
      dietaryTagsJson,
      data.calories || null,
      translationsJson,
      data.itemId
    ]);
    const mi = await db.get<any>("SELECT business_id FROM menu_items WHERE id = ?", [data.itemId]);
    if (mi) eventBus.emit(`dashboard-update:${mi.business_id}`);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update menu item" };
  }
}

export async function updateAccountPassword(data: {
  userId: string;
  currentPassword?: string;
  newPassword: string;
}) {
  try {
    const user = await db.get<any>("SELECT * FROM users WHERE id = ?", [data.userId]);
    if (!user) {
      return { success: false, error: "User not found" };
    }

    if (data.currentPassword && user.password_hash !== data.currentPassword) {
      return { success: false, error: "Incorrect current password" };
    }

    await db.run("UPDATE users SET password_hash = ? WHERE id = ?", [data.newPassword, data.userId]);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    console.error("updateAccountPassword error:", error);
    return { success: false, error: error?.message || "Failed to change password" };
  }
}

export async function toggleStopList(data: { itemId: string; isAvailable: number }) {
  try {
    const mi = await db.get<any>("SELECT business_id FROM menu_items WHERE id = ?", [data.itemId]);
    await db.run(`
      UPDATE menu_items SET is_available = ? WHERE id = ?
    `, [data.isAvailable, data.itemId]);
    if (mi) eventBus.emit(`dashboard-update:${mi.business_id}`);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to toggle stop list" };
  }
}

export async function deleteMenuItem(data: { itemId: string }) {
  try {
    const mi = await db.get<any>("SELECT business_id FROM menu_items WHERE id = ?", [data.itemId]);
    await db.run(`DELETE FROM menu_items WHERE id = ?`, [data.itemId]);
    if (mi) eventBus.emit(`dashboard-update:${mi.business_id}`);
    revalidatePath("/business/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to delete menu item" };
  }
}

export async function updateDraftQuantity(data: {
  spotId: string;
  itemId: string;
  deviceId: string;
  delta: number;
  price?: number;
  originalPrice?: number;
}) {
  try {
    let openBill = await db.get<any>("SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID' LIMIT 1", [data.spotId]);
    if (!openBill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(openBill.items || "[]");
    const itemIndex = items.findIndex((i: any) => i.id === data.itemId && i.deviceId === data.deviceId && i.isDraft);
    
    if (itemIndex > -1) {
      items[itemIndex].quantity += data.delta;
      if (data.price !== undefined) {
        items[itemIndex].price = data.price;
      }
      if (data.originalPrice !== undefined) {
        items[itemIndex].originalPrice = data.originalPrice;
      }
      if (items[itemIndex].quantity <= 0) {
        items.splice(itemIndex, 1);
      }
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, openBill.id]);
      eventBus.emit(`dashboard-update:${openBill.business_id}`);
      eventBus.emit(`table-update:${openBill.spot_id}`);
      return { success: true };
    }
    return { success: false, error: "Item not found or not editable" };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to update draft quantity" };
  }
}

export async function removeDraftItem(data: {
  spotId: string;
  itemId: string;
  deviceId: string;
}) {
  try {
    let openBill = await db.get<any>("SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID' LIMIT 1", [data.spotId]);
    if (!openBill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(openBill.items || "[]");
    const filteredItems = items.filter((i: any) => !(i.id === data.itemId && i.deviceId === data.deviceId && i.isDraft));
    
    if (items.length !== filteredItems.length) {
      const newAmount = filteredItems.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(filteredItems), newAmount, openBill.id]);
      eventBus.emit(`dashboard-update:${openBill.business_id}`);
      eventBus.emit(`table-update:${openBill.spot_id}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to remove draft item" };
  }
}

export async function confirmGuestDrafts(data: {
  spotId: string;
  deviceId: string;
}) {
  try {
    let openBill = await db.get<any>("SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID' LIMIT 1", [data.spotId]);
    if (!openBill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(openBill.items || "[]");
    let changed = false;
    items.forEach((i: any) => {
      if (i.deviceId === data.deviceId && i.isDraft) {
        i.status = 'PENDING';
        changed = true;
      }
    });
    
    if (changed) {
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, openBill.id]);
      eventBus.emit(`dashboard-update:${openBill.business_id}`);
      eventBus.emit(`table-update:${openBill.spot_id}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to confirm drafts" };
  }
}

export async function approvePendingItems(data: {
  spotId: string;
}) {
  try {
    let openBill = await db.get<any>("SELECT * FROM bills WHERE spot_id = ? AND status = 'UNPAID' LIMIT 1", [data.spotId]);
    if (!openBill) return { success: false, error: "Bill not found" };

    const items = JSON.parse(openBill.items || "[]");
    let changed = false;
    items.forEach((i: any) => {
      if (i.status === 'PENDING' || i.status === 'DRAFT' || i.isDraft) {
        i.status = 'CONFIRMED';
        if (i.isDraft) delete i.isDraft;
        changed = true;
      }
    });
    
    if (changed) {
      const newAmount = items.reduce((s: number, i: any) => s + ((i.isDraft || i.status === 'PENDING') ? 0 : i.price * i.quantity), 0);
      await db.run("UPDATE bills SET items = ?, amount = ? WHERE id = ?", [JSON.stringify(items), newAmount, openBill.id]);
      eventBus.emit(`dashboard-update:${openBill.business_id}`);
      eventBus.emit(`table-update:${openBill.spot_id}`);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to approve pending items" };
  }
}

export async function transferBill(data: {
  billId: string;
  oldSpotId: string;
  targetSpotId: string;
  targetSpotLabel: string;
  keepOwnership: boolean;
  currentWaiterId: string;
}) {
  try {
    const { billId, oldSpotId, targetSpotId, targetSpotLabel, keepOwnership, currentWaiterId } = data;

    const targetHasBill = await db.get<any>("SELECT count(*) as count FROM bills WHERE spot_id = ? AND status = 'UNPAID'", [targetSpotId]);
    if (targetHasBill && parseInt(targetHasBill.count, 10) > 0) {
      return { success: false, error: "Target table already has an active bill" };
    }

    const bill = await db.get<any>("SELECT * FROM bills WHERE id = ?", [billId]);
    if (!bill || bill.status !== 'UNPAID') {
      return { success: false, error: "Bill is no longer active" };
    }

    if (keepOwnership) {
      await db.run(`
        UPDATE bills 
        SET spot_id = ?, table_number = ?, individual_id = ?
        WHERE id = ?
      `, [targetSpotId, targetSpotLabel, currentWaiterId, billId]);
    } else {
      await db.run(`
        UPDATE bills 
        SET spot_id = ?, table_number = ?, individual_id = NULL
        WHERE id = ?
      `, [targetSpotId, targetSpotLabel, billId]);
    }

    eventBus.emit(`dashboard-update:${bill.business_id}`);
    eventBus.emit(`table-update:${oldSpotId}`);
    eventBus.emit(`table-update:${targetSpotId}`);
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to transfer table" };
  }
}

export async function recordQrScan(businessId: string) {
  try {
    await db.run("UPDATE businesses SET qr_scans_count = COALESCE(qr_scans_count, 0) + 1 WHERE id = ?", [businessId]);
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function getBusinessAnalyticsAndTransactions(businessId: string) {
  try {
    const bizRow = await db.get<{ qr_scans_count: number; currency: string }>("SELECT qr_scans_count, currency FROM businesses WHERE id = ?", [businessId]);
    const qrScansCount = bizRow?.qr_scans_count || 0;
    const currency = bizRow?.currency || "EGP";

    let transactions = await db.all<any>(`
      SELECT 
        t.id as id,
        t.bill_id,
        t.amount_bill,
        t.amount_tip,
        t.currency,
        t.payment_status,
        t.created_at,
        b.table_number,
        s.label as spot_label,
        u.name as staff_name,
        f.rating_stars,
        f.comments as guest_comment
      FROM transactions t
      JOIN bills b ON b.id = t.bill_id
      LEFT JOIN spots s ON s.id = b.spot_id
      LEFT JOIN individual_profiles ip ON ip.id = t.individual_id
      LEFT JOIN users u ON u.id = ip.user_id
      LEFT JOIN feedback f ON f.transaction_id = t.id
      WHERE b.business_id = ?
      ORDER BY t.created_at DESC
    `, [businessId]);

    if (transactions.length === 0) {
      const sampleSpots = await db.all<{ id: string; label: string }>("SELECT id, label FROM spots WHERE business_id = ? LIMIT 5", [businessId]);
      const sampleStaff = await db.all<{ id: string; name: string }>("SELECT ip.id, u.name FROM individual_profiles ip JOIN users u ON u.id = ip.user_id WHERE ip.business_id = ? LIMIT 3", [businessId]);

      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      const mockData = [
        { bill: 450, tip: 60, offset: 0.1 * dayMs, spot: sampleSpots[0]?.label || "Spot 1", spotId: sampleSpots[0]?.id },
        { bill: 820, tip: 100, offset: 0.4 * dayMs, spot: sampleSpots[1]?.label || "Spot 2", spotId: sampleSpots[1]?.id },
        { bill: 310, tip: 45, offset: 1.2 * dayMs, spot: sampleSpots[2]?.label || "Spot 3", spotId: sampleSpots[2]?.id },
        { bill: 1250, tip: 180, offset: 2.5 * dayMs, spot: sampleSpots[0]?.label || "Spot 1", spotId: sampleSpots[0]?.id },
        { bill: 640, tip: 80, offset: 4.1 * dayMs, spot: sampleSpots[3]?.label || "Spot 4", spotId: sampleSpots[3]?.id },
        { bill: 980, tip: 130, offset: 6.0 * dayMs, spot: sampleSpots[1]?.label || "Spot 2", spotId: sampleSpots[1]?.id },
      ];

      await db.transaction(async (tx) => {
        for (let idx = 0; idx < mockData.length; idx++) {
          const m = mockData[idx];
          const billId = `bill-seed-${idx}-${Date.now()}`;
          const txId = `tx-seed-${idx}-${Date.now()}`;
          const createdAt = new Date(now - m.offset).toISOString();
          const staffId = sampleStaff[idx % (sampleStaff.length || 1)]?.id || null;

          await tx`
            INSERT INTO bills (id, table_number, spot_id, business_id, individual_id, amount, status, items, created_at)
            VALUES (${billId}, ${m.spot}, ${m.spotId || null}, ${businessId}, ${staffId}, ${m.bill}, 'PAID', '[]', ${createdAt})
          `;

          await tx`
            INSERT INTO transactions (id, bill_id, individual_id, amount_bill, amount_tip, currency, payment_status, created_at)
            VALUES (${txId}, ${billId}, ${staffId}, ${m.bill}, ${m.tip}, ${currency}, 'COMPLETED', ${createdAt})
          `;
        }

        await tx`UPDATE businesses SET qr_scans_count = 64 WHERE id = ${businessId} AND (qr_scans_count IS NULL OR qr_scans_count = 0)`;
      });

      transactions = await db.all<any>(`
        SELECT 
          t.id as id,
          t.bill_id,
          t.amount_bill,
          t.amount_tip,
          t.currency,
          t.payment_status,
          t.created_at,
          b.table_number,
          s.label as spot_label,
          u.name as staff_name,
          f.rating_stars,
          f.comments as guest_comment
        FROM transactions t
        JOIN bills b ON b.id = t.bill_id
        LEFT JOIN spots s ON s.id = b.spot_id
        LEFT JOIN individual_profiles ip ON ip.id = t.individual_id
        LEFT JOIN users u ON u.id = ip.user_id
        LEFT JOIN feedback f ON f.transaction_id = t.id
        WHERE b.business_id = ?
        ORDER BY t.created_at DESC
      `, [businessId]);
    }

    const totalTransactions = transactions.length;
    const totalBillVolume = transactions.reduce((sum, t) => sum + (t.amount_bill || 0), 0);
    const totalTipVolume = transactions.reduce((sum, t) => sum + (t.amount_tip || 0), 0);
    const avgTipPercentage = totalBillVolume > 0 ? ((totalTipVolume / totalBillVolume) * 100).toFixed(1) : "0";
    const avgBillAmount = totalTransactions > 0 ? (totalBillVolume / totalTransactions).toFixed(2) : "0.00";

    return {
      success: true,
      stats: {
        totalTransactions,
        totalBillVolume,
        totalTipVolume,
        avgTipPercentage,
        avgBillAmount,
        qrScansCount,
        currency
      },
      transactions
    };
  } catch (error: any) {
    console.error("getBusinessAnalyticsAndTransactions error:", error);
    return { success: false, error: error?.message || "Failed to load analytics" };
  }
}

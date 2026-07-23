import db from "@/lib/db";
import { notFound } from "next/navigation";
import { TableStateProvider } from "@/components/AppStateContext";
import SharedLayoutWrapper from "@/components/SharedLayoutWrapper";
import React from "react";

interface LayoutProps {
  params: Promise<any>;
  children: React.ReactNode;
}

export default async function TableLayout({ params, children }: LayoutProps) {
  const { tableCode } = (await params) as { tableCode: string };

  // 1. Fetch physical spot by its short_code
  const table = db.prepare(`
    SELECT * FROM spots WHERE short_code = ?
  `).get(tableCode) as any;

  if (!table) {
    notFound();
  }

  // Increment QR Scans Count for venue
  try {
    db.prepare("UPDATE businesses SET qr_scans_count = COALESCE(qr_scans_count, 0) + 1 WHERE id = ?").run(table.business_id);
  } catch (err) {
    // Non-blocking
  }

  // 2. Fetch the active UNPAID bill for this physical spot
  const bill = db.prepare(`
    SELECT * FROM bills 
    WHERE spot_id = ? AND status = 'UNPAID'
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(table.id) as any;

  // 3. Resolve which individual/waiter to show
  let waiter: any = null;
  const targetIndividualId = (bill && bill.individual_id) || table.assigned_individual_id;

  if (targetIndividualId) {
    waiter = db.prepare(`
      SELECT 
        wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, wp.business_id as restaurant_id, wp.role,
        u.name as name, u.name_ar as name_ar,
        r.name as restaurant_name, r.logo_url as restaurant_logo, r.currency, r.business_type
      FROM individual_profiles wp
      JOIN users u ON u.id = wp.user_id
      LEFT JOIN businesses r ON r.id = wp.business_id
      WHERE wp.id = ?
    `).get(targetIndividualId);
  }

  // If no active bill or no waiter on the bill, pick the first staff member as default
  if (!waiter) {
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(table.business_id) as any;
    if (business) {
      waiter = {
        id: "common-pool",
        name: business.name,
        name_ar: business.name_ar || business.name,
        avatar_url: business.logo_url || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&auto=format&fit=crop&q=80",
        balance: 0.0,
        rating: 5.0,
        saving_goal: "Shared Team Pool",
        saving_goal_ar: "صندوق الفريق المشترك",
        restaurant_id: business.id,
        restaurant_name: business.name,
        restaurant_logo: business.logo_url,
        currency: business.currency,
        business_type: business.business_type,
        role: "POOL"
      };
    }
  }

  if (!waiter) {
    notFound(); // No waiter set up for this business at all
  }

  // 4. Fetch bartender & kitchen profiles for this restaurant/business
  const bartender = waiter.restaurant_id ? db.prepare(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `).get(waiter.restaurant_id, `bartender-rest-${waiter.restaurant_id}`) as any : null;

  const kitchen = waiter.restaurant_id ? db.prepare(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `).get(waiter.restaurant_id, `kitchen-rest-${waiter.restaurant_id}`) as any : null;

  return (
    <TableStateProvider 
      waiter={waiter} 
      initialBill={bill || null} 
      initialBillPaid={bill ? bill.status === "PAID" : false}
      initialBartender={bartender || null}
      initialKitchen={kitchen || null}
      tableLabel={table.label}
      spotId={table.id}
    >
      <SharedLayoutWrapper tableId={table.id}>
        {children}
      </SharedLayoutWrapper>
    </TableStateProvider>
  );
}

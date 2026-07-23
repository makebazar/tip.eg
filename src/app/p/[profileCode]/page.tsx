import db from "@/lib/db";
import TippingForm from "@/components/TippingForm";
import { TableStateProvider } from "@/components/AppStateContext";
import SharedLayoutWrapper from "@/components/SharedLayoutWrapper";
import { notFound } from "next/navigation";

export const revalidate = 0;

interface PageProps {
  params: Promise<any>;
}

export default async function PersonalTipPage({ params }: PageProps) {
  const { profileCode } = (await params) as { profileCode: string };

  // Fetch staff profile by its short_code
  const waiter = db.prepare(`
    SELECT 
      wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, wp.business_id as restaurant_id, wp.role,
      u.name as name, u.name_ar as name_ar,
      r.name as restaurant_name, r.logo_url as restaurant_logo, r.currency, r.business_type
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN businesses r ON r.id = wp.business_id
    WHERE wp.short_code = ?
  `).get(profileCode) as any;

  if (!waiter) {
    notFound();
  }

  // Fetch bartender profile for this business
  const bartender = waiter.restaurant_id ? db.prepare(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `).get(waiter.restaurant_id, `bartender-rest-${waiter.restaurant_id}`) as any : null;

  // Fetch kitchen profile for this business
  const kitchen = waiter.restaurant_id ? db.prepare(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `).get(waiter.restaurant_id, `kitchen-rest-${waiter.restaurant_id}`) as any : null;

  return (
    <TableStateProvider 
      waiter={waiter} 
      initialBill={null}
      initialBartender={bartender || null}
      initialKitchen={kitchen || null}
    >
      <SharedLayoutWrapper>
        <TippingForm />
      </SharedLayoutWrapper>
    </TableStateProvider>
  );
}

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

  const waiter = await db.get(`
    SELECT 
      wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, wp.business_id as restaurant_id, wp.role,
      u.name as name, u.name_ar as name_ar,
      r.name as restaurant_name, r.logo_url as restaurant_logo, r.currency, r.business_type
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    LEFT JOIN businesses r ON r.id = wp.business_id
    WHERE wp.short_code = ?
  `, [profileCode]);

  if (!waiter) {
    notFound();
  }

  const bartender = waiter.restaurant_id ? await db.get(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `, [waiter.restaurant_id, `bartender-rest-${waiter.restaurant_id}`]) : null;

  const kitchen = waiter.restaurant_id ? await db.get(`
    SELECT wp.id, wp.avatar_url, wp.balance, wp.rating, wp.saving_goal, wp.saving_goal_ar, u.name, u.name_ar
    FROM individual_profiles wp
    JOIN users u ON u.id = wp.user_id
    WHERE wp.business_id = ? AND wp.id = ?
  `, [waiter.restaurant_id, `kitchen-rest-${waiter.restaurant_id}`]) : null;

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

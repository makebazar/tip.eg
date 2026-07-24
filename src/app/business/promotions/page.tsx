import db from "@/lib/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PromotionsManagerClient from "./PromotionsManagerClient";
import { getAdminPromotions } from "@/app/actions/promotions";
import Link from "next/link";
import { ArrowLeft, Tag } from "lucide-react";

export const revalidate = 0;

export default async function BusinessPromotionsPage() {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("business_id")?.value;

  if (!businessId) {
    redirect("/business/login");
  }

  const business = await db.get<{ id: string; name: string }>("SELECT * FROM businesses WHERE id = ?", [businessId]);

  if (!business) {
    cookieStore.delete("business_id");
    redirect("/business/login");
  }

  const resPromotions = await getAdminPromotions(businessId);
  const promotions = resPromotions.promotions || [];
  const menuItems = resPromotions.menuItems || [];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: "24px 16px" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link 
              href="/business/settings" 
              style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 }}
            >
              <ArrowLeft size={18} />
              <span>Back to Settings</span>
            </Link>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#B58A1C", fontWeight: 700 }}>
            <Tag size={20} />
            <span style={{ fontSize: "1.1rem" }}>{business.name}</span>
          </div>
        </div>

        <div style={{ background: "white", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" }}>
          <PromotionsManagerClient 
            initialPromotions={promotions}
            menuItems={menuItems}
            businessId={businessId}
          />
        </div>
      </div>
    </div>
  );
}

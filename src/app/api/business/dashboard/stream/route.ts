import { cookies } from "next/headers";
import db from "@/lib/db";
import { eventBus } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const businessId = cookieStore.get("business_id")?.value;

  if (!businessId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const eventName = `dashboard-update:${businessId}`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = async () => {
        try {
          const bills = await db.all(`
            SELECT b.*, t.short_code as table_short_code FROM bills b
            LEFT JOIN spots t ON t.id = b.spot_id
            WHERE b.business_id = ?
            ORDER BY b.created_at DESC
          `, [businessId]);

          const spots = await db.all(`
            SELECT s.*
            FROM spots s
            WHERE s.business_id = ?
            ORDER BY s.number ASC
          `, [businessId]);

          const menuItems = await db.all(`
            SELECT mi.*, mc.name as category_name
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mc.id = mi.category_id
            WHERE mi.business_id = ?
            ORDER BY mi.created_at DESC
          `, [businessId]);

          const restaurant = await db.get("SELECT * FROM businesses WHERE id = ?", [businessId]);

          const totalTipsRow = await db.get<any>(`
            SELECT SUM(t.amount_tip) as total_tips 
            FROM transactions t 
            LEFT JOIN bills b ON b.id = t.bill_id
            LEFT JOIN individual_profiles wp ON wp.id = t.individual_id 
            WHERE (wp.business_id = ? OR b.business_id = ?) AND t.payment_status = 'COMPLETED'
          `, [businessId, businessId]);

          const totalBillsPaidRow = await db.get<any>(`
            SELECT SUM(COALESCE(t.amount_bill, b.amount)) as total_bills 
            FROM bills b 
            LEFT JOIN transactions t ON t.bill_id = b.id AND t.payment_status = 'COMPLETED'
            WHERE b.business_id = ? AND (b.status = 'PAID' OR t.payment_status = 'COMPLETED')
          `, [businessId]);

          const stats = {
            totalTips: parseFloat(totalTipsRow?.total_tips || "0"),
            avgRating: 5.0,
            totalBillsPaid: parseFloat(totalBillsPaidRow?.total_bills || "0"),
          };

          const payloadObj = { bills, spots, menuItems, restaurant, stats };
          const payloadStr = JSON.stringify(payloadObj);

          controller.enqueue(encoder.encode(`data: ${payloadStr}\n\n`));
        } catch (e) {
          console.error("SSE Event Error:", e);
        }
      };

      await sendUpdate();

      eventBus.on(eventName, sendUpdate);

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 10000);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        eventBus.off(eventName, sendUpdate);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Content-Encoding": "none",
    },
  });
}

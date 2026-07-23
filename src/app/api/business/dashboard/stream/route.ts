import { cookies } from "next/headers";
import db from "@/lib/db";
import { eventBus } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Allow long connections on Vercel/Next.js if configured

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
      const sendUpdate = () => {
        try {
          // Fetch bills
          const bills = db.prepare(`
            SELECT b.*, t.short_code as table_short_code FROM bills b
            LEFT JOIN spots t ON t.id = b.spot_id
            WHERE b.business_id = ?
            ORDER BY b.created_at DESC
          `).all(businessId);

          // Fetch spots
          const spots = db.prepare(`
            SELECT s.*
            FROM spots s
            WHERE s.business_id = ?
            ORDER BY s.number ASC
          `).all(businessId);

          // Fetch menuItems
          const menuItems = db.prepare(`
            SELECT mi.*, mc.name as category_name
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mc.id = mi.category_id
            WHERE mi.business_id = ?
            ORDER BY mi.created_at DESC
          `).all(businessId);

          const payloadObj = { bills, spots, menuItems };
          const payloadStr = JSON.stringify(payloadObj);

          controller.enqueue(encoder.encode(`data: ${payloadStr}\n\n`));
        } catch (e) {
          console.error("SSE Event Error:", e);
        }
      };

      // 1. Send initial data immediately
      sendUpdate();

      // 2. Attach listener to the global event bus
      eventBus.on(eventName, sendUpdate);

      // 3. Keep connection alive with periodic pings (since we removed setInterval polling)
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 15000); // 15 seconds

      // 4. Clean up when client disconnects
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
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

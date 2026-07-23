import db from "@/lib/db";
import { eventBus } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get("spotId");

  if (!spotId) {
    return new Response("Missing spotId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const eventName = `table-update:${spotId}`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = () => {
        try {
          // Fetch the active UNPAID bill for this spot
          const bill = db.prepare(`
            SELECT * FROM bills 
            WHERE spot_id = ? AND status = 'UNPAID'
            ORDER BY created_at DESC 
            LIMIT 1
          `).get(spotId) as any;

          const payloadStr = JSON.stringify({ bill: bill || null });
          controller.enqueue(encoder.encode(`data: ${payloadStr}\n\n`));
        } catch (e) {
          console.error("Guest SSE Event Error:", e);
        }
      };

      // 1. Send initial data immediately
      sendUpdate();

      // 2. Attach listener to the global event bus
      eventBus.on(eventName, sendUpdate);

      // 3. Keep connection alive with periodic pings
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

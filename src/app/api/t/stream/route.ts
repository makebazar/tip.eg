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
      const sendUpdate = async () => {
        try {
          const bill = await db.get(`
            SELECT * FROM bills 
            WHERE spot_id = ? AND status = 'UNPAID'
            ORDER BY created_at DESC 
            LIMIT 1
          `, [spotId]);

          const payloadStr = JSON.stringify({ bill: bill || null });
          controller.enqueue(encoder.encode(`data: ${payloadStr}\n\n`));
        } catch (e) {
          console.error("Guest SSE Event Error:", e);
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

import { eventBus } from "@/lib/events";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const spotId = searchParams.get("spotId");
  const businessId = searchParams.get("businessId");

  if (!spotId || !businessId) {
    return new Response("Missing spotId or businessId", { status: 400 });
  }

  const encoder = new TextEncoder();
  const tableEvent = `table-update:${spotId}`;
  const dashboardEvent = `dashboard-update:${businessId}`;

  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = () => {
        try {
          controller.enqueue(encoder.encode(`data: {"refresh":true}\n\n`));
        } catch (e) {
          console.error("Waiter SSE Event Error:", e);
        }
      };

      eventBus.on(tableEvent, sendUpdate);
      eventBus.on(dashboardEvent, sendUpdate);

      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 10000);

      request.signal.addEventListener("abort", () => {
        clearInterval(pingInterval);
        eventBus.off(tableEvent, sendUpdate);
        eventBus.off(dashboardEvent, sendUpdate);
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

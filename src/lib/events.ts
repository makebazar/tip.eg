import { EventEmitter } from "events";

// Next.js hot-reload persistence
const globalForEvents = globalThis as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEvents.eventBus ?? new EventEmitter();

// Increase limit to prevent memory leak warnings if we hit 10+ open SSE connections locally
// On a VPS, you might want this to be higher, e.g., 5000
eventBus.setMaxListeners(5000);

if (process.env.NODE_ENV !== "production") {
  globalForEvents.eventBus = eventBus;
}

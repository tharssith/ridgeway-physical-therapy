import type { Server } from "socket.io";
import { slotRoom } from "@/lib/slot-room";

const globalForIo = globalThis as unknown as { io?: Server };

export function setIO(io: Server) {
  globalForIo.io = io;
}

export function getIO() {
  return globalForIo.io;
}

export { slotRoom };

export function emitSlotUpdate(payload: {
  therapistId: string;
  dateKey: string;
  slot: Record<string, unknown>;
}) {
  const io = getIO();
  if (!io) return;
  io.to(slotRoom(payload.therapistId, payload.dateKey)).emit("slot:updated", payload.slot);
  io.to("slots:all").emit("slot:updated", payload.slot);
}

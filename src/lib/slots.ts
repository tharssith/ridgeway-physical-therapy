import { addDays, format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { CLINIC } from "@/lib/clinic";
import { emitSlotUpdate } from "@/lib/socket";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function clinicDateKey(date: Date) {
  return format(toZonedTime(date, CLINIC.timezone), "yyyy-MM-dd");
}

export function localDateToUtc(dateKey: string, minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return fromZonedTime(`${dateKey}T${pad(hours)}:${pad(mins)}:00`, CLINIC.timezone);
}

export function serializeSlot(
  slot: {
    id: string;
    therapistId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    heldUntil: Date | null;
    heldById: string | null;
  },
  viewerId?: string | null,
) {
  return {
    id: slot.id,
    therapistId: slot.therapistId,
    startTime: slot.startTime.toISOString(),
    endTime: slot.endTime.toISOString(),
    status: slot.status,
    heldUntil: slot.heldUntil?.toISOString() ?? null,
    isMine: Boolean(viewerId && slot.heldById === viewerId),
    dateKey: clinicDateKey(slot.startTime),
  };
}

export async function generateSlotsForWindow(weeks = CLINIC.slotWindowWeeks) {
  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: { workingHours: true, blockedTimes: true },
  });

  const now = new Date();
  const start = toZonedTime(now, CLINIC.timezone);
  start.setHours(0, 0, 0, 0);
  const days = weeks * 7;
  const toCreate: Array<{
    therapistId: string;
    startTime: Date;
    endTime: Date;
    status: "AVAILABLE";
  }> = [];

  for (const therapist of therapists) {
    for (let i = 0; i < days; i++) {
      const day = addDays(start, i);
      const dateKey = format(day, "yyyy-MM-dd");
      const dow = day.getDay();
      const hours = therapist.workingHours.find((h) => h.dayOfWeek === dow);
      if (!hours) continue;

      for (
        let cursor = hours.startMinutes;
        cursor + hours.slotDuration <= hours.endMinutes;
        cursor += hours.slotDuration
      ) {
        const startTime = localDateToUtc(dateKey, cursor);
        const endTime = localDateToUtc(dateKey, cursor + hours.slotDuration);
        if (endTime <= now) continue;

        const blocked = therapist.blockedTimes.some(
          (block) => startTime < block.endTime && endTime > block.startTime,
        );
        if (blocked) continue;

        toCreate.push({
          therapistId: therapist.id,
          startTime,
          endTime,
          status: "AVAILABLE" as const,
        });
      }
    }
  }

  if (toCreate.length === 0) return 0;
  const result = await prisma.availabilitySlot.createMany({
    data: toCreate,
    skipDuplicates: true,
  });
  return result.count;
}

export function emitSerializedSlot(
  slot: {
    id: string;
    therapistId: string;
    startTime: Date;
    endTime: Date;
    status: string;
    heldUntil: Date | null;
    heldById: string | null;
  },
) {
  emitSlotUpdate({
    therapistId: slot.therapistId,
    dateKey: clinicDateKey(slot.startTime),
    slot: serializeSlot(slot),
  });
}

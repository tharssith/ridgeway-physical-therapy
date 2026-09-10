import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { canReschedule } from "@/lib/booking-policy";
import { CLINIC } from "@/lib/clinic";
import { emitSerializedSlot } from "@/lib/slots";

const schema = z.object({
  slotId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Select a new appointment time.");

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!booking || booking.patientId !== session.id) {
      return jsonError("Booking not found.", 404);
    }
    if (booking.status !== "CONFIRMED") {
      return jsonError("Only confirmed appointments can be rescheduled.");
    }
    if (!canReschedule(booking.slot.startTime)) {
      return jsonError(
        `Rescheduling is not available inside ${CLINIC.cancellationHours} hours of your visit. Please call the clinic.`,
        403,
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AvailabilitySlot" WHERE id = ${booking.slotId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "AvailabilitySlot" WHERE id = ${parsed.data.slotId} FOR UPDATE`;

      const next = await tx.availabilitySlot.findUnique({ where: { id: parsed.data.slotId } });
      if (!next || next.status !== "AVAILABLE" || next.therapistId !== booking.therapistId) {
        throw Object.assign(
          new Error("This slot was just booked by someone else, please pick another."),
          { status: 409 },
        );
      }

      const taken = await tx.availabilitySlot.updateMany({
        where: { id: next.id, status: "AVAILABLE" },
        data: { status: "BOOKED", heldUntil: null, heldById: null },
      });
      if (taken.count !== 1) {
        throw Object.assign(
          new Error("This slot was just booked by someone else, please pick another."),
          { status: 409 },
        );
      }

      const oldSlot = await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: { status: "AVAILABLE", heldUntil: null, heldById: null },
      });

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { slotId: next.id },
      });

      const newSlot = await tx.availabilitySlot.findUniqueOrThrow({ where: { id: next.id } });
      return { updated, oldSlot, newSlot };
    });

    emitSerializedSlot(result.oldSlot);
    emitSerializedSlot(result.newSlot);

    return Response.json({ ok: true, bookingId: result.updated.id });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to reschedule.", status);
  }
}

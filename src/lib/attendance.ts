import { prisma } from "@/lib/prisma";
import { emitSerializedSlot } from "@/lib/slots";

export async function markVisitAttendance(opts: {
  bookingId: string;
  attendance: "PRESENT" | "ABSENT";
  staffId: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: opts.bookingId },
    include: { slot: true },
  });
  if (!booking) {
    throw Object.assign(new Error("Booking not found."), { status: 404 });
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "PENDING_PAYMENT") {
    throw Object.assign(new Error("This visit cannot be marked."), { status: 409 });
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    if (opts.attendance === "PRESENT") {
      const nextBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          attendance: "PRESENT",
          status: booking.visitEnd <= now ? "COMPLETED" : "CONFIRMED",
        },
      });
      return { booking: nextBooking, slot: booking.slot };
    }

    const stillUpcoming = booking.visitStart > now;
    const nextBooking = await tx.booking.update({
      where: { id: booking.id },
      data: {
        attendance: "ABSENT",
        status: "CANCELLED",
        cancelledAt: now,
        cancelledBy: opts.staffId,
        cancelReason: "Marked absent at check-in",
        slotId: stillUpcoming ? null : booking.slotId,
      },
    });

    let slot = booking.slot;
    if (booking.slotId) {
      slot = await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: {
          status: stillUpcoming ? "AVAILABLE" : "CANCELLED",
          heldUntil: null,
          heldById: null,
        },
      });
    }

    return { booking: nextBooking, slot };
  });

  if (updated.slot) emitSerializedSlot(updated.slot);
  return updated.booking;
}

import { prisma } from "@/lib/prisma";
import { emitSerializedSlot } from "@/lib/slots";
import { sendBookingConfirmation } from "@/lib/notify";
import { slotDurationMinutes } from "@/lib/clinic";

export async function confirmPaidBooking(opts: {
  bookingId?: string;
  paymentIntentId?: string;
}) {
  const booking = await prisma.booking.findFirst({
    where: opts.bookingId
      ? { id: opts.bookingId }
      : { payment: { stripePaymentIntentId: opts.paymentIntentId } },
    include: {
      slot: true,
      payment: true,
      patient: true,
      therapist: { include: { user: true } },
    },
  });
  if (!booking || !booking.payment || !booking.slotId || !booking.slot) return null;
  if (booking.status === "CONFIRMED") return booking;

  const updated = await prisma.$transaction(async (tx) => {
    const nextBooking = await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CONFIRMED" },
    });
    const slotId = booking.slotId;
    const nextSlot = await tx.availabilitySlot.update({
      where: { id: slotId as string },
      data: { status: "BOOKED", heldUntil: null },
    });
    await tx.payment.update({
      where: { id: booking.payment!.id },
      data: { status: "SUCCEEDED" },
    });
    return { nextBooking, nextSlot };
  });

  emitSerializedSlot(updated.nextSlot);
  await sendBookingConfirmation({
    toEmail: booking.patient.email,
    toPhone: booking.patient.phone,
    patientName: booking.patient.name,
    therapistName: booking.therapist.user.name,
    startTime: booking.slot.startTime,
    durationMin: slotDurationMinutes(booking.slot.startTime, booking.slot.endTime),
    amount: booking.payment.amount,
    bookingId: booking.id,
  });

  return booking;
}

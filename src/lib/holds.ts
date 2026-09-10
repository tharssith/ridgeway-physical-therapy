import { prisma } from "@/lib/prisma";
import { CLINIC, rateForDuration, slotDurationMinutes } from "@/lib/clinic";
import { emitSerializedSlot } from "@/lib/slots";
import { getStripe } from "@/lib/stripe";

export async function releaseExpiredHolds() {
  const now = new Date();
  const expired = await prisma.availabilitySlot.findMany({
    where: {
      status: "HELD",
      heldUntil: { lt: now },
    },
    include: {
      booking: { include: { payment: true } },
    },
  });

  for (const slot of expired) {
    await releaseHold(slot.id, "Hold expired before payment was completed");
  }

  return expired.length;
}

export async function releaseHold(slotId: string, reason: string) {
  const slot = await prisma.availabilitySlot.findUnique({
    where: { id: slotId },
    include: { booking: { include: { payment: true } } },
  });
  if (!slot || slot.status !== "HELD") return null;

  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.availabilitySlot.update({
      where: { id: slot.id },
      data: { status: "AVAILABLE", heldUntil: null, heldById: null },
    });

    if (slot.booking && slot.booking.status === "PENDING_PAYMENT") {
      await tx.booking.update({
        where: { id: slot.booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: reason,
        },
      });
      if (slot.booking.payment && slot.booking.payment.status === "PENDING") {
        await tx.payment.update({
          where: { id: slot.booking.payment.id },
          data: { status: "FAILED" },
        });
      }
    }

    return next;
  });

  const paymentIntentId = slot.booking?.payment?.stripePaymentIntentId;
  if (paymentIntentId) {
    try {
      const stripe = getStripe();
      await stripe.paymentIntents.cancel(paymentIntentId);
    } catch {
      // Intent may already be canceled or succeeded — ignore.
    }
  }

  emitSerializedSlot(updated);
  return updated;
}

export async function holdSlot(params: {
  slotId: string;
  patientId: string;
  visitReason: string;
  visitType: "FIRST_TIME" | "RETURNING";
  notes?: string;
}) {
  const holdUntil = new Date(Date.now() + CLINIC.holdMinutes * 60_000);

  const result = await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT id, status FROM "AvailabilitySlot" WHERE id = ${params.slotId} FOR UPDATE
    `;
    const row = locked[0];
    if (!row) {
      throw Object.assign(new Error("That time is no longer available."), { status: 404 });
    }

    const slot = await tx.availabilitySlot.findUnique({
      where: { id: params.slotId },
      include: { therapist: true, booking: true },
    });
    if (!slot) {
      throw Object.assign(new Error("That time is no longer available."), { status: 404 });
    }

    const alreadyMine =
      slot.status === "HELD" &&
      slot.heldById === params.patientId &&
      slot.heldUntil &&
      slot.heldUntil > new Date() &&
      slot.booking?.status === "PENDING_PAYMENT";

    if (alreadyMine && slot.booking) {
      return { slot, booking: slot.booking, reused: true as const };
    }

    if (slot.status !== "AVAILABLE" || slot.startTime <= new Date()) {
      throw Object.assign(
        new Error("This slot was just booked by someone else, please pick another."),
        { status: 409 },
      );
    }

    const held = await tx.availabilitySlot.updateMany({
      where: { id: slot.id, status: "AVAILABLE" },
      data: {
        status: "HELD",
        heldUntil: holdUntil,
        heldById: params.patientId,
      },
    });
    if (held.count !== 1) {
      throw Object.assign(
        new Error("This slot was just booked by someone else, please pick another."),
        { status: 409 },
      );
    }

    const duration = slotDurationMinutes(slot.startTime, slot.endTime);
    const amount = rateForDuration(slot.therapist, duration);

    const booking = await tx.booking.create({
      data: {
        slotId: slot.id,
        patientId: params.patientId,
        therapistId: slot.therapistId,
        visitReason: params.visitReason,
        visitType: params.visitType,
        notes: params.notes,
        status: "PENDING_PAYMENT",
        payment: {
          create: {
            amount,
            currency: "usd",
            status: "PENDING",
          },
        },
      },
    });

    const nextSlot = await tx.availabilitySlot.findUniqueOrThrow({
      where: { id: slot.id },
      include: { therapist: true },
    });

    return { slot: nextSlot, booking, reused: false as const };
  });

  emitSerializedSlot(result.slot);
  return result;
}

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { canRefundCancel } from "@/lib/booking-policy";
import { getStripe, hasStripe } from "@/lib/stripe";
import { emitSerializedSlot } from "@/lib/slots";
import { sendCancellationNotice } from "@/lib/notify";

const schema = z.object({
  reason: z.string().max(300).optional(),
  refundOverride: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const parsed = schema.safeParse(await request.json().catch(() => ({})));
    const refundOverride = parsed.success && parsed.data.refundOverride && session.role === "ADMIN";

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { slot: true, payment: true, patient: true },
    });
    if (!booking) return jsonError("Booking not found.", 404);

    const isOwner = booking.patientId === session.id;
    const isStaff = session.role === "ADMIN" || session.role === "THERAPIST";
    if (!isOwner && !isStaff) return jsonError("Forbidden", 403);
    if (booking.status !== "CONFIRMED" && booking.status !== "PENDING_PAYMENT") {
      return jsonError("This appointment cannot be cancelled.");
    }

    const refundEligible = canRefundCancel(booking.slot.startTime) || Boolean(refundOverride);
    const shouldRefund =
      refundEligible &&
      booking.payment?.status === "SUCCEEDED" &&
      Boolean(booking.payment.stripePaymentIntentId);

    if (shouldRefund && booking.payment?.stripePaymentIntentId && hasStripe()) {
      await getStripe().refunds.create({
        payment_intent: booking.payment.stripePaymentIntentId,
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelledBy: session.id,
          cancelReason: parsed.success ? parsed.data.reason : undefined,
        },
      });

      const nextSlot = await tx.availabilitySlot.update({
        where: { id: booking.slotId },
        data: {
          status: booking.slot.startTime > new Date() ? "AVAILABLE" : "CANCELLED",
          heldUntil: null,
          heldById: null,
        },
      });

      if (booking.payment && shouldRefund) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { status: "REFUNDED", refundedAt: new Date() },
        });
      }

      return { nextBooking, nextSlot };
    });

    emitSerializedSlot(updated.nextSlot);
    await sendCancellationNotice({
      toEmail: booking.patient.email,
      toPhone: booking.patient.phone,
      patientName: booking.patient.name,
      refunded: shouldRefund,
      amount: booking.payment?.amount,
    });

    return Response.json({
      ok: true,
      refunded: shouldRefund,
      refundEligible,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to cancel.", status);
  }
}

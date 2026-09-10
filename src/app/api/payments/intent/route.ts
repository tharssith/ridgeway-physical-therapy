import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";
import { getStripe, hasStripe, stripePublishableKey } from "@/lib/stripe";
import { CLINIC } from "@/lib/clinic";

const schema = z.object({
  bookingId: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Missing booking.");

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.data.bookingId },
      include: { slot: true, payment: true, therapist: { include: { user: true } } },
    });
    if (!booking) return jsonError("Booking not found.", 404);
    if (booking.status !== "PENDING_PAYMENT" || !booking.slot || booking.slot.status !== "HELD") {
      return jsonError("This booking is no longer awaiting payment.", 409);
    }
    if (!booking.slot.heldUntil || booking.slot.heldUntil < new Date()) {
      return jsonError("Your hold expired. Please choose another time.", 409);
    }
    if (!booking.payment) return jsonError("Payment record missing.", 500);

    if (!hasStripe()) {
      return Response.json({
        demo: true,
        publishableKey: "",
        clientSecret: null,
        amount: booking.payment.amount,
        holdUntil: booking.slot.heldUntil.toISOString(),
        holdMinutes: CLINIC.holdMinutes,
        ticketCode: booking.ticketCode,
      });
    }

    const stripe = getStripe();
    let intentId = booking.payment.stripePaymentIntentId;
    let clientSecret: string | null = null;

    if (intentId) {
      const existing = await stripe.paymentIntents.retrieve(intentId);
      if (existing.status === "requires_payment_method" || existing.status === "requires_confirmation") {
        clientSecret = existing.client_secret;
      }
    }

    if (!clientSecret) {
      const intent = await stripe.paymentIntents.create({
        amount: booking.payment.amount,
        currency: booking.payment.currency,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        metadata: {
          bookingId: booking.id,
          ticketCode: booking.ticketCode,
          slotId: booking.slotId ?? booking.slot.id,
          patientId: booking.patientId,
        },
      });
      intentId = intent.id;
      clientSecret = intent.client_secret;
      await prisma.payment.update({
        where: { id: booking.payment.id },
        data: { stripePaymentIntentId: intent.id },
      });
    }

    return Response.json({
      demo: false,
      publishableKey: stripePublishableKey(),
      clientSecret,
      amount: booking.payment.amount,
      holdUntil: booking.slot.heldUntil.toISOString(),
      holdMinutes: CLINIC.holdMinutes,
      ticketCode: booking.ticketCode,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to start payment.", status);
  }
}

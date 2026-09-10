import { getStripe } from "@/lib/stripe";
import { confirmPaidBooking } from "@/lib/confirm-booking";
import { releaseHold } from "@/lib/holds";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return jsonError("Webhook secret is not configured.", 500);

  const signature = request.headers.get("stripe-signature");
  if (!signature) return jsonError("Missing Stripe signature.", 400);

  let event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return jsonError("Invalid Stripe signature.", 400);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    await confirmPaidBooking({
      bookingId: typeof intent.metadata?.bookingId === "string" ? intent.metadata.bookingId : undefined,
      paymentIntentId: intent.id,
    });
  }

  if (event.type === "payment_intent.payment_failed" || event.type === "payment_intent.canceled") {
    const intent = event.data.object;
    const bookingId = intent.metadata?.bookingId;
    if (typeof bookingId === "string") {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (booking && booking.status === "PENDING_PAYMENT") {
        await releaseHold(booking.slotId, "Payment failed or was cancelled");
      }
    }
  }

  return Response.json({ received: true });
}

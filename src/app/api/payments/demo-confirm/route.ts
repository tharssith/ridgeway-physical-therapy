import { z } from "zod";
import { hasStripe } from "@/lib/stripe";
import { confirmPaidBooking } from "@/lib/confirm-booking";
import { jsonError } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const schema = z.object({ bookingId: z.string().min(1) });

/** Used only when Stripe keys are not configured so local booking can be tested end-to-end. */
export async function POST(request: Request) {
  try {
    if (hasStripe()) {
      return jsonError("Demo confirmation is disabled when Stripe is configured.", 400);
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Missing booking.");

    const booking = await prisma.booking.findUnique({ where: { id: parsed.data.bookingId } });
    if (!booking) return jsonError("Booking not found.", 404);

    await confirmPaidBooking({ bookingId: booking.id });
    return Response.json({ ok: true, ticketCode: booking.ticketCode });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to confirm.", status);
  }
}

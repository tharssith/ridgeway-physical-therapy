import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { holdSlot } from "@/lib/holds";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  slotId: z.string().min(1),
  visitReason: z.string().min(8).max(500),
  visitType: z.enum(["FIRST_TIME", "RETURNING"]),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (session.role !== "PATIENT") {
      return jsonError("Only patients can book appointments.", 403);
    }
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("Please describe the reason for your visit (at least 8 characters).");
    }

    const result = await holdSlot({
      slotId: parsed.data.slotId,
      patientId: session.id,
      visitReason: parsed.data.visitReason,
      visitType: parsed.data.visitType,
      notes: parsed.data.notes,
    });

    return Response.json({
      bookingId: result.booking.id,
      slotId: result.slot.id,
      reused: result.reused,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to hold slot.", status);
  }
}

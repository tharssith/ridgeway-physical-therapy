import { z } from "zod";
import { holdSlot } from "@/lib/holds";
import { jsonError } from "@/lib/utils";
import { upsertGuestPatient, findPatientByNameAndPhone } from "@/lib/guest";
import { assertPhotoDataUrl } from "@/lib/patient";

const schema = z.object({
  slotId: z.string().min(1),
  visitReason: z.string().max(500).optional().default(""),
  visitType: z.enum(["FIRST_TIME", "RETURNING"]),
  notes: z.string().max(500).optional(),
  guest: z.object({
    name: z.string().min(2).max(80),
    phone: z.string().min(7).max(20),
    email: z.string().max(120).optional().default(""),
    address: z.string().min(8).max(200),
    photoUrl: z.string().min(20),
  }),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("Add your name, phone, address, and photo, then choose a time.");
    }

    try {
      assertPhotoDataUrl(parsed.data.guest.photoUrl);
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "Upload a smaller photo.");
    }

    const email = parsed.data.guest.email?.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonError("Enter a valid email, or leave it blank.");
    }

    const match = await findPatientByNameAndPhone(parsed.data.guest.name, parsed.data.guest.phone);
    const visitType = match ? "RETURNING" : "FIRST_TIME";

    const guest = await upsertGuestPatient({
      name: parsed.data.guest.name,
      phone: parsed.data.guest.phone,
      email,
      address: parsed.data.guest.address,
      photoUrl: parsed.data.guest.photoUrl,
    });

    const result = await holdSlot({
      slotId: parsed.data.slotId,
      patientId: guest.id,
      visitReason: parsed.data.visitReason.trim(),
      visitType,
      notes: parsed.data.notes,
    });

    return Response.json({
      bookingId: result.booking.id,
      ticketCode: result.booking.ticketCode,
      slotId: result.slot.id,
      reused: result.reused,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to hold slot.", status);
  }
}

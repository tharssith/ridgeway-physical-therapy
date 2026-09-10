import { z } from "zod";
import { jsonError } from "@/lib/utils";
import { findPatientByNameAndPhone, formatPhone } from "@/lib/guest";

const schema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(7).max(20),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return jsonError("Enter the patient’s name and a 10-digit phone number.");
    }

    const match = await findPatientByNameAndPhone(parsed.data.name, parsed.data.phone);
    if (!match) {
      return Response.json({
        match: false,
        visitType: "FIRST_TIME",
        message: "Name and phone are not in our records. This will be a first visit.",
      });
    }

    return Response.json({
      match: true,
      visitType: "RETURNING",
      message: "Name and phone match our records. This is a returning patient.",
      patient: {
        name: match.name,
        phone: formatPhone(match.phone) || match.phone,
        email: match.email,
        address: match.address,
        photoUrl: match.photoUrl,
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to verify that patient.", status);
  }
}

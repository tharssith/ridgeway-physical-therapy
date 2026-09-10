import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { assertPhotoDataUrl, dateOnly, parseDateOfBirth } from "@/lib/patient";

const schema = z.object({
  phone: z.string().min(7).max(20).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  photoUrl: z.string().min(20).optional(),
});

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Check your photo, date of birth, and phone number.");

    const data: { phone?: string; dateOfBirth?: Date; photoUrl?: string } = {};
    if (parsed.data.phone) data.phone = parsed.data.phone.trim();
    if (parsed.data.dateOfBirth) data.dateOfBirth = parseDateOfBirth(parsed.data.dateOfBirth);
    if (parsed.data.photoUrl) data.photoUrl = assertPhotoDataUrl(parsed.data.photoUrl);

    const user = await prisma.user.update({
      where: { id: session.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        dateOfBirth: true,
        photoUrl: true,
        memberNumber: true,
      },
    });

    return Response.json({
      user: {
        ...user,
        dateOfBirth: dateOnly(user.dateOfBirth),
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to update your card.", status);
  }
}

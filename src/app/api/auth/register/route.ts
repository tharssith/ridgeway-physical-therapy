import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { assertPhotoDataUrl, createMemberNumber, dateOnly, parseDateOfBirth } from "@/lib/patient";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z.string().min(7).max(20),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  photoUrl: z.string().min(20),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Add your name, email, phone, date of birth, photo, and a password (8+ characters).");
  }

  const email = parsed.data.email.toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return jsonError("An account with that email already exists.", 409);

  let dateOfBirth: Date;
  try {
    dateOfBirth = parseDateOfBirth(parsed.data.dateOfBirth);
    assertPhotoDataUrl(parsed.data.photoUrl);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Check your photo and date of birth.");
  }

  let user = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      user = await prisma.user.create({
        data: {
          name: parsed.data.name.trim(),
          email,
          phone: parsed.data.phone.trim(),
          dateOfBirth,
          photoUrl: parsed.data.photoUrl,
          memberNumber: createMemberNumber(),
          passwordHash: await hashPassword(parsed.data.password),
          role: "PATIENT",
        },
      });
      break;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2002") throw error;
    }
  }
  if (!user) return jsonError("Unable to create your patient card. Please try again.", 500);

  await setSessionCookie({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    dateOfBirth: dateOnly(user.dateOfBirth),
    photoUrl: user.photoUrl,
    memberNumber: user.memberNumber,
  });

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      dateOfBirth: dateOnly(user.dateOfBirth),
      photoUrl: user.photoUrl,
      memberNumber: user.memberNumber,
    },
  });
}

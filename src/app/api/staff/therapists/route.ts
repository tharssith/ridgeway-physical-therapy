import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, hashPassword } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { generateSlotsForWindow } from "@/lib/slots";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  specialty: z.string().min(2),
  credentials: z.string().min(2),
  bio: z.string().min(20),
  rate30: z.number().int().positive(),
  rate45: z.number().int().positive(),
  rate60: z.number().int().positive(),
  active: z.boolean().optional(),
  workingHours: z
    .array(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startMinutes: z.number().int().min(0),
        endMinutes: z.number().int().max(24 * 60),
        slotDuration: z.union([z.literal(30), z.literal(45), z.literal(60)]),
      }),
    )
    .min(1),
});

export async function GET() {
  try {
    await requireRole("ADMIN", "THERAPIST");
    const therapists = await prisma.therapist.findMany({
      include: {
        user: { select: { name: true, email: true, phone: true } },
        workingHours: { orderBy: { dayOfWeek: "asc" } },
      },
      orderBy: { user: { name: "asc" } },
    });
    return Response.json({ therapists });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole("ADMIN");
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Check therapist details and working hours.");

    const email = parsed.data.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return jsonError("That email is already in use.", 409);
    }

    const therapist = await prisma.therapist.create({
      data: {
        specialty: parsed.data.specialty,
        credentials: parsed.data.credentials,
        bio: parsed.data.bio,
        rate30: parsed.data.rate30,
        rate45: parsed.data.rate45,
        rate60: parsed.data.rate60,
        active: parsed.data.active ?? true,
        user: {
          create: {
            name: parsed.data.name,
            email,
            phone: parsed.data.phone,
            passwordHash: await hashPassword(parsed.data.password),
            role: "THERAPIST",
          },
        },
        workingHours: { create: parsed.data.workingHours },
      },
    });

    await generateSlotsForWindow();
    return Response.json({ therapist });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to create therapist.", status);
  }
}

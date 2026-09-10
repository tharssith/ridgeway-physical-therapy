import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { CLINIC, formatUsd } from "@/lib/clinic";
import { clinicDateKey } from "@/lib/slots";

export async function GET() {
  await getSession();
  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: {
      user: { select: { name: true } },
      slots: {
        where: { status: "AVAILABLE", startTime: { gte: new Date() } },
        orderBy: { startTime: "asc" },
        take: 1,
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return Response.json({
    therapists: therapists.map((t) => ({
      id: t.id,
      name: t.user.name,
      specialty: t.specialty,
      credentials: t.credentials,
      bio: t.bio,
      photoUrl: t.photoUrl,
      rates: {
        minutes30: t.rate30,
        minutes45: t.rate45,
        minutes60: t.rate60,
        label30: formatUsd(t.rate30),
        label45: formatUsd(t.rate45),
        label60: formatUsd(t.rate60),
      },
      nextAvailable: t.slots[0]
        ? {
            startTime: t.slots[0].startTime.toISOString(),
            dateKey: clinicDateKey(t.slots[0].startTime),
          }
        : null,
      timezone: CLINIC.timezone,
    })),
  });
}

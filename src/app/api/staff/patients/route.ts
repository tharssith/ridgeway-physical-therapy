import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function GET() {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const therapist =
      session.role === "THERAPIST"
        ? await prisma.therapist.findUnique({ where: { userId: session.id } })
        : null;

    const patients = await prisma.user.findMany({
      where: {
        role: "PATIENT",
        bookings: therapist ? { some: { therapistId: therapist.id } } : undefined,
      },
      include: {
        bookings: {
          where: therapist ? { therapistId: therapist.id } : undefined,
          include: { slot: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { name: "asc" },
    });

    return Response.json({
      patients: patients.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        bookingCount: p._count.bookings,
        lastVisit: p.bookings[0]?.slot.startTime.toISOString() ?? null,
      })),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

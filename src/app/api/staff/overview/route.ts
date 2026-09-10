import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function GET() {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const therapist =
      session.role === "THERAPIST"
        ? await prisma.therapist.findUnique({ where: { userId: session.id } })
        : null;

    const therapistFilter = therapist ? { therapistId: therapist.id } : {};
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [today, upcoming] = await Promise.all([
      prisma.booking.findMany({
        where: {
          ...therapistFilter,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          visitStart: { gte: todayStart, lte: todayEnd },
        },
        include: {
          patient: { select: { name: true, phone: true } },
          therapist: { include: { user: { select: { name: true } } } },
        },
        orderBy: { visitStart: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          ...therapistFilter,
          status: "CONFIRMED",
          visitStart: { gt: todayEnd, lte: addDays(todayEnd, 7) },
        },
        include: {
          patient: { select: { name: true } },
          therapist: { include: { user: { select: { name: true } } } },
        },
        orderBy: { visitStart: "asc" },
        take: 8,
      }),
    ]);

    return Response.json({
      today: today.map(mapBooking),
      upcoming: upcoming.map(mapBooking),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

function mapBooking(booking: {
  id: string;
  status: string;
  visitReason: string;
  visitStart: Date;
  visitEnd: Date;
  patient: { name: string; phone?: string | null };
  therapist: { user: { name: string } };
}) {
  return {
    id: booking.id,
    status: booking.status,
    patientName: booking.patient.name,
    patientPhone: booking.patient.phone ?? null,
    therapistName: booking.therapist.user.name,
    startTime: booking.visitStart.toISOString(),
    endTime: booking.visitEnd.toISOString(),
    visitReason: booking.visitReason,
  };
}

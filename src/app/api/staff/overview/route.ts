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

    const [today, upcoming, revenue] = await Promise.all([
      prisma.booking.findMany({
        where: {
          ...therapistFilter,
          status: { in: ["CONFIRMED", "COMPLETED"] },
          slot: { startTime: { gte: todayStart, lte: todayEnd } },
        },
        include: {
          patient: { select: { name: true, phone: true } },
          therapist: { include: { user: { select: { name: true } } } },
          slot: true,
          payment: true,
        },
        orderBy: { slot: { startTime: "asc" } },
      }),
      prisma.booking.findMany({
        where: {
          ...therapistFilter,
          status: "CONFIRMED",
          slot: { startTime: { gt: todayEnd, lte: addDays(todayEnd, 7) } },
        },
        include: {
          patient: { select: { name: true } },
          therapist: { include: { user: { select: { name: true } } } },
          slot: true,
        },
        orderBy: { slot: { startTime: "asc" } },
        take: 8,
      }),
      prisma.payment.aggregate({
        where: {
          status: "SUCCEEDED",
          booking: therapist ? { therapistId: therapist.id } : undefined,
          createdAt: { gte: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)) },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return Response.json({
      today: today.map(mapBooking),
      upcoming: upcoming.map(mapBooking),
      monthRevenue: revenue._sum.amount ?? 0,
      monthPayments: revenue._count,
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
  patient: { name: string; phone?: string | null };
  therapist: { user: { name: string } };
  slot: { startTime: Date; endTime: Date };
  payment?: { status: string; amount: number } | null;
}) {
  return {
    id: booking.id,
    status: booking.status,
    patientName: booking.patient.name,
    patientPhone: booking.patient.phone ?? null,
    therapistName: booking.therapist.user.name,
    startTime: booking.slot.startTime.toISOString(),
    endTime: booking.slot.endTime.toISOString(),
    visitReason: booking.visitReason,
    paymentStatus: booking.payment?.status ?? null,
    amount: booking.payment?.amount ?? null,
  };
}

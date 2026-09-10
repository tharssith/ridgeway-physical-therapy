import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const status = new URL(request.url).searchParams.get("status");
    const therapist =
      session.role === "THERAPIST"
        ? await prisma.therapist.findUnique({ where: { userId: session.id } })
        : null;

    const bookings = await prisma.booking.findMany({
      where: {
        therapistId: therapist?.id,
        status: status ? (status as "CONFIRMED") : undefined,
      },
      include: {
        patient: { select: { name: true, email: true, phone: true } },
        therapist: { include: { user: { select: { name: true } } } },
        slot: true,
        payment: true,
      },
      orderBy: { visitStart: "desc" },
      take: 100,
    });

    return Response.json({
      bookings: bookings.map((booking) => ({
        id: booking.id,
        ticketCode: booking.ticketCode,
        status: booking.status,
        patientName: booking.patient.name,
        patientEmail: booking.patient.email,
        patientPhone: booking.patient.phone,
        therapistName: booking.therapist.user.name,
        startTime: booking.visitStart.toISOString(),
        endTime: booking.visitEnd.toISOString(),
        visitReason: booking.visitReason,
        visitType: booking.visitType,
      })),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

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

    const payments = await prisma.payment.findMany({
      where: therapist ? { booking: { therapistId: therapist.id } } : undefined,
      include: {
        booking: {
          include: {
            patient: { select: { name: true } },
            therapist: { include: { user: { select: { name: true } } } },
            slot: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return Response.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        patientName: p.booking.patient.name,
        therapistName: p.booking.therapist.user.name,
        startTime: p.booking.slot.startTime.toISOString(),
        bookingId: p.bookingId,
        bookingStatus: p.booking.status,
      })),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

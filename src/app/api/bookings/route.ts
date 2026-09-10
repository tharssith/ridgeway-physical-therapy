import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { canRefundCancel, canReschedule } from "@/lib/booking-policy";
import { CLINIC } from "@/lib/clinic";

export async function GET() {
  try {
    const session = await requireSession();
    const bookings = await prisma.booking.findMany({
      where: { patientId: session.id },
      include: {
        slot: true,
        therapist: { include: { user: { select: { name: true } } } },
        payment: true,
      },
      orderBy: { visitStart: "desc" },
    });

    return Response.json({
      bookings: bookings.map((booking) => {
        const start = booking.visitStart;
        return {
        id: booking.id,
        status: booking.status,
        visitReason: booking.visitReason,
        visitType: booking.visitType,
        notes: booking.notes,
        startTime: start.toISOString(),
        endTime: booking.visitEnd.toISOString(),
        therapistName: booking.therapist.user.name,
        therapistCredentials: booking.therapist.credentials,
        specialty: booking.therapist.specialty,
        location: `${CLINIC.addressLine1}, ${CLINIC.addressLine2}`,
        paymentStatus: booking.payment?.status ?? null,
        amount: booking.payment?.amount ?? null,
        canCancel: booking.status === "CONFIRMED",
        refundEligible: booking.status === "CONFIRMED" && canRefundCancel(start),
        canReschedule: booking.status === "CONFIRMED" && canReschedule(start),
        cancellationHours: CLINIC.cancellationHours,
      };
      }),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { CLINIC, formatUsd, slotDurationMinutes } from "@/lib/clinic";
import { canRefundCancel, canReschedule } from "@/lib/booking-policy";
import { formatPhone } from "@/lib/guest";
import { ticketScanPath } from "@/lib/ticket";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        slot: true,
        patient: true,
        therapist: { include: { user: true } },
        payment: true,
      },
    });
    if (!booking) return jsonError("Booking not found.", 404);

    const isOwner = session?.id === booking.patientId;
    const isStaff = session?.role === "ADMIN" || session?.role === "THERAPIST";
    const publicCheckout =
      booking.status === "PENDING_PAYMENT" || booking.status === "CONFIRMED";
    if (!isOwner && !isStaff && !publicCheckout) return jsonError("Forbidden", 403);

    const duration = slotDurationMinutes(booking.visitStart, booking.visitEnd);

    return Response.json({
      booking: {
        id: booking.id,
        ticketCode: booking.ticketCode,
        ticketPath: ticketScanPath(booking.ticketCode),
        status: booking.status,
        visitReason: booking.visitReason,
        visitType: booking.visitType,
        notes: booking.notes,
        startTime: booking.visitStart.toISOString(),
        endTime: booking.visitEnd.toISOString(),
        duration,
        therapist: {
          id: booking.therapist.id,
          name: booking.therapist.user.name,
          credentials: booking.therapist.credentials,
          specialty: booking.therapist.specialty,
        },
        patient: {
          name: booking.patient.name,
          email: booking.patient.email,
          phone: formatPhone(booking.patient.phone),
          address: booking.patient.address,
          photoUrl: booking.patient.photoUrl,
        },
        location: `${CLINIC.addressLine1}, ${CLINIC.addressLine2}, ${CLINIC.city}, ${CLINIC.state} ${CLINIC.zip}`,
        payment: booking.payment
          ? {
              amount: booking.payment.amount,
              amountLabel: formatUsd(booking.payment.amount),
              status: booking.payment.status,
              currency: booking.payment.currency,
            }
          : null,
        refundEligible: booking.status === "CONFIRMED" && canRefundCancel(booking.visitStart),
        canReschedule: booking.status === "CONFIRMED" && canReschedule(booking.visitStart),
        cancellationHours: CLINIC.cancellationHours,
        heldUntil: booking.slot?.heldUntil?.toISOString() ?? null,
      },
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

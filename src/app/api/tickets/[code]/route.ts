import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/utils";
import { CLINIC, formatUsd, slotDurationMinutes } from "@/lib/clinic";
import { formatPhone } from "@/lib/guest";
import { normalizeTicketCode, ticketScanPath } from "@/lib/ticket";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const ticketCode = normalizeTicketCode(decodeURIComponent(code));
    if (!ticketCode) return jsonError("That ticket code is not valid.", 404);

    const booking = await prisma.booking.findUnique({
      where: { ticketCode },
      include: {
        patient: true,
        therapist: { include: { user: true } },
        payment: true,
      },
    });
    if (!booking) return jsonError("Ticket not found.", 404);

    return Response.json({
      ticket: {
        ticketCode: booking.ticketCode,
        ticketPath: ticketScanPath(booking.ticketCode),
        status: booking.status,
        visitReason: booking.visitReason,
        startTime: booking.visitStart.toISOString(),
        endTime: booking.visitEnd.toISOString(),
        duration: slotDurationMinutes(booking.visitStart, booking.visitEnd),
        location: `${CLINIC.addressLine1}, ${CLINIC.addressLine2}, ${CLINIC.city}, ${CLINIC.state} ${CLINIC.zip}`,
        cancellationHours: CLINIC.cancellationHours,
        therapist: {
          name: booking.therapist.user.name,
          credentials: booking.therapist.credentials,
          specialty: booking.therapist.specialty,
        },
        patient: {
          name: booking.patient.name,
          phone: formatPhone(booking.patient.phone),
          email: booking.patient.email,
          address: booking.patient.address,
          photoUrl: booking.patient.photoUrl,
        },
        payment: booking.payment
          ? {
              amountLabel: formatUsd(booking.payment.amount),
              status: booking.payment.status,
            }
          : null,
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to load that ticket.", 400);
  }
}

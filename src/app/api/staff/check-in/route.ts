import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { dateOnly, formatDob } from "@/lib/patient";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { formatPhone } from "@/lib/guest";
import { verifyPatientScanToken } from "@/lib/scan-token";
import { parseCheckInPayload } from "@/lib/scan-payload";
import { markVisitAttendance } from "@/lib/attendance";
import { normalizeTicketCode, verifyTicketScanToken } from "@/lib/ticket";

function serializeVisit(booking: {
  id: string;
  ticketCode: string;
  status: string;
  attendance: string;
  visitReason: string;
  visitStart: Date;
  visitEnd: Date;
  therapist: { user: { name: string }; credentials: string; specialty: string };
}) {
  return {
    id: booking.id,
    ticketCode: booking.ticketCode,
    status: booking.status,
    attendance: booking.attendance,
    visitReason: booking.visitReason,
    startTime: booking.visitStart.toISOString(),
    endTime: booking.visitEnd.toISOString(),
    therapistName: booking.therapist.user.name,
    therapistCredentials: booking.therapist.credentials,
    specialty: booking.therapist.specialty,
    location: clinicAddress(),
    canMark: booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT",
  };
}

function serializePatient(patient: {
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  dateOfBirth: Date | null;
  photoUrl: string | null;
  memberNumber: string;
}) {
  return {
    name: patient.name,
    phone: formatPhone(patient.phone) || patient.phone,
    email: patient.email,
    address: patient.address,
    dateOfBirthLabel: formatDob(dateOnly(patient.dateOfBirth)),
    photoUrl: patient.photoUrl,
    memberNumber: patient.memberNumber,
  };
}

const visitInclude = {
  therapist: { include: { user: { select: { name: true } } } },
} as const;

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN", "THERAPIST");
    const url = new URL(request.url);
    const typedCode = url.searchParams.get("code");
    const raw = url.searchParams.get("q");

    if (typedCode) {
      const ticketCode = normalizeTicketCode(typedCode);
      if (!ticketCode) return jsonError("Enter the 6-character ticket code from the visit ticket.", 400);
      const booking = await prisma.booking.findUnique({
        where: { ticketCode },
        include: {
          patient: true,
          ...visitInclude,
        },
      });
      if (!booking) return jsonError("No visit matches that ticket code.", 404);
      return Response.json({
        patient: serializePatient(booking.patient),
        visits: [serializeVisit(booking)],
        timezone: CLINIC.timezone,
      });
    }

    const parsed = raw ? parseCheckInPayload(raw) : null;
    if (!parsed) {
      return jsonError("Scan the ticket QR or enter the unique ticket code.", 400);
    }

    if (parsed.kind === "ticket" || parsed.kind === "code") {
      const ticketCode = normalizeTicketCode(parsed.kind === "ticket" ? parsed.code : parsed.code);
      if (!ticketCode) return jsonError("That ticket code is not valid.", 400);
      if (parsed.kind === "ticket" && parsed.token && !verifyTicketScanToken(ticketCode, parsed.token)) {
        return jsonError("That QR code is not a valid Ridgeway visit ticket.", 400);
      }
      const booking = await prisma.booking.findUnique({
        where: { ticketCode },
        include: {
          patient: true,
          ...visitInclude,
        },
      });
      if (!booking) return jsonError("No visit matches that ticket.", 404);
      return Response.json({
        patient: serializePatient(booking.patient),
        visits: [serializeVisit(booking)],
        timezone: CLINIC.timezone,
      });
    }

    if (!verifyPatientScanToken(parsed.memberNumber, parsed.token)) {
      return jsonError("That QR code is not a valid Ridgeway ticket.", 400);
    }

    const patient = await prisma.user.findUnique({
      where: { memberNumber: parsed.memberNumber },
      include: {
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            visitEnd: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          },
          include: visitInclude,
          orderBy: { visitStart: "asc" },
        },
      },
    });

    if (!patient || patient.role !== "PATIENT") {
      return jsonError("No patient matches that ticket.", 404);
    }

    return Response.json({
      patient: serializePatient(patient),
      visits: patient.bookings.map(serializeVisit),
      timezone: CLINIC.timezone,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unable to load that ticket.", status);
  }
}

const postSchema = z.object({
  bookingId: z.string().min(1),
  attendance: z.enum(["PRESENT", "ABSENT"]),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const parsed = postSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Choose present or absent for this visit.");

    const booking = await markVisitAttendance({
      bookingId: parsed.data.bookingId,
      attendance: parsed.data.attendance,
      staffId: session.id,
    });

    return Response.json({ ok: true, bookingId: booking.id, attendance: booking.attendance });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 400;
    return jsonError(error instanceof Error ? error.message : "Unable to mark attendance.", status);
  }
}

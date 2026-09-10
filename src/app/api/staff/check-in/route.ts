import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { dateOnly, formatDob } from "@/lib/patient";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { verifyPatientScanToken } from "@/lib/scan-token";
import { parsePatientScanPayload } from "@/lib/scan-payload";
import { markVisitAttendance } from "@/lib/attendance";

function serializeVisit(booking: {
  id: string;
  status: string;
  attendance: string;
  visitReason: string;
  visitStart: Date;
  visitEnd: Date;
  therapist: { user: { name: string }; credentials: string; specialty: string };
}) {
  return {
    id: booking.id,
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

export async function GET(request: Request) {
  try {
    await requireRole("ADMIN", "THERAPIST");
    const url = new URL(request.url);
    const raw = url.searchParams.get("q");
    const parsed = raw
      ? parsePatientScanPayload(raw)
      : {
          memberNumber: url.searchParams.get("memberNumber") ?? "",
          token: url.searchParams.get("t") ?? undefined,
        };
    if (!parsed?.memberNumber || !verifyPatientScanToken(parsed.memberNumber, parsed.token)) {
      return jsonError("That QR code is not a valid Ridgeway patient card.", 400);
    }

    const patient = await prisma.user.findUnique({
      where: { memberNumber: parsed.memberNumber },
      select: {
        id: true,
        name: true,
        phone: true,
        dateOfBirth: true,
        photoUrl: true,
        memberNumber: true,
        role: true,
        bookings: {
          where: {
            status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
            visitEnd: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          },
          include: {
            therapist: { include: { user: { select: { name: true } } } },
          },
          orderBy: { visitStart: "asc" },
        },
      },
    });

    if (!patient || patient.role !== "PATIENT" || !patient.memberNumber) {
      return jsonError("No patient matches that card.", 404);
    }

    return Response.json({
      patient: {
        name: patient.name,
        phone: patient.phone,
        dateOfBirth: dateOnly(patient.dateOfBirth),
        dateOfBirthLabel: formatDob(dateOnly(patient.dateOfBirth)),
        photoUrl: patient.photoUrl,
        memberNumber: patient.memberNumber,
      },
      visits: patient.bookings.map(serializeVisit),
      timezone: CLINIC.timezone,
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unable to load that card.", status);
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

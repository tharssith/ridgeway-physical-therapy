import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { addDays } from "date-fns";

export async function GET(request: Request) {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const date = new URL(request.url).searchParams.get("date");
    const therapistId = new URL(request.url).searchParams.get("therapistId");

    const self =
      session.role === "THERAPIST"
        ? await prisma.therapist.findUnique({ where: { userId: session.id } })
        : null;

    const day = date ? new Date(`${date}T12:00:00`) : new Date();
    const start = addDays(day, -1);
    const end = addDays(day, 2);

    const slots = await prisma.availabilitySlot.findMany({
      where: {
        therapistId: self?.id ?? therapistId ?? undefined,
        startTime: { gte: start, lte: end },
      },
      include: {
        therapist: { include: { user: { select: { name: true } } } },
        booking: {
          include: { patient: { select: { name: true, phone: true } }, payment: true },
        },
      },
      orderBy: [{ therapistId: "asc" }, { startTime: "asc" } ],
    });

    const blocks = await prisma.blockedTime.findMany({
      where: {
        therapistId: self?.id ?? therapistId ?? undefined,
        startTime: { lte: end },
        endTime: { gte: start },
      },
      include: { therapist: { include: { user: { select: { name: true } } } } },
      orderBy: { startTime: "asc" },
    });

    return Response.json({
      slots: slots.map((slot) => ({
        id: slot.id,
        therapistId: slot.therapistId,
        therapistName: slot.therapist.user.name,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        status: slot.status,
        patientName: slot.booking?.patient.name ?? null,
        patientPhone: slot.booking?.patient.phone ?? null,
        paymentStatus: slot.booking?.payment?.status ?? null,
        bookingId: slot.booking?.id ?? null,
      })),
      blocks: blocks.map((block) => ({
        id: block.id,
        therapistId: block.therapistId,
        therapistName: block.therapist.user.name,
        startTime: block.startTime.toISOString(),
        endTime: block.endTime.toISOString(),
        reason: block.reason,
      })),
    });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

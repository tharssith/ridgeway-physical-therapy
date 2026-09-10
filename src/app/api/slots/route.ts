import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { serializeSlot } from "@/lib/slots";
import { releaseExpiredHolds } from "@/lib/holds";
import { jsonError } from "@/lib/utils";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const therapistId = searchParams.get("therapistId");
  const date = searchParams.get("date");
  if (!therapistId || !date) {
    return jsonError("therapistId and date are required.");
  }

  await releaseExpiredHolds();
  const session = await getSession();

  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(`${date}T23:59:59.999Z`);
  // Expand window so clinic-timezone days near UTC boundaries are included
  start.setUTCHours(start.getUTCHours() - 12);
  end.setUTCHours(end.getUTCHours() + 12);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      therapistId,
      startTime: { gte: start, lte: end, gt: new Date() },
      status: { in: ["AVAILABLE", "HELD", "BOOKED"] },
    },
    orderBy: { startTime: "asc" },
  });

  const visible = slots.filter((slot) => {
    const key = new Date(slot.startTime).toLocaleDateString("en-CA", {
      timeZone: process.env.CLINIC_TZ ?? "America/Los_Angeles",
    });
    return key === date;
  });

  return Response.json({
    slots: visible.map((slot) => serializeSlot(slot, session?.id)),
  });
}

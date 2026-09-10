import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { jsonError } from "@/lib/utils";
import { emitSerializedSlot } from "@/lib/slots";

const schema = z.object({
  therapistId: z.string().optional(),
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().min(2).max(200),
});

export async function POST(request: Request) {
  try {
    const session = await requireRole("ADMIN", "THERAPIST");
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return jsonError("Provide a start time, end time, and reason.");

    const self =
      session.role === "THERAPIST"
        ? await prisma.therapist.findUnique({ where: { userId: session.id } })
        : null;
    const therapistId = self?.id ?? parsed.data.therapistId;
    if (!therapistId) return jsonError("Select a therapist.");

    const startTime = new Date(parsed.data.startTime);
    const endTime = new Date(parsed.data.endTime);
    if (!(startTime < endTime)) return jsonError("End time must be after start time.");

    const block = await prisma.blockedTime.create({
      data: {
        therapistId,
        startTime,
        endTime,
        reason: parsed.data.reason,
      },
    });

    const overlapping = await prisma.availabilitySlot.findMany({
      where: {
        therapistId,
        status: "AVAILABLE",
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    for (const slot of overlapping) {
      const updated = await prisma.availabilitySlot.update({
        where: { id: slot.id },
        data: { status: "CANCELLED" },
      });
      emitSerializedSlot(updated);
    }

    return Response.json({ block });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unable to block time.", status);
  }
}

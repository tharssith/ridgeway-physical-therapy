import { requireRole } from "@/lib/auth";
import { generateSlotsForWindow } from "@/lib/slots";
import { jsonError } from "@/lib/utils";

export async function POST() {
  try {
    await requireRole("ADMIN");
    const created = await generateSlotsForWindow();
    return Response.json({ created });
  } catch (error) {
    const status = (error as { status?: number }).status ?? 401;
    return jsonError(error instanceof Error ? error.message : "Unauthorized", status);
  }
}

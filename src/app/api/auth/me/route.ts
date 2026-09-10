import { getSession } from "@/lib/auth";
import { patientScanPath } from "@/lib/scan-token";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ user: null });
  return Response.json({
    user: {
      ...user,
      scanPath: user.memberNumber ? patientScanPath(user.memberNumber) : "",
    },
  });
}

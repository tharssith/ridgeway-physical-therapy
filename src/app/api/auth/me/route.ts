import { getSession } from "@/lib/auth";

export async function GET() {
  const user = await getSession();
  return Response.json({ user });
}

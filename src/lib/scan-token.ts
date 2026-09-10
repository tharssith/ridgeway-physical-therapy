import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.JWT_SECRET ?? "dev-only-not-for-prod";
}

export function patientScanToken(memberNumber: string) {
  return createHmac("sha256", secret())
    .update(`ridgeway-card:${memberNumber}`)
    .digest("base64url")
    .slice(0, 24);
}

export function patientScanPath(memberNumber: string) {
  return `/scan/${encodeURIComponent(memberNumber)}?t=${patientScanToken(memberNumber)}`;
}

export function verifyPatientScanToken(memberNumber: string, token: string | undefined) {
  if (!token) return false;
  const expected = patientScanToken(memberNumber);
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

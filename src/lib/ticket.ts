import { createHmac, randomInt, timingSafeEqual } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secret() {
  return process.env.JWT_SECRET ?? "dev-only-not-for-prod";
}

export function createTicketCode() {
  let body = "";
  for (let i = 0; i < 6; i += 1) {
    body += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `RPT-${body}`;
}

export function normalizeTicketCode(raw: string) {
  const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.length === 6) return `RPT-${compact}`;
  if (compact.startsWith("RPT") && compact.length === 9) return `RPT-${compact.slice(3)}`;
  return null;
}

export function ticketScanToken(ticketCode: string) {
  return createHmac("sha256", secret())
    .update(`ridgeway-ticket:${ticketCode}`)
    .digest("base64url")
    .slice(0, 24);
}

export function ticketScanPath(ticketCode: string) {
  return `/book/ticket/${encodeURIComponent(ticketCode)}?t=${ticketScanToken(ticketCode)}`;
}

export function verifyTicketScanToken(ticketCode: string, token: string | undefined) {
  if (!token) return false;
  const expected = ticketScanToken(ticketCode);
  const left = Buffer.from(expected);
  const right = Buffer.from(token);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

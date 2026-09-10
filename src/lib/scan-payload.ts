export function parseCheckInPayload(raw: string) {
  const text = raw.trim();
  try {
    const url = new URL(text, "https://ridgeway-physical-therapy.vercel.app");
    const parts = url.pathname.split("/").filter(Boolean);
    const ticketIndex = parts.indexOf("ticket");
    if (ticketIndex !== -1 && parts[ticketIndex + 1]) {
      return {
        kind: "ticket" as const,
        code: decodeURIComponent(parts[ticketIndex + 1]).toUpperCase(),
        token: url.searchParams.get("t") ?? undefined,
      };
    }
    const scanIndex = parts.indexOf("scan");
    if (scanIndex !== -1 && parts[scanIndex + 1]) {
      return {
        kind: "member" as const,
        memberNumber: decodeURIComponent(parts[scanIndex + 1]),
        token: url.searchParams.get("t") ?? undefined,
      };
    }
  } catch {
    // fall through to raw code parsing
  }

  const compact = text.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!compact) return null;
  return {
    kind: "code" as const,
    code: compact,
  };
}

export function parsePatientScanPayload(raw: string) {
  const parsed = parseCheckInPayload(raw);
  if (!parsed) return null;
  if (parsed.kind === "member") {
    return { memberNumber: parsed.memberNumber, token: parsed.token };
  }
  return null;
}

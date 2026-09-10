export function parsePatientScanPayload(raw: string) {
  const text = raw.trim();
  try {
    const url = new URL(text, "https://ridgeway-physical-therapy.vercel.app");
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.indexOf("scan");
    if (index === -1 || !parts[index + 1]) return null;
    return {
      memberNumber: decodeURIComponent(parts[index + 1]),
      token: url.searchParams.get("t") ?? undefined,
    };
  } catch {
    return null;
  }
}

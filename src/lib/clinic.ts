export const CLINIC = {
  name: "Ridgeway Physical Therapy",
  shortName: "Ridgeway PT",
  tagline: "Physical therapy, scheduled around you.",
  addressLine1: "1840 Westlake Avenue North",
  addressLine2: "Suite 210",
  city: "Seattle",
  state: "WA",
  zip: "98109",
  phone: "(206) 555-0148",
  phoneHref: "tel:+12065550148",
  email: "scheduling@ridgewaypt.com",
  timezone: process.env.CLINIC_TZ ?? "America/Los_Angeles",
  holdMinutes: Number(process.env.HOLD_MINUTES ?? 8),
  cancellationHours: Number(process.env.CANCELLATION_HOURS ?? 24),
  slotWindowWeeks: 4,
} as const;

export const SPECIALTIES = [
  "Orthopedic",
  "Sports",
  "Neurological",
  "Vestibular",
] as const;

export function clinicAddress() {
  const { addressLine1, addressLine2, city, state, zip } = CLINIC;
  return `${addressLine1}, ${addressLine2}, ${city}, ${state} ${zip}`;
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function rateForDuration(
  rates: { rate30: number; rate45: number; rate60: number },
  durationMin: number,
) {
  if (durationMin <= 30) return rates.rate30;
  if (durationMin <= 45) return rates.rate45;
  return rates.rate60;
}

export function slotDurationMinutes(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

import { randomInt } from "crypto";

export function createMemberNumber() {
  return `RPT${randomInt(10_000_000, 100_000_000)}`;
}

export function dateOnly(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

export function parseDateOfBirth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw Object.assign(new Error("Enter a valid date of birth."), { status: 400 });
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  const now = new Date();
  const age = now.getUTCFullYear() - date.getUTCFullYear();
  if (Number.isNaN(date.getTime()) || age < 5 || age > 110) {
    throw Object.assign(new Error("Enter a valid date of birth."), { status: 400 });
  }
  return date;
}

export function assertPhotoDataUrl(value: string) {
  if (!value.startsWith("data:image/") || value.length > 280_000) {
    throw Object.assign(new Error("Upload a smaller photo (JPG or PNG)."), { status: 400 });
  }
  return value;
}

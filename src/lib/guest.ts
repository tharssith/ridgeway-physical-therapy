import { prisma } from "@/lib/prisma";
import { assertPhotoDataUrl, createMemberNumber } from "@/lib/patient";

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function phoneDigitsOrNull(value: string) {
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return national.length === 10 ? national : null;
}

export function normalizePhone(value: string) {
  const national = phoneDigitsOrNull(value);
  if (!national) {
    throw Object.assign(new Error("Enter a 10-digit US phone number."), { status: 400 });
  }
  return national;
}

export function formatPhone(digits: string | null | undefined) {
  if (!digits) return "";
  const value = digits.replace(/\D/g, "");
  if (value.length !== 10) return digits;
  return `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
}

export type MatchedPatient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  photoUrl: string | null;
};

export async function findPatientByNameAndPhone(name: string, phone: string) {
  const digits = phoneDigitsOrNull(phone);
  const wantName = normalizeName(name);
  if (!digits || wantName.length < 2) return null;

  const rows = await prisma.$queryRaw<MatchedPatient[]>`
    SELECT id, name, email, phone, address, "photoUrl"
    FROM "User"
    WHERE role = 'PATIENT'
      AND RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = ${digits}
  `;

  return rows.find((row) => normalizeName(row.name) === wantName) ?? null;
}

export async function upsertGuestPatient(details: {
  name: string;
  phone: string;
  email?: string;
  address: string;
  photoUrl: string;
}) {
  const name = details.name.trim();
  const phone = normalizePhone(details.phone);
  const address = details.address.trim();
  const email = details.email?.trim().toLowerCase() || null;
  assertPhotoDataUrl(details.photoUrl);

  if (name.length < 2) {
    throw Object.assign(new Error("Enter the patient’s full name."), { status: 400 });
  }
  if (address.length < 8) {
    throw Object.assign(new Error("Enter a street address."), { status: 400 });
  }

  const existing = await findPatientByNameAndPhone(name, phone);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        phone,
        address,
        photoUrl: details.photoUrl,
        email: email ?? existing.email,
      },
    });
  }

  if (email) {
    const taken = await prisma.user.findFirst({ where: { email } });
    if (taken) {
      throw Object.assign(new Error("That email is already in use. Leave it blank or use another."), {
        status: 409,
      });
    }
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await prisma.user.create({
        data: {
          name,
          email,
          phone,
          address,
          photoUrl: details.photoUrl,
          memberNumber: createMemberNumber(),
          role: "PATIENT",
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }

  throw Object.assign(new Error("Unable to save your details. Please try again."), { status: 500 });
}

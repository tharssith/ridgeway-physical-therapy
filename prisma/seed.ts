import { PrismaClient, type VisitType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addMinutes, format, setHours, setMinutes } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { createMemberNumber } from "../src/lib/patient";
import { createTicketCode } from "../src/lib/ticket";

const prisma = new PrismaClient();
const TZ = process.env.CLINIC_TZ ?? "America/Los_Angeles";
const PASSWORD = "Clinic123!";

function local(date: Date, hours: number, minutes = 0) {
  const zoned = toZonedTime(date, TZ);
  const stamped = setMinutes(setHours(zoned, hours), minutes);
  return fromZonedTime(stamped, TZ);
}

async function main() {
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.availabilitySlot.deleteMany();
  await prisma.blockedTime.deleteMany();
  await prisma.workingHours.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinicSettings.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  await prisma.clinicSettings.create({
    data: {
      name: "Ridgeway Physical Therapy",
      addressLine1: "1840 Westlake Avenue North",
      addressLine2: "Suite 210",
      city: "Seattle",
      state: "WA",
      zip: "98109",
      phone: "(206) 555-0148",
      cancellationHours: 24,
      holdMinutes: 8,
      slotWindowWeeks: 4,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Clinic Administrator",
      email: "admin@ridgewaypt.com",
      passwordHash,
      role: "ADMIN",
      phone: "(206) 555-0100",
      memberNumber: createMemberNumber(),
    },
  });

  const patientA = await prisma.user.create({
    data: {
      name: "Daniel Whitaker",
      email: "patient@ridgewaypt.com",
      passwordHash,
      role: "PATIENT",
      phone: "(206) 555-0199",
      dateOfBirth: new Date("1988-04-12T00:00:00.000Z"),
      memberNumber: createMemberNumber(),
    },
  });

  const patientB = await prisma.user.create({
    data: {
      name: "Sofia Alvarez",
      email: "sofia.alvarez@example.com",
      passwordHash,
      role: "PATIENT",
      phone: "(206) 555-0172",
      dateOfBirth: new Date("1994-09-03T00:00:00.000Z"),
      memberNumber: createMemberNumber(),
    },
  });

  const therapists = [
    {
      name: "Maya Chen",
      email: "maya.chen@ridgewaypt.com",
      phone: "(206) 555-0111",
      specialty: "Orthopedic",
      credentials: "DPT, OCS",
      bio: "Dr. Chen treats post-operative joints, spine pain, and overuse injuries. She has practiced in Seattle for 11 years and completed an orthopedic residency at the University of Washington.",
      rate30: 9500,
      rate45: 13000,
      rate60: 16500,
      hours: [
        { dayOfWeek: 1, startMinutes: 8 * 60, endMinutes: 16 * 60, slotDuration: 45 },
        { dayOfWeek: 2, startMinutes: 8 * 60, endMinutes: 16 * 60, slotDuration: 45 },
        { dayOfWeek: 3, startMinutes: 8 * 60, endMinutes: 16 * 60, slotDuration: 45 },
        { dayOfWeek: 4, startMinutes: 8 * 60, endMinutes: 16 * 60, slotDuration: 45 },
        { dayOfWeek: 5, startMinutes: 8 * 60, endMinutes: 14 * 60, slotDuration: 45 },
      ],
    },
    {
      name: "James Okonkwo",
      email: "james.okonkwo@ridgewaypt.com",
      phone: "(206) 555-0112",
      specialty: "Sports",
      credentials: "DPT, SCS",
      bio: "Dr. Okonkwo works with runners, climbers, and field athletes. He previously served as a physical therapist for collegiate athletics and focuses on return-to-sport planning.",
      rate30: 10000,
      rate45: 14000,
      rate60: 17500,
      hours: [
        { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 30 },
        { dayOfWeek: 2, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 30 },
        { dayOfWeek: 3, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 30 },
        { dayOfWeek: 4, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 30 },
        { dayOfWeek: 6, startMinutes: 8 * 60, endMinutes: 12 * 60, slotDuration: 30 },
      ],
    },
    {
      name: "Priya Raman",
      email: "priya.raman@ridgewaypt.com",
      phone: "(206) 555-0113",
      specialty: "Neurological",
      credentials: "PT, DPT, NCS",
      bio: "Dr. Raman specializes in stroke, Parkinson’s disease, and balance disorders. Sessions are 60 minutes to allow thorough gait and transfer work.",
      rate30: 11000,
      rate45: 14500,
      rate60: 18000,
      hours: [
        { dayOfWeek: 2, startMinutes: 10 * 60, endMinutes: 18 * 60, slotDuration: 60 },
        { dayOfWeek: 3, startMinutes: 10 * 60, endMinutes: 18 * 60, slotDuration: 60 },
        { dayOfWeek: 4, startMinutes: 10 * 60, endMinutes: 18 * 60, slotDuration: 60 },
        { dayOfWeek: 5, startMinutes: 10 * 60, endMinutes: 16 * 60, slotDuration: 60 },
      ],
    },
    {
      name: "Elena Vasquez",
      email: "elena.vasquez@ridgewaypt.com",
      phone: "(206) 555-0114",
      specialty: "Vestibular",
      credentials: "DPT, GCS",
      bio: "Dr. Vasquez treats dizziness, concussion, and fall-risk patients. She completed vestibular competency training and works closely with local ENT physicians.",
      rate30: 9800,
      rate45: 13500,
      rate60: 17000,
      hours: [
        { dayOfWeek: 1, startMinutes: 8 * 60 + 30, endMinutes: 15 * 60 + 30, slotDuration: 45 },
        { dayOfWeek: 3, startMinutes: 8 * 60 + 30, endMinutes: 15 * 60 + 30, slotDuration: 45 },
        { dayOfWeek: 5, startMinutes: 8 * 60 + 30, endMinutes: 15 * 60 + 30, slotDuration: 45 },
      ],
    },
  ];

  const createdTherapists = [];
  for (const t of therapists) {
    const user = await prisma.user.create({
      data: {
        name: t.name,
        email: t.email,
        passwordHash,
        role: "THERAPIST",
        phone: t.phone,
        memberNumber: createMemberNumber(),
      },
    });
    const therapist = await prisma.therapist.create({
      data: {
        userId: user.id,
        specialty: t.specialty,
        credentials: t.credentials,
        bio: t.bio,
        rate30: t.rate30,
        rate45: t.rate45,
        rate60: t.rate60,
        workingHours: { create: t.hours },
      },
    });
    createdTherapists.push({ ...therapist, hours: t.hours, name: t.name });
  }

  const now = new Date();
  const zonedNow = toZonedTime(now, TZ);
  zonedNow.setHours(0, 0, 0, 0);

  const slotRows: Array<{
    therapistId: string;
    startTime: Date;
    endTime: Date;
    status: "AVAILABLE";
  }> = [];

  for (const therapist of createdTherapists) {
    for (let i = 0; i < 28; i++) {
      const day = addDays(zonedNow, i);
      const dateKey = format(day, "yyyy-MM-dd");
      const dow = day.getDay();
      const hours = therapist.hours.find((h) => h.dayOfWeek === dow);
      if (!hours) continue;

      for (
        let cursor = hours.startMinutes;
        cursor + hours.slotDuration <= hours.endMinutes;
        cursor += hours.slotDuration
      ) {
        const hh = Math.floor(cursor / 60);
        const mm = cursor % 60;
        const startTime = fromZonedTime(
          `${dateKey}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00`,
          TZ,
        );
        const endTime = addMinutes(startTime, hours.slotDuration);
        if (endTime <= now) continue;

        slotRows.push({
          therapistId: therapist.id,
          startTime,
          endTime,
          status: "AVAILABLE",
        });
      }
    }
  }

  const chunkSize = 200;
  for (let i = 0; i < slotRows.length; i += chunkSize) {
    await prisma.availabilitySlot.createMany({
      data: slotRows.slice(i, i + chunkSize),
      skipDuplicates: true,
    });
  }

  const maya = createdTherapists[0];
  const james = createdTherapists[1];

  async function bookSlot(opts: {
    therapistId: string;
    patientId: string;
    start: Date;
    duration: number;
    status: "CONFIRMED" | "COMPLETED";
    visitType: VisitType;
    reason: string;
    amount: number;
  }) {
    const end = addMinutes(opts.start, opts.duration);
    const slot = await prisma.availabilitySlot.upsert({
      where: {
        therapistId_startTime: { therapistId: opts.therapistId, startTime: opts.start },
      },
      update: { status: "BOOKED", endTime: end },
      create: {
        therapistId: opts.therapistId,
        startTime: opts.start,
        endTime: end,
        status: "BOOKED",
      },
    });

    await prisma.booking.create({
      data: {
        slotId: slot.id,
        patientId: opts.patientId,
        therapistId: opts.therapistId,
        status: opts.status,
        visitStart: slot.startTime,
        visitEnd: slot.endTime,
        visitReason: opts.reason,
        visitType: opts.visitType,
        ticketCode: createTicketCode(),
        payment: {
          create: {
            amount: opts.amount,
            currency: "usd",
            status: "SUCCEEDED",
            stripePaymentIntentId: `pi_seed_${slot.id}`,
          },
        },
      },
    });
  }

  await bookSlot({
    therapistId: maya.id,
    patientId: patientA.id,
    start: addDays(local(now, 9, 0), 2),
    duration: 45,
    status: "CONFIRMED",
    visitType: "RETURNING",
    reason: "Right knee after ACL reconstruction, week 8",
    amount: 13000,
  });

  await bookSlot({
    therapistId: james.id,
    patientId: patientB.id,
    start: addDays(local(now, 10, 0), 1),
    duration: 30,
    status: "CONFIRMED",
    visitType: "FIRST_TIME",
    reason: "Achilles tendon pain with running",
    amount: 10000,
  });

  await bookSlot({
    therapistId: maya.id,
    patientId: patientA.id,
    start: addDays(local(now, 11, 0), -10),
    duration: 45,
    status: "COMPLETED",
    visitType: "RETURNING",
    reason: "Right knee after ACL reconstruction, week 6",
    amount: 13000,
  });

  await prisma.blockedTime.create({
    data: {
      therapistId: maya.id,
      startTime: addDays(local(now, 12, 0), 5),
      endTime: addDays(local(now, 13, 30), 5),
      reason: "Charting / lunch",
    },
  });

  console.log("Seeded Ridgeway Physical Therapy");
  console.log("  Admin     admin@ridgewaypt.com / Clinic123!");
  console.log("  Patient   patient@ridgewaypt.com / Clinic123!");
  console.log("  Therapist maya.chen@ridgewaypt.com / Clinic123!");
  console.log(`  Users: admin ${admin.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";
import { dateOnly, formatDob } from "@/lib/patient";
import { verifyPatientScanToken } from "@/lib/scan-token";

function visitDate(iso: Date) {
  return iso.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: CLINIC.timezone,
  });
}

function visitTime(iso: Date) {
  return iso.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });
}

export default async function ScanPatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberNumber: string }>;
  searchParams: Promise<{ t?: string | string[] }>;
}) {
  const { memberNumber } = await params;
  const query = await searchParams;
  const token = Array.isArray(query.t) ? query.t[0] : query.t;
  if (!verifyPatientScanToken(memberNumber, token)) notFound();

  const patient = await prisma.user.findUnique({
    where: { memberNumber },
    select: {
      name: true,
      phone: true,
      dateOfBirth: true,
      photoUrl: true,
      memberNumber: true,
      role: true,
      bookings: {
        where: {
          status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
          slot: { startTime: { gt: new Date() } },
        },
        include: {
          slot: true,
          therapist: { include: { user: { select: { name: true } } } },
        },
        orderBy: { slot: { startTime: "asc" } },
        take: 1,
      },
    },
  });

  if (!patient || patient.role !== "PATIENT" || !patient.memberNumber) notFound();

  const nextVisit = patient.bookings[0];
  const dob = dateOnly(patient.dateOfBirth);

  return (
    <div className="flex min-h-full flex-col overflow-x-hidden">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Front desk check-in
        </p>
        <h1 className="mt-1 font-heading text-3xl font-extrabold">Patient information</h1>
        <p className="mt-2 text-ink-soft">{CLINIC.name}</p>

        <Card className="mt-6 overflow-hidden p-0">
          <div className="flex items-center gap-4 bg-primary px-5 py-4 text-white">
            <div className="h-20 w-20 overflow-hidden rounded-[16px] bg-white/15">
              {patient.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={patient.photoUrl} alt={patient.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-extrabold">
                  {initials(patient.name)}
                </div>
              )}
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold leading-tight">{patient.name}</p>
              <p className="mt-1 text-sm text-white/80">{patient.memberNumber}</p>
            </div>
          </div>
          <dl className="grid gap-4 p-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Date of birth
              </dt>
              <dd className="mt-1 font-semibold">{formatDob(dob)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Phone</dt>
              <dd className="mt-1 font-semibold">{patient.phone || "No phone on file"}</dd>
            </div>
          </dl>
        </Card>

        <section className="mt-6">
          <h2 className="font-heading text-xl font-bold">Upcoming appointment</h2>
          {nextVisit ? (
            <Card className="mt-3 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                {visitDate(nextVisit.slot.startTime)}
              </p>
              <p className="mt-1 font-heading text-2xl font-extrabold">
                {visitTime(nextVisit.slot.startTime)} – {visitTime(nextVisit.slot.endTime)}
              </p>
              <p className="mt-2 text-lg">{nextVisit.therapist.user.name}</p>
              <p className="text-sm text-ink-soft">{clinicAddress()}</p>
              {nextVisit.status === "PENDING_PAYMENT" ? (
                <Badge className="mt-3" tone="held">
                  Payment pending
                </Badge>
              ) : (
                <Badge className="mt-3" tone="success">
                  Confirmed
                </Badge>
              )}
            </Card>
          ) : (
            <p className="mt-3 text-ink-soft">No upcoming appointments on file.</p>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

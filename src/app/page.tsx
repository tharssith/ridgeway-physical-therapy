import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";
import { TherapistAvatar } from "@/components/therapist-avatar";
import { formatUsd } from "@/lib/clinic";

export default async function HomePage() {
  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_0.8fr] md:py-20">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                Seattle · Westlake
              </p>
              <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
                {CLINIC.tagline}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                See live openings with licensed Doctors of Physical Therapy, hold a time while you
                complete payment, and receive a written confirmation for your visit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/book">Find an appointment</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/login">Patient sign in</Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                {clinicAddress()} · {CLINIC.phone}
              </p>
            </div>
            <Card className="p-6 md:p-8">
              <h2 className="text-lg font-semibold">Before you book</h2>
              <ul className="mt-4 space-y-3 text-[15px] text-muted-foreground">
                <li>Appointments are self-pay. We do not bill insurance in this portal.</li>
                <li>A time is held for {CLINIC.holdMinutes} minutes once you begin checkout.</li>
                <li>
                  Full refund if you cancel at least {CLINIC.cancellationHours} hours before your
                  visit.
                </li>
                <li>Arrive 10 minutes early. Bring photo ID and a list of current medications.</li>
              </ul>
            </Card>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Our therapists</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Each clinician sets their own session length and rate. Credentials are listed as they
            appear on Washington state licensure records.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {therapists.map((therapist) => (
              <Card key={therapist.id} className="flex gap-4 p-5">
                <TherapistAvatar name={therapist.user.name} />
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-tight">{therapist.user.name}</p>
                  <p className="text-sm text-primary">
                    {therapist.credentials} · {therapist.specialty}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{therapist.bio}</p>
                  <p className="mt-3 text-sm">
                    {formatUsd(therapist.rate30)} / 30 min · {formatUsd(therapist.rate45)} / 45 min ·{" "}
                    {formatUsd(therapist.rate60)} / 60 min
                  </p>
                </div>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <Button asChild>
              <Link href="/book">View live availability</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HomeCheckIn } from "@/components/home-check-in";
import { HomeSearchBar } from "@/components/home-search-bar";
import { TherapistDirectory } from "@/components/therapist-directory";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { prisma } from "@/lib/prisma";

export default async function HomePage() {
  const therapists = await prisma.therapist.findMany({
    where: { active: true },
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const zoned = toZonedTime(new Date(), CLINIC.timezone);
  const dateKey = format(zoned, "yyyy-MM-dd");
  const dayStart = fromZonedTime(`${dateKey}T00:00:00`, CLINIC.timezone);
  const dayEnd = fromZonedTime(`${dateKey}T23:59:59`, CLINIC.timezone);
  const openingsToday = await prisma.availabilitySlot.count({
    where: {
      status: "AVAILABLE",
      startTime: { gte: dayStart, lte: dayEnd },
    },
  });

  return (
    <div className="flex min-h-full flex-col overflow-x-hidden">
      <SiteHeader />
      <main>
        <section
          className="px-4 pb-24 pt-16 text-white md:pt-20"
          style={{
            background: "linear-gradient(135deg, #2B4C8C 0%, #3D6BB5 48%, #6B8FCE 100%)",
          }}
        >
          <div className="mx-auto max-w-6xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-medium">
              <span className="h-2 w-2 rounded-full bg-[#7DDAA5]" />
              {openingsToday} openings today in {CLINIC.city}
            </p>
            <h1 className="mt-5 max-w-2xl font-heading text-4xl font-extrabold leading-[1.12] md:text-6xl">
              {CLINIC.tagline}
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/85">
              Live openings with licensed DPTs. Choose a time, add your details, pay, and keep the
              visit ticket on your phone.
            </p>
            <HomeCheckIn />
            <p className="mt-6 text-sm text-white/75">
              {clinicAddress()} · {CLINIC.phone}
            </p>
          </div>
        </section>

        <div className="px-4">
          <HomeSearchBar />
        </div>

        <section className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-14 md:grid-cols-4">
          <div>
            <p className="font-heading text-3xl font-extrabold">{therapists.length}</p>
            <p className="mt-1 text-sm text-ink-soft">Licensed therapists</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-extrabold">{CLINIC.holdMinutes} min</p>
            <p className="mt-1 text-sm text-ink-soft">Average hold time</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-extrabold">{CLINIC.cancellationHours}h</p>
            <p className="mt-1 text-sm text-ink-soft">Free cancellation window</p>
          </div>
          <div>
            <p className="font-heading text-3xl font-extrabold">4.9</p>
            <p className="mt-1 text-sm text-ink-soft">Patient rating</p>
          </div>
        </section>

        <TherapistDirectory
          therapists={therapists.map((therapist) => ({
            id: therapist.id,
            name: therapist.user.name,
            specialty: therapist.specialty,
            credentials: therapist.credentials,
            photoUrl: therapist.photoUrl,
            rate45: therapist.rate45,
          }))}
        />

        <section id="how-it-works" className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="font-heading text-3xl font-extrabold">How it works</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-4">
            {[
              { n: "1", t: "Choose a time", d: "Filter by specialty and pick a live opening with a licensed DPT." },
              { n: "2", t: "Add your details", d: "Name, phone, address, and a photo. Email is optional." },
              { n: "3", t: "Pay to confirm", d: `Your time is held for ${CLINIC.holdMinutes} minutes while you check out.` },
              { n: "4", t: "Keep your ticket", d: "Show the QR at the front desk. If it will not scan, staff can enter your unique code." },
            ].map((step) => (
              <div key={step.n}>
                <p className="font-heading text-sm font-bold text-primary">{step.n}</p>
                <p className="mt-2 font-heading text-lg font-bold">{step.t}</p>
                <p className="mt-1 text-sm text-ink-soft">{step.d}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

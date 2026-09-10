"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLINIC } from "@/lib/clinic";
import { formatUsd } from "@/lib/clinic";
import { useSession, type Session } from "@/hooks/use-session";
import { PatientCard } from "@/components/account/patient-card";
import { PhotoCapture } from "@/components/account/photo-capture";

type BookingRow = {
  id: string;
  status: string;
  visitReason: string;
  startTime: string;
  endTime: string;
  therapistName: string;
  therapistCredentials: string;
  specialty: string;
  location: string;
  paymentStatus: string | null;
  amount: number | null;
  refundEligible: boolean;
  canReschedule: boolean;
  canCancel: boolean;
};

function visitDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: CLINIC.timezone,
  });
}

function visitTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });
}

function tone(status: string) {
  if (status === "CONFIRMED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "PENDING_PAYMENT") return "held" as const;
  return "neutral" as const;
}

function CompleteCardForm({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const [photoUrl, setPhotoUrl] = useState(session.photoUrl ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: form.get("phone") || undefined,
        dateOfBirth: form.get("dateOfBirth") || undefined,
        photoUrl: photoUrl || undefined,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to update your card.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  }

  return (
    <Card className="p-5">
      <h2 className="font-heading text-xl font-bold">Finish your patient card</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Add the missing details so the front desk can check you in.
      </p>
      <form onSubmit={onSubmit} className="mt-4 grid gap-4 md:grid-cols-2">
        {!session.phone ? (
          <div>
            <Label htmlFor="phone">Mobile phone</Label>
            <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
          </div>
        ) : null}
        {!session.dateOfBirth ? (
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
          </div>
        ) : null}
        {!session.photoUrl ? (
          <div className="md:col-span-2">
            <PhotoCapture name={session.name} value={photoUrl} onChange={setPhotoUrl} required />
          </div>
        ) : null}
        {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save to my card"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function AccountClient() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/bookings");
      return (await res.json()) as { bookings: BookingRow[] };
    },
  });

  const bookings = data?.bookings ?? [];
  const upcoming = bookings.filter(
    (b) => ["CONFIRMED", "PENDING_PAYMENT"].includes(b.status) && new Date(b.startTime) > new Date(),
  );
  const past = bookings.filter((b) => !upcoming.includes(b));
  const needsCardDetails = Boolean(
    session && (!session.phone || !session.dateOfBirth || !session.photoUrl),
  );

  async function cancel(id: string) {
    if (!confirm("Cancel this appointment? Refunds follow the 24-hour policy.")) return;
    await fetch(`/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by patient" }),
    });
    await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
            Patient dashboard
          </p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold">
            {session?.name ? `Welcome, ${session.name.split(" ")[0]}` : "My visits"}
          </h1>
        </div>
        <Button asChild>
          <Link href="/book">Book an appointment</Link>
        </Button>
      </div>

      {session ? (
        <PatientCard
          name={session.name}
          dateOfBirth={session.dateOfBirth}
          phone={session.phone}
          photoUrl={session.photoUrl}
          memberNumber={session.memberNumber}
        />
      ) : null}

      {session && needsCardDetails ? <CompleteCardForm session={session} /> : null}

      <section>
        <h2 className="font-heading text-xl font-bold">Upcoming appointments</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <Card className="p-5">
              <p className="text-ink-soft">You have no upcoming appointments.</p>
              <Button asChild className="mt-4">
                <Link href="/book">Book a visit</Link>
              </Button>
            </Card>
          ) : (
            upcoming.map((booking) => (
              <Card key={booking.id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                      {visitDate(booking.startTime)}
                    </p>
                    <p className="mt-1 font-heading text-2xl font-extrabold leading-tight">
                      {visitTime(booking.startTime)} – {visitTime(booking.endTime)}
                    </p>
                    <p className="mt-2 text-lg">
                      {booking.therapistName}, {booking.therapistCredentials}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {booking.specialty} · {booking.location}
                    </p>
                    {booking.visitReason ? (
                      <p className="mt-2 text-sm">{booking.visitReason}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone={tone(booking.status)}>{booking.status.replace("_", " ")}</Badge>
                      {booking.amount != null ? (
                        <Badge>
                          {formatUsd(booking.amount)} · {booking.paymentStatus}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {booking.status === "PENDING_PAYMENT" ? (
                      <Button asChild>
                        <Link href={`/book/pay/${booking.id}`}>Complete payment</Link>
                      </Button>
                    ) : null}
                    {booking.canReschedule ? (
                      <Button asChild variant="secondary">
                        <Link href={`/book?reschedule=${booking.id}`}>Reschedule</Link>
                      </Button>
                    ) : booking.canCancel ? (
                      <p className="max-w-xs text-sm text-ink-soft">
                        Rescheduling is not available inside {CLINIC.cancellationHours} hours.
                      </p>
                    ) : null}
                    {booking.canCancel ? (
                      <Button variant="secondary" onClick={() => cancel(booking.id)}>
                        {booking.refundEligible ? "Cancel and refund" : "Cancel without refund"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-heading text-xl font-bold">Past visits</h2>
        <div className="mt-4 space-y-3">
          {past.length === 0 ? (
            <p className="text-ink-soft">No past visits yet.</p>
          ) : (
            past.map((booking) => (
              <Card key={booking.id} className="px-5 py-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                  <p className="text-lg font-semibold">{visitDate(booking.startTime)}</p>
                  <p className="font-medium">{visitTime(booking.startTime)}</p>
                </div>
                <p className="text-ink-soft">{booking.therapistName}</p>
                {booking.visitReason ? <p className="mt-1 text-sm">{booking.visitReason}</p> : null}
                <Badge className="mt-2" tone={tone(booking.status)}>
                  {booking.status.replace("_", " ")}
                </Badge>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

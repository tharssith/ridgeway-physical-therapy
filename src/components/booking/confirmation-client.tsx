"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLINIC, clinicAddress } from "@/lib/clinic";

export function ConfirmationClient({ bookingId }: { bookingId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["booking", bookingId],
    refetchInterval: 2_000,
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error);
      return payload.booking as {
        status: string;
        startTime: string;
        duration: number;
        visitReason: string;
        visitType: string;
        therapist: { name: string; credentials: string; specialty: string };
        patient: { name: string };
        payment: { amountLabel: string; status: string } | null;
        cancellationHours: number;
      };
    },
  });

  if (isLoading || !data) {
    return <p className="text-ink-soft">Loading your confirmation…</p>;
  }

  if (data.status !== "CONFIRMED") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Payment still processing</h1>
        <p className="mt-3 text-ink-soft">
          If you just paid, this page will update when the clinic receives confirmation. Do not book
          the same time again.
        </p>
      </Card>
    );
  }

  const when = new Date(data.startTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });

  return (
    <Card className="p-8">
      <Badge tone="success">Appointment confirmed</Badge>
      <h1 className="mt-4 font-heading text-3xl font-extrabold leading-tight">{data.patient.name}</h1>
      <p className="mt-2 font-heading text-2xl font-bold">{when}</p>
      <p className="mt-1 text-lg">
        {data.therapist.name}, {data.therapist.credentials} · {data.therapist.specialty}
      </p>
      <p className="mt-1 text-ink-soft">
        {data.duration}-minute visit · {clinicAddress()}
      </p>
      <dl className="mt-6 grid gap-3 border-t border-line pt-6 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Reason for visit</dt>
          <dd className="text-right font-medium">{data.visitReason || "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Visit type</dt>
          <dd className="text-right font-medium">
            {data.visitType === "FIRST_TIME" ? "First visit" : "Returning"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Amount paid</dt>
          <dd className="text-right font-medium">{data.payment?.amountLabel ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Confirmation</dt>
          <dd className="text-right font-medium">{bookingId.slice(-8).toUpperCase()}</dd>
        </div>
      </dl>
      <div className="mt-6 border-t border-line pt-6 text-sm text-ink-soft">
        <p>Arrive 10 minutes early. Bring photo ID.</p>
        <p className="mt-2">
          Cancel at least {data.cancellationHours} hours beforehand for a full refund. A written
          confirmation has been queued for email and SMS (provider not connected yet).
        </p>
        <p className="mt-2">{CLINIC.phone}</p>
      </div>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/account">View my appointments</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/book">Book another visit</Link>
        </Button>
      </div>
    </Card>
  );
}

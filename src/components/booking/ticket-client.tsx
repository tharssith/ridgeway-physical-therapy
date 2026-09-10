"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientQr } from "@/components/account/patient-qr";
import { CLINIC, clinicAddress } from "@/lib/clinic";
import { initials } from "@/lib/utils";

type Ticket = {
  ticketCode: string;
  ticketPath: string;
  status: string;
  visitReason: string;
  startTime: string;
  endTime: string;
  duration: number;
  location: string;
  cancellationHours: number;
  therapist: { name: string; credentials: string; specialty: string };
  patient: {
    name: string;
    phone: string;
    email: string | null;
    address: string | null;
    photoUrl: string | null;
  };
  payment: { amountLabel: string; status: string } | null;
};

function whenRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const day = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: CLINIC.timezone,
  });
  const startTime = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });
  const endTime = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });
  return { day, startTime, endTime };
}

export function TicketClient({ code }: { code: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket", code],
    refetchInterval: 3_000,
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${encodeURIComponent(code)}`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Ticket not found");
      return payload.ticket as Ticket;
    },
  });

  if (isLoading) return <p className="text-ink-soft">Loading your visit ticket…</p>;
  if (error || !data) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Ticket not found</h1>
        <p className="mt-3 text-ink-soft">
          {(error as Error | undefined)?.message || "Check the unique code on your confirmation."}
        </p>
        <Button asChild className="mt-6">
          <Link href="/book">Book a visit</Link>
        </Button>
      </Card>
    );
  }

  if (data.status !== "CONFIRMED") {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">Payment still processing</h1>
        <p className="mt-3 text-ink-soft">
          Your ticket will appear here once payment is confirmed. Do not book the same time again.
        </p>
      </Card>
    );
  }

  const when = whenRange(data.startTime, data.endTime);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Visit ticket</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Show this at check-in</h1>
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center gap-4 bg-primary px-5 py-5 text-white">
          <div className="h-20 w-20 overflow-hidden rounded-[16px] bg-white/15">
            {data.patient.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.patient.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-heading text-2xl font-extrabold">
                {initials(data.patient.name)}
              </div>
            )}
          </div>
          <div>
            <Badge tone="success">Confirmed</Badge>
            <p className="mt-2 font-heading text-2xl font-extrabold leading-tight">{data.patient.name}</p>
            <p className="text-sm text-white/80">{data.patient.phone}</p>
          </div>
        </div>
        <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">{when.day}</p>
            <p className="mt-1 font-heading text-2xl font-extrabold">
              {when.startTime} – {when.endTime}
            </p>
            <p className="mt-2 text-lg">
              {data.therapist.name}, {data.therapist.credentials}
            </p>
            <p className="text-sm text-ink-soft">{data.therapist.specialty}</p>
            <p className="mt-2 text-sm text-ink-soft">{clinicAddress()}</p>
            {data.patient.address ? (
              <p className="mt-2 text-sm text-ink-soft">Patient address: {data.patient.address}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-center rounded-[16px] border border-line bg-white p-4">
            <PatientQr path={data.ticketPath} label={`Ticket ${data.ticketCode}`} size={180} />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Unique code
            </p>
            <p className="font-heading text-2xl font-extrabold tracking-[0.12em]">{data.ticketCode}</p>
            <p className="mt-1 max-w-[180px] text-center text-xs text-ink-soft">
              If the QR will not scan, staff can enter this code.
            </p>
          </div>
        </div>
        <dl className="grid gap-3 border-t border-line px-5 py-5 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Amount paid</dt>
            <dd className="font-medium">{data.payment?.amountLabel ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Duration</dt>
            <dd className="font-medium">{data.duration} minutes</dd>
          </div>
        </dl>
      </Card>
      <p className="text-sm text-ink-soft">
        Arrive 10 minutes early. Cancel at least {data.cancellationHours} hours beforehand for a full
        refund. {CLINIC.phone}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => window.print()}>Print ticket</Button>
        <Button asChild variant="secondary">
          <Link href="/book">Book another visit</Link>
        </Button>
      </div>
    </div>
  );
}

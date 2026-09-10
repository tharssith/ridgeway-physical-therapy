"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLINIC } from "@/lib/clinic";
import { formatUsd } from "@/lib/clinic";
import { useSession } from "@/hooks/use-session";

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

function when(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
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
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Patient</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold">{session?.name ?? "My appointments"}</h1>
        </div>
        <Button asChild>
          <Link href="/book">Book an appointment</Link>
        </Button>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Upcoming</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-ink-soft">You have no upcoming visits.</p>
          ) : (
            upcoming.map((booking) => (
              <Card key={booking.id} className="p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xl font-semibold leading-tight">{when(booking.startTime)}</p>
                    <p className="mt-1 text-lg">
                      {booking.therapistName}, {booking.therapistCredentials}
                    </p>
                    <p className="text-sm text-ink-soft">
                      {booking.specialty} · {booking.location}
                    </p>
                    <p className="mt-2 text-sm">{booking.visitReason}</p>
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
        <h2 className="text-xl font-semibold">Past visits</h2>
        <div className="mt-4 space-y-3">
          {past.map((booking) => (
            <Card key={booking.id} className="px-5 py-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                <p className="text-lg font-semibold">{when(booking.startTime)}</p>
                <p className="text-ink-soft">{booking.therapistName}</p>
              </div>
              <p className="mt-1 text-sm">{booking.visitReason}</p>
              <Badge className="mt-2" tone={tone(booking.status)}>
                {booking.status.replace("_", " ")}
              </Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

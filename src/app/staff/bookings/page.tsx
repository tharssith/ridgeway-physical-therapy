"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLINIC, formatUsd } from "@/lib/clinic";
import { useSession } from "@/hooks/use-session";

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

export default function StaffBookingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["staff-bookings"],
    queryFn: async () => {
      const res = await fetch("/api/staff/bookings");
      return res.json();
    },
  });

  async function cancel(id: string, refundOverride = false) {
    await fetch(`/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Cancelled by clinic", refundOverride }),
    });
    await queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">Bookings</h1>
      <div className="space-y-3">
        {(data?.bookings ?? []).map(
          (row: {
            id: string;
            patientName: string;
            patientPhone: string | null;
            therapistName: string;
            startTime: string;
            visitReason: string;
            status: string;
            paymentStatus: string | null;
            amount: number | null;
          }) => (
            <Card key={row.id} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xl font-semibold leading-tight">{row.patientName}</p>
                  <p className="text-lg">{when(row.startTime)}</p>
                  <p className="text-sm text-ink-soft">
                    {row.therapistName} · {row.patientPhone ?? "No phone on file"}
                  </p>
                  {row.visitReason ? <p className="mt-2 text-sm">{row.visitReason}</p> : null}
                  <div className="mt-2 flex gap-2">
                    <Badge>{row.status}</Badge>
                    {row.paymentStatus ? (
                      <Badge tone={row.paymentStatus === "SUCCEEDED" ? "success" : "neutral"}>
                        {row.paymentStatus}
                        {row.amount != null ? ` · ${formatUsd(row.amount)}` : ""}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {row.status === "CONFIRMED" ? (
                  <div className="flex flex-col gap-2">
                    <Button variant="secondary" onClick={() => cancel(row.id)}>
                      Cancel
                    </Button>
                    {session?.role === "ADMIN" ? (
                      <Button variant="secondary" onClick={() => cancel(row.id, true)}>
                        Cancel and refund
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

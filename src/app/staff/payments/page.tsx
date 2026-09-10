"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CLINIC, formatUsd } from "@/lib/clinic";

export default function StaffPaymentsPage() {
  const { data } = useQuery({
    queryKey: ["staff-payments"],
    queryFn: async () => {
      const res = await fetch("/api/staff/payments");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-3xl font-extrabold">Payments</h1>
      <div className="space-y-2">
        {(data?.payments ?? []).map(
          (p: {
            id: string;
            amount: number;
            status: string;
            patientName: string;
            therapistName: string;
            startTime: string;
            bookingStatus: string;
          }) => (
            <Card key={p.id} className="flex flex-col gap-1 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-lg font-semibold">{p.patientName}</p>
                <p className="text-sm text-ink-soft">
                  {p.therapistName} ·{" "}
                  {new Date(p.startTime).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: CLINIC.timezone,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold">{formatUsd(p.amount)}</p>
                <Badge tone={p.status === "SUCCEEDED" ? "success" : p.status === "REFUNDED" ? "danger" : "neutral"}>
                  {p.status}
                </Badge>
              </div>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

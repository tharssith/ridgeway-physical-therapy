"use client";

import { FormEvent, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLINIC } from "@/lib/clinic";
import { useNow } from "@/hooks/use-now";
import { CheckInPanel } from "@/components/staff/check-in-panel";

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

export default function StaffHomePage() {
  const queryClient = useQueryClient();
  const date = format(new Date(), "yyyy-MM-dd");
  const [message, setMessage] = useState("");
  const now = useNow(1000);
  const liveTime = new Date(now).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: CLINIC.timezone,
  });

  const overview = useQuery({
    queryKey: ["staff-overview"],
    queryFn: async () => {
      const res = await fetch("/api/staff/overview");
      return res.json();
    },
  });

  const schedule = useQuery({
    queryKey: ["staff-schedule", date],
    queryFn: async () => {
      const res = await fetch(`/api/staff/schedule?date=${date}`);
      return res.json();
    },
    refetchInterval: 8_000,
  });

  const liveSlots = useMemo(() => {
    return ((schedule.data?.slots ?? []) as Array<{
      id: string;
      startTime: string;
      status: string;
      patientName: string | null;
      therapistName: string;
    }>).filter((slot) => new Date(slot.startTime).getTime() > now);
  }, [schedule.data?.slots, now]);

  async function blockTime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/staff/block", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: form.get("startTime"),
        endTime: form.get("endTime"),
        reason: form.get("reason"),
      }),
    });
    const data = await res.json();
    setMessage(res.ok ? "Time blocked. Open slots in that window were removed." : data.error);
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Today</p>
        <h1 className="font-heading text-3xl font-extrabold">Clinic schedule</h1>
        <p className="mt-2 text-sm text-ink-soft">Live clinic time · {liveTime}</p>
      </div>

      <CheckInPanel />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-ink-soft">Today’s appointments</p>
          <p className="mt-2 text-3xl font-semibold">{overview.data?.today?.length ?? 0}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-ink-soft">Next 7 days</p>
          <p className="mt-2 text-3xl font-semibold">{overview.data?.upcoming?.length ?? 0}</p>
        </Card>
      </div>

      <section>
        <h2 className="text-xl font-semibold">Today</h2>
        <div className="mt-3 space-y-2">
          {(overview.data?.today ?? [])
            .filter((row: { startTime: string; endTime?: string }) => new Date(row.endTime ?? row.startTime).getTime() > now)
            .map((row: { id: string; patientName: string; startTime: string; visitReason: string; therapistName: string }) => (
            <Card key={row.id} className="px-5 py-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
                <p className="text-lg font-semibold">{row.patientName}</p>
                <p className="text-ink-soft">{when(row.startTime)}</p>
              </div>
              <p className="text-sm">
                {row.visitReason ? `${row.therapistName} · ${row.visitReason}` : row.therapistName}
              </p>
            </Card>
          ))}
          {!overview.data?.today?.length ? (
            <p className="text-ink-soft">No patients on the book for the rest of today.</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div>
          <h2 className="text-xl font-semibold">Openings and booked times</h2>
          <div className="mt-3 space-y-2">
            {liveSlots.slice(0, 18).map((slot) => (
                <div key={slot.id} className="flex items-center justify-between border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-semibold">
                      {slot.patientName ?? "Open"}{" "}
                      <span className="font-normal text-ink-soft">· {slot.therapistName}</span>
                    </p>
                    <p className="text-sm text-ink-soft">{when(slot.startTime)}</p>
                  </div>
                  <Badge tone={slot.status === "BOOKED" ? "success" : slot.status === "HELD" ? "held" : "neutral"}>
                    {slot.status}
                  </Badge>
                </div>
              ))}
            {liveSlots.length === 0 ? (
              <p className="text-ink-soft">No remaining times today. Past slots drop off as clinic time moves.</p>
            ) : null}
          </div>
        </div>
        <Card className="h-fit p-5">
          <h2 className="text-lg font-semibold">Block time</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Use for holidays, meetings, or breaks. Open slots in the window are taken off the patient schedule.
          </p>
          <form onSubmit={blockTime} className="mt-4 space-y-3">
            <div>
              <Label htmlFor="startTime">Start</Label>
              <Input id="startTime" name="startTime" type="datetime-local" required />
            </div>
            <div>
              <Label htmlFor="endTime">End</Label>
              <Input id="endTime" name="endTime" type="datetime-local" required />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" name="reason" required placeholder="Holiday, lunch, meeting" />
            </div>
            <Button type="submit" className="w-full">
              Block this time
            </Button>
            {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
          </form>
        </Card>
      </section>
    </div>
  );
}

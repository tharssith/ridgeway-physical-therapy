"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { SPECIALTIES, CLINIC, clinicAddress } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TherapistAvatar } from "@/components/therapist-avatar";
import { useLiveSlots, type LiveSlot } from "@/hooks/use-live-slots";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

type Therapist = {
  id: string;
  name: string;
  specialty: string;
  credentials: string;
  bio: string;
  rates: { minutes30: number; label30: string; label45: string; label60: string };
  nextAvailable: { startTime: string; dateKey: string } | null;
};

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });
}

function groupSlots(slots: LiveSlot[]) {
  const groups: { label: string; items: LiveSlot[] }[] = [
    { label: "Morning", items: [] },
    { label: "Afternoon", items: [] },
    { label: "Evening", items: [] },
  ];
  for (const slot of slots) {
    const hour = Number(
      new Date(slot.startTime).toLocaleString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: CLINIC.timezone,
      }),
    );
    if (hour < 12) groups[0].items.push(slot);
    else if (hour < 17) groups[1].items.push(slot);
    else groups[2].items.push(slot);
  }
  return groups.filter((g) => g.items.length > 0);
}

export function BookClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const { data: session } = useSession();
  const [specialty, setSpecialty] = useState<string>("All");
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slotId, setSlotId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<"FIRST_TIME" | "RETURNING">("FIRST_TIME");
  const [visitReason, setVisitReason] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const { data, isLoading: loadingTherapists } = useQuery({
    queryKey: ["therapists"],
    queryFn: async () => {
      const res = await fetch("/api/therapists");
      return (await res.json()) as { therapists: Therapist[] };
    },
  });

  const therapists = (data?.therapists ?? []).filter(
    (t) => specialty === "All" || t.specialty === specialty,
  );
  const selected = therapists.find((t) => t.id === therapistId) ?? therapists[0];
  const activeTherapistId = selected?.id ?? null;

  useEffect(() => {
    if (!selected?.nextAvailable) return;
    setDate((current) =>
      current < selected.nextAvailable!.dateKey ? selected.nextAvailable!.dateKey : current,
    );
  }, [selected?.id, selected?.nextAvailable?.dateKey]);

  const dates = useMemo(
    () => Array.from({ length: 21 }, (_, i) => addDays(new Date(), i)),
    [],
  );

  const slotsQuery = useLiveSlots(activeTherapistId, date);
  const selectedSlot = slotsQuery.data?.find((s) => s.id === slotId);

  async function holdAndPay() {
    if (!session) {
      router.push(`/login?next=/book`);
      return;
    }
    if (!selectedSlot || !selected) return;
    setPending(true);
    setError("");
    if (rescheduleId) {
      const res = await fetch(`/api/bookings/${rescheduleId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlot.id }),
      });
      const payload = await res.json();
      setPending(false);
      if (!res.ok) {
        setError(payload.error ?? "Unable to reschedule that visit.");
        return;
      }
      router.push(`/book/confirmation/${rescheduleId}`);
      return;
    }
    const res = await fetch("/api/slots/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slotId: selectedSlot.id,
        visitReason,
        visitType,
      }),
    });
    const payload = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(payload.error ?? "This slot was just booked by someone else, please pick another.");
      setSlotId(null);
      return;
    }
    router.push(`/book/pay/${payload.bookingId}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="border border-border bg-card p-5">
        <h1 className="text-xl font-semibold">Schedule a visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Filter by specialty, then choose a clinician.</p>
        <div className="mt-5">
          <Label>Specialty</Label>
          <select
            className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-[16px]"
            value={specialty}
            onChange={(e) => {
              setSpecialty(e.target.value);
              setTherapistId(null);
              setSlotId(null);
            }}
          >
            <option>All</option>
            {SPECIALTIES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="mt-5 space-y-2">
          {loadingTherapists ? (
            <p className="text-sm text-muted-foreground">Loading clinicians…</p>
          ) : (
            therapists.map((therapist) => (
              <button
                key={therapist.id}
                type="button"
                aria-label={`${therapist.name}, ${therapist.credentials}`}
                onClick={() => {
                  setTherapistId(therapist.id);
                  setSlotId(null);
                  if (therapist.nextAvailable) setDate(therapist.nextAvailable.dateKey);
                }}
                className={cn(
                  "flex w-full items-start gap-3 border border-border bg-white px-3 py-3 text-left",
                  activeTherapistId === therapist.id && "border-primary bg-[#eef7f4]",
                )}
              >
                <TherapistAvatar name={therapist.name} size="sm" />
                <span>
                  <span className="block font-semibold leading-tight text-foreground">
                    {therapist.name}
                  </span>
                  <span className="block text-sm text-primary">
                    {therapist.credentials} · {therapist.specialty}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {therapist.rates.label45} / 45 min
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="min-w-0 space-y-5">
        {selected ? (
          <Card className="p-5">
            <div className="flex gap-4">
              <TherapistAvatar name={selected.name} />
              <div>
                <h2 className="text-2xl font-semibold leading-tight">{selected.name}</h2>
                <p className="text-primary">
                  {selected.credentials} · {selected.specialty}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{selected.bio}</p>
                <p className="mt-3 text-sm">{clinicAddress()}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.rates.label30} · {selected.rates.label45} · {selected.rates.label60}
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="overflow-x-auto border border-border bg-card">
          <div className="flex min-w-max">
            {dates.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setDate(key);
                    setSlotId(null);
                  }}
                  className={cn(
                    "min-w-[76px] border-r border-border px-3 py-3 text-center",
                    date === key ? "bg-primary text-white" : "bg-card",
                  )}
                >
                  <div className="text-xs uppercase tracking-wide">{format(day, "EEE")}</div>
                  <div className="text-lg font-semibold">{format(day, "d")}</div>
                  <div className="text-xs">{format(day, "MMM")}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Available times</h3>
            <p className="text-sm text-muted-foreground">Times shown in Pacific time</p>
          </div>
          {slotsQuery.isLoading ? (
            <p className="text-muted-foreground">Loading the schedule…</p>
          ) : !slotsQuery.data?.length ? (
            <p className="text-muted-foreground">No openings on this date. Choose another day.</p>
          ) : (
            <div className="space-y-6">
              {groupSlots(slotsQuery.data).map((group) => (
                <div key={group.label}>
                  <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {group.items.map((slot) => {
                      const booked = slot.status === "BOOKED";
                      const held = slot.status === "HELD" && !slot.isMine;
                      const mine = slot.isMine;
                      const disabled = booked || held;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => setSlotId(slot.id)}
                          className={cn(
                            "border px-3 py-2.5 text-left text-[15px] transition-colors",
                            slotId === slot.id && "border-primary bg-[#eef7f4]",
                            !disabled && slotId !== slot.id && "border-border hover:border-primary",
                            held && "border-border bg-[#fff4ed] text-held",
                            booked && "hidden",
                            mine && "border-primary",
                          )}
                        >
                          <span className="block font-semibold">{timeLabel(slot.startTime)}</span>
                          {held ? <span className="text-xs">Held</span> : null}
                          {mine ? <span className="text-xs text-primary">Your hold</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedSlot ? (
          <Card className="p-5">
            <h3 className="text-lg font-semibold">
              {rescheduleId ? "Confirm the new time" : "Confirm visit details"}
            </h3>
            <p className="mt-1 text-[17px] font-semibold">
              {timeLabel(selectedSlot.startTime)} · {format(new Date(selectedSlot.startTime), "EEEE, MMMM d")}
            </p>
            <div className={`mt-4 grid gap-4 md:grid-cols-2 ${rescheduleId ? "hidden" : ""}`}>
              <div>
                <Label>Visit type</Label>
                <select
                  className="h-11 w-full rounded-md border border-border bg-card px-3 text-[16px]"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value as "FIRST_TIME" | "RETURNING")}
                >
                  <option value="FIRST_TIME">First visit</option>
                  <option value="RETURNING">Returning patient</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="reason">Reason for visit</Label>
                <textarea
                  id="reason"
                  required
                  minLength={8}
                  value={visitReason}
                  onChange={(e) => setVisitReason(e.target.value)}
                  className="min-h-28 w-full rounded-md border border-border bg-card px-3 py-2 text-[16px]"
                  placeholder="Example: left shoulder pain after a fall, 3 weeks"
                />
              </div>
            </div>
            <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
              <p>
                Cancellation policy: cancel at least {CLINIC.cancellationHours} hours before your
                appointment for a full refund. Cancellations inside that window are not refunded.
              </p>
              <p className="mt-2">
                Selecting continue holds this time for {CLINIC.holdMinutes} minutes while you pay.
              </p>
            </div>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                onClick={holdAndPay}
                disabled={pending || (!rescheduleId && visitReason.trim().length < 8)}
              >
                {pending
                  ? "Saving…"
                  : rescheduleId
                    ? "Confirm new time"
                    : "Continue to payment"}
              </Button>
              <Badge tone="primary">Hold lasts {CLINIC.holdMinutes} minutes</Badge>
            </div>
          </Card>
        ) : null}
      </section>
    </div>
  );
}

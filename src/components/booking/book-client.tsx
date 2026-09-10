"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { SPECIALTIES, CLINIC, clinicAddress, slotDurationMinutes, rateForDuration, formatUsd } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  rates: { minutes30: number; minutes45: number; minutes60: number; label30: string; label45: string; label60: string };
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
  const groups: { label: string; key: string; items: LiveSlot[] }[] = [
    { label: "Morning", key: "morning", items: [] },
    { label: "Afternoon", key: "afternoon", items: [] },
    { label: "Evening", key: "evening", items: [] },
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
  const requestedDate = searchParams.get("date");
  const requestedTherapist = searchParams.get("therapist");
  const requestedTod = searchParams.get("tod");
  const { data: session } = useSession();
  const [specialty, setSpecialty] = useState<string>(searchParams.get("specialty") || "All");
  const [therapistId, setTherapistId] = useState<string | null>(requestedTherapist);
  const [date, setDate] = useState(requestedDate || format(new Date(), "yyyy-MM-dd"));
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
    if (requestedDate || !selected?.nextAvailable) return;
    setDate((current) =>
      current < selected.nextAvailable!.dateKey ? selected.nextAvailable!.dateKey : current,
    );
  }, [selected?.id, selected?.nextAvailable?.dateKey, requestedDate]);

  const dates = useMemo(
    () => Array.from({ length: 21 }, (_, i) => addDays(new Date(), i)),
    [],
  );

  const slotsQuery = useLiveSlots(activeTherapistId, date);
  const selectedSlot = slotsQuery.data?.find((s) => s.id === slotId);
  const duration = selectedSlot
    ? slotDurationMinutes(new Date(selectedSlot.startTime), new Date(selectedSlot.endTime))
    : 45;
  const amount =
    selected && selectedSlot
      ? rateForDuration(
          { rate30: selected.rates.minutes30, rate45: selected.rates.minutes45, rate60: selected.rates.minutes60 },
          duration,
        )
      : null;

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

  const grouped = groupSlots(slotsQuery.data ?? []).filter(
    (group) => !requestedTod || requestedTod === "Any" || group.key === requestedTod,
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {["All", ...SPECIALTIES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setSpecialty(item);
              setTherapistId(null);
              setSlotId(null);
            }}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              specialty === item ? "border-primary bg-primary text-white" : "border-line bg-card text-ink",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-[20px] border border-line bg-card p-5 md:p-7">
        {loadingTherapists ? (
          <p className="text-ink-soft">Loading the schedule…</p>
        ) : selected ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
              <div className="flex items-center gap-3">
                <TherapistAvatar name={selected.name} square />
                <div>
                  <h1 className="font-heading text-2xl font-extrabold leading-tight">{selected.name}</h1>
                  <p className="text-sm text-ink-soft">
                    {clinicAddress()} · {duration}-minute sessions · {selected.credentials}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3 py-1 text-sm font-semibold text-mint-ink">
                <span className="h-2 w-2 rounded-full bg-mint-ink" />
                Updating live
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {therapists.map((therapist) => (
                <button
                  key={therapist.id}
                  type="button"
                  onClick={() => {
                    setTherapistId(therapist.id);
                    setSlotId(null);
                    if (therapist.nextAvailable && !requestedDate) setDate(therapist.nextAvailable.dateKey);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold",
                    activeTherapistId === therapist.id
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-card text-ink",
                  )}
                >
                  {therapist.name}
                </button>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="flex gap-2 overflow-x-auto pb-2">
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
                          "min-w-[68px] rounded-full px-3 py-2 text-center",
                          date === key ? "bg-primary text-white" : "border border-line bg-card text-ink",
                        )}
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-wide">
                          {format(day, "EEE")}
                        </div>
                        <div className="font-heading text-lg font-extrabold">{format(day, "d")}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 space-y-6">
                  {slotsQuery.isLoading ? (
                    <p className="text-ink-soft">Loading times…</p>
                  ) : !grouped.length ? (
                    <p className="text-ink-soft">No openings on this date. Choose another day.</p>
                  ) : (
                    grouped.map((group) => (
                      <div key={group.label}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map((slot) => {
                            const booked = slot.status === "BOOKED";
                            const held = slot.status === "HELD" && !slot.isMine;
                            const selectedNow = slotId === slot.id || slot.isMine;
                            const disabled = booked || held;
                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => setSlotId(slot.id)}
                                className={cn(
                                  "rounded-full border px-3.5 py-2 text-sm font-semibold",
                                  !disabled && !selectedNow && "border-mint-line bg-mint text-mint-ink",
                                  selectedNow && "border-coral bg-coral text-white",
                                  held && "cursor-not-allowed border-amber-line bg-amber text-amber-ink",
                                  booked && "cursor-not-allowed border-transparent bg-booked text-booked-ink",
                                )}
                              >
                                {timeLabel(slot.startTime)}
                                {held ? " · Held" : ""}
                                {booked ? " · Booked" : ""}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <aside className="h-fit rounded-[16px] bg-[#F3F5F9] p-5 lg:sticky lg:top-6">
                <p className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-ink-soft">
                  Visit summary
                </p>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Therapist</dt>
                    <dd className="text-right font-semibold">{selected.name}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Date</dt>
                    <dd className="text-right font-semibold">
                      {format(new Date(`${date}T12:00:00`), "EEE, MMM d")}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Time</dt>
                    <dd className="text-right font-semibold">
                      {selectedSlot ? timeLabel(selectedSlot.startTime) : "Select a time"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Duration</dt>
                    <dd className="text-right font-semibold">{duration} min</dd>
                  </div>
                </dl>
                <div className="mt-4 flex justify-between border-t border-line pt-4">
                  <span className="font-heading font-bold">Total</span>
                  <span className="font-heading text-xl font-extrabold">
                    {amount != null ? formatUsd(amount) : selected.rates.label45}
                  </span>
                </div>

                <div className={rescheduleId ? "hidden" : "mt-4 space-y-3"}>
                  <div>
                    <Label>Visit type</Label>
                    <select
                      className="h-11 w-full rounded-[12px] border border-line bg-card px-3 text-[16px]"
                      value={visitType}
                      onChange={(e) => setVisitType(e.target.value as "FIRST_TIME" | "RETURNING")}
                    >
                      <option value="FIRST_TIME">First visit</option>
                      <option value="RETURNING">Returning patient</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason for visit</Label>
                    <textarea
                      id="reason"
                      required
                      minLength={8}
                      value={visitReason}
                      onChange={(e) => setVisitReason(e.target.value)}
                      className="min-h-24 w-full rounded-[12px] border border-line bg-card px-3 py-2 text-[16px]"
                      placeholder="Example: left shoulder pain after a fall, 3 weeks"
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-[12px] border border-amber-line bg-amber px-3 py-3 text-sm text-amber-ink">
                  Held for {String(CLINIC.holdMinutes).padStart(2, "0")}:00 — complete payment before
                  it releases.
                </div>
                {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
                <Button
                  onClick={holdAndPay}
                  disabled={!selectedSlot || pending || (!rescheduleId && visitReason.trim().length < 8)}
                  className="mt-4 w-full"
                >
                  {pending
                    ? "Saving…"
                    : rescheduleId
                      ? "Confirm new time"
                      : "Continue to payment"}
                </Button>
                <p className="mt-3 text-xs text-ink-soft">
                  Cancel at least {CLINIC.cancellationHours} hours before your visit for a full
                  refund. Cancellations inside that window are not refunded.
                </p>
              </aside>
            </div>
          </>
        ) : (
          <p className="text-ink-soft">No therapists match that specialty.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLINIC } from "@/lib/clinic";
import { initials } from "@/lib/utils";
import { QrScanner } from "@/components/staff/qr-scanner";

type Visit = {
  id: string;
  ticketCode?: string;
  status: string;
  attendance: string;
  visitReason: string;
  startTime: string;
  endTime: string;
  therapistName: string;
  therapistCredentials: string;
  specialty: string;
  location: string;
  canMark: boolean;
};

type PatientCard = {
  name: string;
  phone: string | null;
  email?: string | null;
  address?: string | null;
  dateOfBirthLabel: string;
  photoUrl: string | null;
  memberNumber: string;
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

export function CheckInPanel() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"scan" | "code">("scan");
  const [scanned, setScanned] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<PatientCard | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadFromQuery = useCallback(async (query: string) => {
    setError("");
    const res = await fetch(`/api/staff/check-in?${query}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to load that ticket.");
      setPatient(null);
      setVisits([]);
      return false;
    }
    setPatient(data.patient);
    setVisits(data.visits ?? []);
    return true;
  }, []);

  const loadCard = useCallback(
    async (raw: string) => {
      setScanned(raw);
      await loadFromQuery(`q=${encodeURIComponent(raw)}`);
    },
    [loadFromQuery],
  );

  async function lookupCode(event: FormEvent) {
    event.preventDefault();
    const ok = await loadFromQuery(`code=${encodeURIComponent(code.trim())}`);
    if (ok) setScanned(`code:${code.trim()}`);
  }

  async function mark(bookingId: string, attendance: "PRESENT" | "ABSENT") {
    setPendingId(bookingId);
    const res = await fetch("/api/staff/check-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, attendance }),
    });
    const data = await res.json();
    setPendingId(null);
    if (!res.ok) {
      setError(data.error ?? "Unable to mark attendance.");
      return;
    }
    if (scanned?.startsWith("code:")) {
      await loadFromQuery(`code=${encodeURIComponent(scanned.slice(5))}`);
    } else if (scanned) {
      await loadCard(scanned);
    }
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
  }

  function reset() {
    setScanned(null);
    setPatient(null);
    setVisits([]);
    setError("");
    setCode("");
    setMode("scan");
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Scan visit ticket</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Scan the QR on the patient’s ticket, or enter the unique code if the camera cannot read it.
          </p>
        </div>
        {scanned ? (
          <Button variant="secondary" onClick={reset}>
            Scan another
          </Button>
        ) : null}
      </div>

      {!scanned ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "scan" ? "default" : "secondary"}
              onClick={() => setMode("scan")}
            >
              Scan QR
            </Button>
            <Button
              type="button"
              variant={mode === "code" ? "default" : "secondary"}
              onClick={() => setMode("code")}
            >
              Enter unique number
            </Button>
          </div>
          {mode === "scan" ? <QrScanner onScan={loadCard} /> : (
            <form onSubmit={lookupCode} className="space-y-3 rounded-[16px] border border-line p-4">
              <Label htmlFor="ticketCode">Ticket code</Label>
              <Input
                id="ticketCode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RPT-XXXXXX"
                autoComplete="off"
                required
              />
              <Button type="submit" className="w-full">
                Look up ticket
              </Button>
            </form>
          )}
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {patient ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-4 rounded-[16px] bg-primary px-4 py-4 text-white">
            <div className="h-16 w-16 overflow-hidden rounded-[14px] bg-white/15">
              {patient.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={patient.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-heading text-xl font-extrabold">
                  {initials(patient.name)}
                </div>
              )}
            </div>
            <div>
              <p className="font-heading text-xl font-extrabold leading-tight">{patient.name}</p>
              <p className="text-sm text-white/80">{patient.phone || "No phone"}</p>
              {patient.address ? <p className="text-sm text-white/80">{patient.address}</p> : null}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-heading font-bold">Visit times</h3>
            {visits.length === 0 ? (
              <p className="text-sm text-ink-soft">No visit found for this ticket.</p>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-[16px] border border-line p-4">
                  {visit.ticketCode ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                      {visit.ticketCode}
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                    {visitDate(visit.startTime)}
                  </p>
                  <p className="mt-1 font-heading text-xl font-extrabold">
                    {visitTime(visit.startTime)} – {visitTime(visit.endTime)}
                  </p>
                  <p className="mt-1">
                    {visit.therapistName}, {visit.therapistCredentials}
                  </p>
                  <p className="text-sm text-ink-soft">{visit.specialty}</p>
                  {visit.visitReason ? <p className="mt-2 text-sm">{visit.visitReason}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{visit.status.replace("_", " ")}</Badge>
                    {visit.attendance !== "UNMARKED" ? (
                      <Badge tone={visit.attendance === "PRESENT" ? "success" : "danger"}>
                        {visit.attendance === "PRESENT" ? "Present" : "Absent"}
                      </Badge>
                    ) : null}
                  </div>
                  {visit.canMark && visit.attendance === "UNMARKED" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        disabled={pendingId === visit.id}
                        onClick={() => mark(visit.id, "PRESENT")}
                      >
                        Mark present
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={pendingId === visit.id}
                        onClick={() => mark(visit.id, "ABSENT")}
                      >
                        Mark absent
                      </Button>
                    </div>
                  ) : null}
                  {visit.attendance === "ABSENT" ? (
                    <p className="mt-3 text-sm text-ink-soft">
                      Marked absent. If the visit had not started, that time is open again.
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

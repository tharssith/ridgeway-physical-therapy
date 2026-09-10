"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLINIC } from "@/lib/clinic";
import { initials } from "@/lib/utils";
import { parsePatientScanPayload } from "@/lib/scan-payload";
import { QrScanner } from "@/components/staff/qr-scanner";

type Visit = {
  id: string;
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
  dateOfBirth: string | null;
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
  const [scanned, setScanned] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState<PatientCard | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadCard = useCallback(async (raw: string) => {
    const parsed = parsePatientScanPayload(raw);
    if (!parsed) {
      setError("That code is not a Ridgeway patient card.");
      return;
    }
    setError("");
    setScanned(raw);
    const res = await fetch(`/api/staff/check-in?q=${encodeURIComponent(raw)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Unable to load that patient card.");
      setPatient(null);
      setVisits([]);
      return;
    }
    setPatient(data.patient);
    setVisits(data.visits ?? []);
  }, []);

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
    if (scanned) await loadCard(scanned);
    await queryClient.invalidateQueries({ queryKey: ["staff-schedule"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-overview"] });
    await queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
  }

  function reset() {
    setScanned(null);
    setPatient(null);
    setVisits([]);
    setError("");
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Scan patient card</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Scan the QR on a patient’s phone to see their details and visit times, then mark present
            or absent.
          </p>
        </div>
        {scanned ? (
          <Button variant="secondary" onClick={reset}>
            Scan another
          </Button>
        ) : null}
      </div>

      {!scanned ? <div className="mt-4"><QrScanner onScan={loadCard} /></div> : null}
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
              <p className="text-sm text-white/80">{patient.memberNumber}</p>
              <p className="text-sm text-white/80">
                DOB {patient.dateOfBirthLabel} · {patient.phone || "No phone"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-heading font-bold">Visit times</h3>
            {visits.length === 0 ? (
              <p className="text-sm text-ink-soft">No upcoming visits for this patient.</p>
            ) : (
              visits.map((visit) => (
                <div key={visit.id} className="rounded-[16px] border border-line p-4">
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

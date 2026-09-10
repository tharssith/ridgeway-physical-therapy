"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CLINIC, clinicAddress, formatUsd } from "@/lib/clinic";
import { useSession } from "@/hooks/use-session";

export default function StaffSettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const { data } = useQuery({
    queryKey: ["staff-therapists"],
    queryFn: async () => {
      const res = await fetch("/api/staff/therapists");
      return res.json();
    },
  });

  async function generate() {
    const res = await fetch("/api/staff/slots/generate", { method: "POST" });
    const payload = await res.json();
    setMessage(res.ok ? `Generated ${payload.created} new openings.` : payload.error);
  }

  async function createTherapist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/staff/therapists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone"),
        specialty: form.get("specialty"),
        credentials: form.get("credentials"),
        bio: form.get("bio"),
        rate30: Math.round(Number(form.get("rate30")) * 100),
        rate45: Math.round(Number(form.get("rate45")) * 100),
        rate60: Math.round(Number(form.get("rate60")) * 100),
        workingHours: [
          { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 45 },
          { dayOfWeek: 2, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 45 },
          { dayOfWeek: 3, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 45 },
          { dayOfWeek: 4, startMinutes: 9 * 60, endMinutes: 17 * 60, slotDuration: 45 },
          { dayOfWeek: 5, startMinutes: 9 * 60, endMinutes: 15 * 60, slotDuration: 45 },
        ],
      }),
    });
    const payload = await res.json();
    setMessage(res.ok ? "Therapist added. Weekday 45-minute openings were generated." : payload.error);
    await queryClient.invalidateQueries({ queryKey: ["staff-therapists"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="mt-2 text-muted-foreground">{clinicAddress()}</p>
        <p className="text-muted-foreground">
          Holds last {CLINIC.holdMinutes} minutes. Free cancellation {CLINIC.cancellationHours} hours
          before the visit.
        </p>
      </div>

      <Card className="p-5">
        <h2 className="text-lg font-semibold">Therapists</h2>
        <div className="mt-4 space-y-3">
          {(data?.therapists ?? []).map(
            (t: {
              id: string;
              specialty: string;
              credentials: string;
              rate45: number;
              active: boolean;
              user: { name: string; email: string };
            }) => (
              <div key={t.id} className="border-b border-border pb-3 last:border-0">
                <p className="font-semibold">{t.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {t.credentials} · {t.specialty} · {formatUsd(t.rate45)} / 45 min ·{" "}
                  {t.active ? "Active" : "Inactive"}
                </p>
                <p className="text-sm text-muted-foreground">{t.user.email}</p>
              </div>
            ),
          )}
        </div>
        {session?.role === "ADMIN" ? (
          <Button className="mt-4" variant="secondary" onClick={generate}>
            Generate next 4 weeks of openings
          </Button>
        ) : null}
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      </Card>

      {session?.role === "ADMIN" ? (
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Add therapist</h2>
          <form onSubmit={createTherapist} className="mt-4 grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" name="password" type="password" minLength={8} required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" name="specialty" required />
            </div>
            <div>
              <Label htmlFor="credentials">Credentials</Label>
              <Input id="credentials" name="credentials" required placeholder="DPT, OCS" />
            </div>
            <div>
              <Label htmlFor="rate30">30-min rate (USD)</Label>
              <Input id="rate30" name="rate30" type="number" step="1" required />
            </div>
            <div>
              <Label htmlFor="rate45">45-min rate (USD)</Label>
              <Input id="rate45" name="rate45" type="number" step="1" required />
            </div>
            <div>
              <Label htmlFor="rate60">60-min rate (USD)</Label>
              <Input id="rate60" name="rate60" type="number" step="1" required />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                required
                minLength={20}
                className="min-h-24 w-full rounded-md border border-border px-3 py-2 text-[16px]"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">Save therapist</Button>
            </div>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { CLINIC } from "@/lib/clinic";

export default function StaffPatientsPage() {
  const { data } = useQuery({
    queryKey: ["staff-patients"],
    queryFn: async () => {
      const res = await fetch("/api/staff/patients");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Patients</h1>
      <div className="space-y-2">
        {(data?.patients ?? []).map(
          (p: { id: string; name: string; email: string; phone: string | null; bookingCount: number; lastVisit: string | null }) => (
            <Card key={p.id} className="px-5 py-4">
              <p className="text-lg font-semibold">{p.name}</p>
              <p className="text-sm text-muted-foreground">
                {p.email}
                {p.phone ? ` · ${p.phone}` : ""}
              </p>
              <p className="mt-1 text-sm">
                {p.bookingCount} visit{p.bookingCount === 1 ? "" : "s"}
                {p.lastVisit
                  ? ` · last ${new Date(p.lastVisit).toLocaleDateString("en-US", { timeZone: CLINIC.timezone })}`
                  : ""}
              </p>
            </Card>
          ),
        )}
      </div>
    </div>
  );
}

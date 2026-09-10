import { CheckInPanel } from "@/components/staff/check-in-panel";

export default function StaffScannerPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Check-in</p>
        <h1 className="font-heading text-3xl font-extrabold">Ticket scanner</h1>
      </div>
      <CheckInPanel />
    </div>
  );
}

import { CLINIC, clinicAddress } from "@/lib/clinic";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <div>
          <p className="font-semibold text-foreground">{CLINIC.name}</p>
          <p>{clinicAddress()}</p>
          <p>{CLINIC.phone}</p>
        </div>
        <div className="sm:text-right">
          <p>Self-pay appointments. Insurance is not billed at this time.</p>
          <p>Cancel {CLINIC.cancellationHours} hours ahead for a full refund.</p>
        </div>
      </div>
    </footer>
  );
}

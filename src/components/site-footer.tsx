import { CLINIC, clinicAddress } from "@/lib/clinic";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-soft sm:flex-row sm:justify-between">
        <div>
          <p className="font-heading font-bold text-ink">{CLINIC.name}</p>
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

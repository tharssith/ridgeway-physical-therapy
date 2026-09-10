import { CLINIC } from "@/lib/clinic";
import { initials } from "@/lib/utils";
import { formatDob } from "@/lib/patient";
import { PatientBarcode } from "@/components/account/patient-barcode";
import { PatientQr } from "@/components/account/patient-qr";

export function PatientCard({
  name,
  dateOfBirth,
  phone,
  photoUrl,
  memberNumber,
  scanPath,
}: {
  name: string;
  dateOfBirth: string | null;
  phone: string | null;
  photoUrl: string | null;
  memberNumber: string;
  scanPath: string;
}) {
  return (
    <section
      className="overflow-hidden rounded-[22px] text-white"
      style={{ background: "linear-gradient(145deg, #1E3868 0%, #2B4C8C 58%, #4A73B8 100%)" }}
    >
      <div className="flex items-center justify-between px-5 pt-5 md:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
            {CLINIC.shortName}
          </p>
          <p className="mt-1 font-heading text-lg font-bold">Patient card</p>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          {memberNumber}
        </span>
      </div>

      <div className="grid gap-5 px-5 py-5 md:grid-cols-[auto_1fr] md:items-center md:px-6">
        <div className="h-28 w-28 overflow-hidden rounded-[18px] border-2 border-white/40 bg-white/15">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-3xl font-extrabold">
              {initials(name)}
            </div>
          )}
        </div>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Name</dt>
            <dd className="mt-1 font-heading text-2xl font-extrabold leading-tight">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">
              Date of birth
            </dt>
            <dd className="mt-1 text-base font-semibold">{formatDob(dateOfBirth)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-white/65">Phone</dt>
            <dd className="mt-1 text-base font-semibold">{phone || "Add a phone number"}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col items-center gap-4 bg-white px-4 py-4 text-ink sm:flex-row sm:items-center sm:justify-between md:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold text-primary">Scan for patient information</p>
          <p className="mt-1 text-sm text-ink-soft">
            Front desk cameras open this card: name, date of birth, photo, phone, and the next visit.
          </p>
          <div className="mt-3">
            <PatientBarcode value={memberNumber} />
            <p className="mt-1 font-heading text-xs font-bold tracking-[0.18em]">{memberNumber}</p>
          </div>
        </div>
        <div className="shrink-0 rounded-[14px] border border-line p-2">
          <PatientQr path={scanPath} label={`Scan ${name}'s Ridgeway patient card`} />
        </div>
      </div>
    </section>
  );
}

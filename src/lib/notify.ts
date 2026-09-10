import { CLINIC, clinicAddress, formatUsd } from "@/lib/clinic";

type ConfirmationPayload = {
  toEmail: string;
  toPhone?: string | null;
  patientName: string;
  therapistName: string;
  startTime: Date;
  durationMin: number;
  amount: number;
  bookingId: string;
};

/**
 * TODO: Wire a transactional email provider (Resend, Postmark, or SES)
 * and an SMS provider (Twilio) before production.
 */
export async function sendBookingConfirmation(payload: ConfirmationPayload) {
  const when = payload.startTime.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });

  const message = [
    `Appointment confirmed — ${CLINIC.name}`,
    `Patient: ${payload.patientName}`,
    `Therapist: ${payload.therapistName}`,
    `When: ${when} (${payload.durationMin} minutes)`,
    `Location: ${clinicAddress()}`,
    `Amount paid: ${formatUsd(payload.amount)}`,
    `Confirmation: ${payload.bookingId}`,
    `Cancel at least ${CLINIC.cancellationHours} hours before your visit for a full refund.`,
  ].join("\n");

  console.info("[notify:email:TODO]", { to: payload.toEmail, body: message });
  if (payload.toPhone) {
    console.info("[notify:sms:TODO]", { to: payload.toPhone, body: message });
  }
}

export async function sendCancellationNotice(payload: {
  toEmail: string;
  toPhone?: string | null;
  patientName: string;
  refunded: boolean;
  amount?: number;
}) {
  const body = payload.refunded
    ? `Your appointment has been cancelled. A refund of ${formatUsd(payload.amount ?? 0)} is being processed.`
    : `Your appointment has been cancelled. Because the visit was inside the ${CLINIC.cancellationHours}-hour window, the visit fee was not refunded.`;

  console.info("[notify:email:TODO]", { to: payload.toEmail, body });
  if (payload.toPhone) {
    console.info("[notify:sms:TODO]", { to: payload.toPhone, body });
  }
}

import { CLINIC } from "@/lib/clinic";

export function hoursUntil(start: Date, from = new Date()) {
  return (start.getTime() - from.getTime()) / 3_600_000;
}

export function canRefundCancel(start: Date, from = new Date()) {
  return hoursUntil(start, from) >= CLINIC.cancellationHours;
}

export function canReschedule(start: Date, from = new Date()) {
  return canRefundCancel(start, from);
}

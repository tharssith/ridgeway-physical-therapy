"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CLINIC, clinicAddress } from "@/lib/clinic";

type BookingPayload = {
  booking: {
    id: string;
    status: string;
    startTime: string;
    duration: number;
    visitReason: string;
    therapist: { name: string; credentials: string };
    location: string;
    payment: { amount: number; amountLabel: string } | null;
    heldUntil: string | null;
    cancellationHours: number;
  };
};

function CheckoutForm({ bookingId, demo }: { bookingId: string; demo: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    setError("");
    if (demo) {
      const res = await fetch("/api/payments/demo-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      setPending(false);
      if (!res.ok) {
        setError(data.error ?? "Payment could not be completed.");
        return;
      }
      router.push(`/book/confirmation/${bookingId}`);
      return;
    }
    if (!stripe || !elements) {
      setPending(false);
      return;
    }
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/book/confirmation/${bookingId}`,
      },
      redirect: "if_required",
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Payment was not completed.");
      return;
    }
    router.push(`/book/confirmation/${bookingId}`);
  }

  return (
    <div className="space-y-4">
      {!demo ? <PaymentElement /> : (
        <p className="rounded-[12px] border border-amber-line bg-amber px-3 py-3 text-sm text-amber-ink">
          Stripe test keys are not configured. This local checkout will confirm the appointment
          without charging a card. Add <code>STRIPE_SECRET_KEY</code> to enable PaymentIntents.
        </p>
      )}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button onClick={confirm} disabled={pending} className="w-full">
        {pending ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

export function PayClient({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${bookingId}`);
      const data = (await res.json()) as BookingPayload & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Booking not found");
      return data.booking;
    },
  });

  const intentQuery = useQuery({
    queryKey: ["intent", bookingId],
    queryFn: async () => {
      const res = await fetch("/api/payments/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to start payment");
      return data as {
        demo: boolean;
        publishableKey: string;
        clientSecret: string | null;
        holdUntil: string;
      };
    },
  });

  const stripePromise = useMemo(() => {
    if (!intentQuery.data?.publishableKey) return null;
    return loadStripe(intentQuery.data.publishableKey);
  }, [intentQuery.data?.publishableKey]);

  useEffect(() => {
    if (bookingQuery.data?.status === "CONFIRMED") {
      router.replace(`/book/confirmation/${bookingId}`);
    }
  }, [bookingQuery.data?.status, bookingId, router]);

  if (bookingQuery.isError || intentQuery.isError) {
    return (
      <Card className="p-8">
        <h1 className="text-2xl font-semibold">This time is no longer available</h1>
        <p className="mt-3 text-ink-soft">
          {(bookingQuery.error as Error | undefined)?.message ||
            (intentQuery.error as Error | undefined)?.message ||
            "Your hold may have expired. Please choose another appointment."}
        </p>
        <Button className="mt-6" onClick={() => router.push("/book")}>
          Return to schedule
        </Button>
      </Card>
    );
  }

  if (!bookingQuery.data || !intentQuery.data) {
    return <p className="text-ink-soft">Preparing checkout…</p>;
  }

  const booking = bookingQuery.data;
  const when = new Date(booking.startTime).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: CLINIC.timezone,
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">Step 4 of 5</p>
        <h1 className="mt-2 font-heading text-3xl font-extrabold">Payment</h1>
      </div>
      <Card className="p-6">
        <p className="text-xl font-semibold">
          {booking.therapist.name}, {booking.therapist.credentials}
        </p>
        <p className="mt-1 text-lg">{when}</p>
        <p className="text-ink-soft">{booking.duration} minutes · {clinicAddress()}</p>
        {booking.visitReason ? (
          <p className="mt-3 text-sm text-ink-soft">{booking.visitReason}</p>
        ) : null}
        <p className="mt-4 text-2xl font-semibold">{booking.payment?.amountLabel}</p>
        <p className="mt-2 rounded-[12px] border border-amber-line bg-amber px-3 py-3 text-sm text-amber-ink">
          This time is held until{" "}
          {intentQuery.data.holdUntil
            ? new Date(intentQuery.data.holdUntil).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: CLINIC.timezone,
              })
            : "the hold expires"}
          . Complete payment before it releases.
        </p>
        <p className="mt-2 text-sm text-ink-soft">
          Cancel at least {booking.cancellationHours} hours before the visit for a full refund.
        </p>
      </Card>
      <Card className="p-6">
        {intentQuery.data.demo || !stripePromise || !intentQuery.data.clientSecret ? (
          <CheckoutForm bookingId={bookingId} demo />
        ) : (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret: intentQuery.data.clientSecret, appearance: { theme: "stripe" } }}
          >
            <CheckoutForm bookingId={bookingId} demo={false} />
          </Elements>
        )}
      </Card>
    </div>
  );
}

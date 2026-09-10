"use client";

import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";

function StripeForm({ ticketCode }: { ticketCode: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    if (!stripe || !elements) return;
    setPending(true);
    setError("");
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/book/ticket/${encodeURIComponent(ticketCode)}`,
      },
      redirect: "if_required",
    });
    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Payment was not completed.");
      return;
    }
    window.location.assign(`/book/ticket/${encodeURIComponent(ticketCode)}`);
  }

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          wallets: { applePay: "never", googlePay: "never" },
          layout: "tabs",
        }}
      />
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button onClick={confirm} disabled={pending || !stripe || !elements} className="w-full">
        {pending ? "Processing…" : "Pay now"}
      </Button>
    </div>
  );
}

export function StripeCheckout({
  bookingId,
  ticketCode,
  publishableKey,
  clientSecret,
}: {
  bookingId: string;
  ticketCode: string;
  publishableKey: string;
  clientSecret: string;
}) {
  const stripePromise = useMemo(() => loadStripe(publishableKey), [publishableKey]);

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe" },
      }}
    >
      <StripeForm ticketCode={ticketCode || bookingId} />
    </Elements>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PayError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Card className="p-8">
      <h1 className="text-2xl font-semibold">Payment could not be opened</h1>
      <p className="mt-3 text-ink-soft">
        {error.message || "Something went wrong while loading checkout. Your time is still held if it has not expired."}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={retry}>Try again</Button>
        <Button asChild variant="secondary">
          <a href="/book">Return to schedule</a>
        </Button>
      </div>
    </Card>
  );
}

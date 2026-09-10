"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function HomeCheckIn() {
  const { data: user } = useSession();

  if (user?.role === "PATIENT") {
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
          <Link href="/account">Open my patient card</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/book">Book a visit</Link>
        </Button>
      </div>
    );
  }

  if (user) {
    return (
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
          <Link href="/staff">Open clinic dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90">
        <Link href="/register">Create your patient card</Link>
      </Button>
      <Button asChild variant="outline" size="lg">
        <Link href="/login">Sign in</Link>
      </Button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CLINIC } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const { data: user } = useSession();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const staff = user?.role === "ADMIN" || user?.role === "THERAPIST";

  return (
    <header className="sticky top-0 z-30 w-full bg-primary text-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={staff ? "/staff" : "/"} className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15 font-heading text-sm font-extrabold">
            R
          </span>
          <span className="truncate font-heading text-[17px] font-bold tracking-tight">
            <span className="sm:hidden">{CLINIC.shortName}</span>
            <span className="hidden sm:inline">{CLINIC.name}</span>
          </span>
        </Link>
        <nav className="flex shrink-0 items-center gap-2 text-[15px] sm:gap-4">
          <Link href="/book" className="hidden text-white/80 hover:text-white sm:inline">
            Book a visit
          </Link>
          {staff ? (
            <>
              <Link href="/staff" className="hidden text-white/80 hover:text-white sm:inline">
                Clinic
              </Link>
              <span className="hidden md:inline">{user?.name.split(" ")[0]}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white/80 hover:text-white">
                Staff
              </Link>
              <Button asChild size="sm">
                <Link href="/book">Book now</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

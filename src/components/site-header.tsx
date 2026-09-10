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

  const home = user?.role === "PATIENT" ? "/account" : user ? "/staff" : "/";

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={home} className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-sm font-bold text-white">
            R
          </span>
          <span className="text-[17px] font-semibold tracking-tight">{CLINIC.name}</span>
        </Link>
        <nav className="flex items-center gap-2 text-[15px] sm:gap-4">
          <Link href="/book" className="hidden text-muted-foreground hover:text-foreground sm:inline">
            Book a visit
          </Link>
          {user ? (
            <>
              <Link
                href={user.role === "PATIENT" ? "/account" : "/staff"}
                className="text-muted-foreground hover:text-foreground"
              >
                {user.role === "PATIENT" ? "My appointments" : "Clinic"}
              </Link>
              <span className="hidden text-foreground sm:inline">{user.name.split(" ")[0]}</span>
              <Button variant="secondary" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-muted-foreground hover:text-foreground">
                Sign in
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

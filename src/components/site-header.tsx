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
    <header className="bg-primary text-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href={home} className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/15 font-heading text-sm font-extrabold">
            R
          </span>
          <span className="font-heading text-[17px] font-bold tracking-tight">{CLINIC.name}</span>
        </Link>
        <nav className="flex items-center gap-2 text-[15px] sm:gap-4">
          <Link href="/book" className="hidden text-white/80 hover:text-white sm:inline">
            Book a visit
          </Link>
          {user ? (
            <>
              <Link
                href={user.role === "PATIENT" ? "/account" : "/staff"}
                className="text-white/80 hover:text-white"
              >
                {user.role === "PATIENT" ? "My appointments" : "Clinic"}
              </Link>
              <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-white/80 hover:text-white">
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

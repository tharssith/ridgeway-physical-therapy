"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CLINIC } from "@/lib/clinic";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/staff", label: "Schedule" },
  { href: "/staff/bookings", label: "Bookings" },
  { href: "/staff/patients", label: "Patients" },
  { href: "/staff/payments", label: "Payments" },
  { href: "/staff/settings", label: "Settings" },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useSession();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-card">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/staff" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-7 w-7 items-center justify-center bg-primary text-xs font-bold text-white">
              R
            </span>
            {CLINIC.shortName}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.name}</span>
            <span className="hidden text-muted-foreground sm:inline">{user?.role}</span>
            <Button size="sm" variant="secondary" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-border bg-card md:block">
          <nav className="flex flex-col p-3">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2.5 text-[15px]",
                    active ? "bg-[#eef7f4] font-semibold text-primary" : "text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2 text-sm",
                  pathname === item.href ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="p-4 md:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

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
    <div className="min-h-full bg-bg">
      <header className="bg-primary text-white">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/staff" className="flex items-center gap-2 font-heading font-bold">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[8px] bg-white/15 text-xs font-extrabold">
              R
            </span>
            {CLINIC.shortName}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span>{user?.name}</span>
            <span className="hidden text-white/70 sm:inline">{user?.role}</span>
            <Button size="sm" variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden w-56 shrink-0 border-r border-line bg-card md:block">
          <nav className="flex flex-col p-3">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-[12px] px-3 py-2.5 text-[15px] font-medium",
                    active ? "bg-[#E8EEF8] font-semibold text-primary" : "text-ink",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">
          <nav className="flex gap-1 overflow-x-auto border-b border-line bg-card px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-full px-3 py-2 text-sm",
                  pathname === item.href ? "bg-[#E8EEF8] font-semibold text-primary" : "text-ink-soft",
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

import { Suspense } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookClient } from "@/components/booking/book-client";

export default function BookPage() {
  return (
    <div className="flex min-h-full flex-col overflow-x-hidden">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-ink-soft">Loading the schedule…</p>}>
          <BookClient />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

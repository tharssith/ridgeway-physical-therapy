import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AccountClient } from "@/components/account/account-client";

export default function AccountPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <AccountClient />
      </main>
      <SiteFooter />
    </div>
  );
}

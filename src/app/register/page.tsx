"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoCapture } from "@/components/account/photo-capture";
import { safeInternalPath } from "@/lib/safe-next";

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!photoUrl) {
      setError("Add a photo for your patient card.");
      return;
    }
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        dateOfBirth: form.get("dateOfBirth"),
        password: form.get("password"),
        photoUrl,
      }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) {
      setError(data.error ?? "Unable to create account.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    router.push(safeInternalPath(params.get("next")) || "/account");
  }

  const next = params.get("next");
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : "/login";

  return (
    <Card className="w-full max-w-md p-8">
      <h1 className="font-heading text-2xl font-extrabold">Create your patient card</h1>
      <p className="mt-2 text-ink-soft">
        Check in with Ridgeway first. We use this card at the front desk and on your dashboard.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="name">Legal name</Label>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="phone">Mobile phone</Label>
          <Input id="phone" name="phone" type="tel" required autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
        </div>
        <PhotoCapture name={name} value={photoUrl} onChange={setPhotoUrl} required />
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" minLength={8} required />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating your card…" : "Create card and continue"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already registered?{" "}
        <Link href={loginHref} className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-start justify-center px-4 py-16">
        <Suspense>
          <RegisterForm />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}

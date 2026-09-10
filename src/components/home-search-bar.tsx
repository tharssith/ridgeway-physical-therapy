"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SPECIALTIES } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function HomeSearchBar() {
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const specialty = String(form.get("specialty") ?? "");
    const date = String(form.get("date") ?? "");
    const tod = String(form.get("tod") ?? "");
    if (specialty && specialty !== "All") params.set("specialty", specialty);
    if (date) params.set("date", date);
    if (tod && tod !== "Any") params.set("tod", tod);
    router.push(`/book${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative z-10 mx-auto -mt-[50px] grid max-w-5xl gap-3 rounded-[20px] bg-card p-4 shadow-[0_18px_40px_rgba(26,34,51,0.12)] md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-end md:p-5"
    >
      <div>
        <Label htmlFor="specialty">Specialty</Label>
        <select
          id="specialty"
          name="specialty"
          className="h-11 w-full rounded-[12px] border border-line bg-card px-3 text-[16px] text-ink"
          defaultValue="All"
        >
          <option>All</option>
          {SPECIALTIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="date">Date</Label>
        <input
          id="date"
          name="date"
          type="date"
          className="h-11 w-full rounded-[12px] border border-line bg-card px-3 text-[16px] text-ink"
        />
      </div>
      <div>
        <Label htmlFor="tod">Time of day</Label>
        <select
          id="tod"
          name="tod"
          className="h-11 w-full rounded-[12px] border border-line bg-card px-3 text-[16px] text-ink"
          defaultValue="Any"
        >
          <option>Any</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
        </select>
      </div>
      <Button type="submit" className="h-11 md:mb-0">
        Search
      </Button>
    </form>
  );
}

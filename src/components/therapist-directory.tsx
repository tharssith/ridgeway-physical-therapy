"use client";

import { useState } from "react";
import Link from "next/link";
import { SPECIALTIES, formatUsd } from "@/lib/clinic";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TherapistCard = {
  id: string;
  name: string;
  specialty: string;
  credentials: string;
  photoUrl: string | null;
  rate45: number;
};

const TILES = [
  "from-[#1E3868] to-[#6B8FCE]",
  "from-[#2B4C8C] to-[#7BA0D6]",
  "from-[#243F78] to-[#5C7FBE]",
  "from-[#1A2F5C] to-[#4F78B8]",
];

export function TherapistDirectory({ therapists }: { therapists: TherapistCard[] }) {
  const [specialty, setSpecialty] = useState<string>("All");
  const visible = therapists.filter((t) => specialty === "All" || t.specialty === specialty);

  return (
    <section id="therapists" className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-heading text-3xl font-extrabold">Our therapists</h2>
          <p className="mt-2 max-w-xl text-ink-soft">
            Licensed Doctors of Physical Therapy. Credentials match Washington state licensure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["All", ...SPECIALTIES].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSpecialty(item)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                specialty === item
                  ? "border-primary bg-primary text-white"
                  : "border-line bg-card text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {visible.map((therapist, index) => (
          <article key={therapist.id} className="overflow-hidden rounded-[18px] border border-line bg-card">
            <div
              className={cn(
                "relative flex h-40 items-end bg-gradient-to-br p-4",
                TILES[index % TILES.length],
              )}
              style={
                therapist.photoUrl
                  ? {
                      backgroundImage: `linear-gradient(to top, rgba(26,34,51,0.72), transparent 55%), url(${therapist.photoUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            >
              <p className="font-heading text-lg font-bold leading-tight text-white">{therapist.name}</p>
            </div>
            <div className="p-4">
              <p className="text-sm text-ink-soft">
                {therapist.credentials} · {therapist.specialty}
              </p>
              <p className="mt-2 font-semibold text-primary">{formatUsd(therapist.rate45)} / 45 min</p>
              <Button asChild variant="light" className="mt-4 w-full">
                <Link href={`/book?therapist=${therapist.id}`}>View times</Link>
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

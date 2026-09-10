"use client";

import { useQuery } from "@tanstack/react-query";

export type Session = {
  id: string;
  name: string;
  email: string;
  role: "PATIENT" | "THERAPIST" | "ADMIN";
  phone: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
  memberNumber: string;
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user: Session | null };
      return data.user;
    },
  });
}

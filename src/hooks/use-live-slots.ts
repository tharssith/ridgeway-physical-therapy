"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import { slotRoom } from "@/lib/slot-room";

export type LiveSlot = {
  id: string;
  therapistId: string;
  startTime: string;
  endTime: string;
  status: "AVAILABLE" | "HELD" | "BOOKED" | "CANCELLED";
  heldUntil: string | null;
  isMine: boolean;
  dateKey: string;
};

let socket: Socket | undefined;

function getSocket() {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      reconnectionAttempts: 3,
      timeout: 2500,
    });
  }
  return socket;
}

export function useLiveSlots(therapistId: string | null, date: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ["slots", therapistId, date];

  const query = useQuery({
    queryKey,
    enabled: Boolean(therapistId && date),
    refetchInterval: 8_000,
    queryFn: async () => {
      const res = await fetch(`/api/slots?therapistId=${therapistId}&date=${date}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to load times");
      return data.slots as LiveSlot[];
    },
  });

  useEffect(() => {
    if (!therapistId || !date) return;
    const client = getSocket();
    const room = slotRoom(therapistId, date);

    const onUpdate = (slot: LiveSlot) => {
      if (slot.therapistId !== therapistId || slot.dateKey !== date) return;
      queryClient.setQueryData<LiveSlot[]>(queryKey, (current = []) => {
        const next = current.filter((item) => item.id !== slot.id);
        if (slot.status === "CANCELLED") return next;
        return [...next, slot].sort((a, b) => a.startTime.localeCompare(b.startTime));
      });
    };

    client.on("connect", () => client.emit("slots:subscribe", room));
    client.on("slot:updated", onUpdate);
    if (client.connected) client.emit("slots:subscribe", room);

    return () => {
      client.emit("slots:unsubscribe", room);
      client.off("slot:updated", onUpdate);
    };
  }, [therapistId, date, queryClient]);

  return query;
}

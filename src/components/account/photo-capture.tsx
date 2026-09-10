"use client";

import { ChangeEvent } from "react";
import { Label } from "@/components/ui/label";
import { initials } from "@/lib/utils";

export async function compressPatientPhoto(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose a photo in JPG or PNG format.");
  }
  const bitmap = await createImageBitmap(file);
  const size = 360;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to read that photo.");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function PhotoCapture({
  name,
  value,
  onChange,
  required = false,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange(await compressPatientPhoto(file));
  }

  return (
    <div>
      <Label htmlFor="photo">Photo</Label>
      <div className="mt-2 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-[14px] bg-[#D9E3F5]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-xl font-bold text-primary">
              {initials(name || "PT")}
            </div>
          )}
        </div>
        <div>
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            required={required && !value}
            onChange={onFile}
            className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-1 text-xs text-ink-soft">A clear headshot for your clinic card.</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { barcodeModules } from "@/lib/barcode";

export function PatientBarcode({ value }: { value: string }) {
  const { bars, width } = barcodeModules(value);
  const height = 52;
  return (
    <svg
      role="img"
      aria-label={`Patient barcode ${value}`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-12 w-full"
      preserveAspectRatio="none"
    >
      <rect width={width} height={height} fill="#ffffff" />
      {bars.map((bar, index) => (
        <rect key={`${bar.x}-${index}`} x={bar.x} y={4} width={bar.w} height={height - 8} fill="#1A2233" />
      ))}
    </svg>
  );
}

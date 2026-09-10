"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PatientQr({
  path,
  label,
  size = 140,
}: {
  path: string;
  label: string;
  size?: number;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = path.startsWith("http") ? path : `${window.location.origin}${path}`;
    QRCode.toDataURL(url, {
      margin: 1,
      width: Math.max(size, 280),
      errorCorrectionLevel: "M",
      color: { dark: "#1A2233", light: "#FFFFFF" },
    }).then(setSrc);
  }, [path, size]);

  if (!src) {
    return <div className="rounded-[12px] bg-muted" style={{ height: size, width: size }} aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      className="rounded-[8px] bg-white"
      style={{ height: size, width: size }}
    />
  );
}

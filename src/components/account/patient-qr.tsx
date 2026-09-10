"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function PatientQr({ path, label }: { path: string; label: string }) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = `${window.location.origin}${path}`;
    QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: "M",
      color: { dark: "#1A2233", light: "#FFFFFF" },
    }).then(setSrc);
  }, [path]);

  if (!src) {
    return <div className="h-[140px] w-[140px] rounded-[12px] bg-muted" aria-hidden />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} className="h-[140px] w-[140px] rounded-[8px] bg-white" />
  );
}

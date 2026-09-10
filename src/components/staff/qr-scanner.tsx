"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";

export function QrScanner({ onScan }: { onScan: (text: string) => void }) {
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onScanRef = useRef(onScan);
  const locked = useRef(false);
  const boxId = "staff-qr-reader";
  onScanRef.current = onScan;

  useEffect(() => {
    const scanner = new Html5Qrcode(boxId);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (locked.current) return;
          locked.current = true;
          onScanRef.current(text);
        },
        () => undefined,
      )
      .then(() => setRunning(true))
      .catch(() => {
        setError("Allow camera access to scan a visit ticket, or upload a photo of the QR code.");
      });

    return () => {
      try {
        void scanner.stop();
      } catch {
        /* already stopped */
      }
      try {
        scanner.clear();
      } catch {
        /* already cleared */
      }
    };
  }, []);

  async function onFile(file: File | undefined) {
    if (!file || !scannerRef.current) return;
    try {
      if (running) {
        try {
          await scannerRef.current.stop();
        } catch {
          /* already stopped */
        }
      }
      const text = await scannerRef.current.scanFile(file, true);
      onScan(text);
    } catch {
      setError("Could not read a QR code from that photo.");
    }
  }

  return (
    <div className="space-y-3">
      <div id={boxId} className="overflow-hidden rounded-[16px] border border-line bg-black" />
      <label className="block text-sm text-ink-soft">
        Or upload a QR photo
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="mt-2 block w-full text-sm"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {running ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => scannerRef.current?.stop().catch(() => undefined)}
        >
          Pause camera
        </Button>
      ) : null}
    </div>
  );
}

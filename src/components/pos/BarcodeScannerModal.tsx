"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Camera, AlertTriangle } from "lucide-react";

interface BarcodeScannerModalProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

// Minimal ambient type for the native BarcodeDetector API (not yet in
// TypeScript's DOM lib). Supported on Chrome/Edge/Android; unsupported
// browsers (Safari/iOS) fall back to the "not supported" message below.
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

export function BarcodeScannerModal({ onDetected, onClose }: BarcodeScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [isSupported, setIsSupported] = useState<boolean>(true);

  useEffect(() => {
    const BarcodeDetectorCtor = (window as any).BarcodeDetector;
    if (!BarcodeDetectorCtor) {
      setIsSupported(false);
      return;
    }

    let cancelled = false;
    let detectTimer: ReturnType<typeof setInterval> | null = null;
    const detector: BarcodeDetectorLike = new BarcodeDetectorCtor({
      formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e", "code_39"],
    });

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }

        detectTimer = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onDetected(codes[0].rawValue);
            }
          } catch {
            // ignore transient detection errors between frames
          }
        }, 350);
      })
      .catch(() => {
        setError("Camera access denied or unavailable. Please allow camera permission.");
      });

    return () => {
      cancelled = true;
      if (detectTimer) clearInterval(detectTimer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-sm">Scan Barcode (বারকোড স্ক্যান করুন)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {!isSupported ? (
            <div className="py-8 text-center text-slate-500 text-xs space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto text-amber-500" />
              <p className="font-semibold text-slate-700">Camera scanning not supported in this browser</p>
              <p>এই ব্রাউজারে ক্যামেরা স্ক্যান সমর্থিত নয়। USB বারকোড স্ক্যানার ব্যবহার করুন অথবা সার্চ বক্সে বারকোড টাইপ করে Enter চাপুন।</p>
            </div>
          ) : error ? (
            <div className="py-8 text-center text-rose-600 text-xs space-y-2">
              <AlertTriangle className="w-8 h-8 mx-auto" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-6 border-2 border-emerald-400/80 rounded-lg pointer-events-none" />
              <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white/80">
                বারকোডটি বক্সের মধ্যে ধরুন
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

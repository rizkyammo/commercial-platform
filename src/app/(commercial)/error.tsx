"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function CommercialError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CommercialError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h1 className="text-2xl font-semibold">Terjadi Kesalahan</h1>
      <p className="mt-2 text-sm text-[#6E6E73] max-w-md">
        Maaf, terjadi kesalahan. Silakan coba lagi atau hubungi administrator
        jika masalah berlanjut.
      </p>
      {error.digest && (
        <div className="mt-3 text-xs font-mono text-[#8E8E93]">
          Reference: {error.digest}
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Coba Lagi</Button>
        <Button variant="secondary" onClick={() => window.location.href = "/home"}>
          Kembali ke Home
        </Button>
      </div>
    </div>
  );
}
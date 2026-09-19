"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F6F6F7] text-[#1D1D1F] flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">🚨</div>
          <h1 className="text-2xl font-semibold">Aplikasi Bermasalah</h1>
          <p className="mt-2 text-sm text-[#6E6E73]">
            Terjadi kesalahan yang tidak terduga.
          </p>
          {error.digest && (
            <div className="mt-3 text-xs font-mono text-[#8E8E93]">
              Ref: {error.digest}
            </div>
          )}
          <button
            onClick={reset}
            className="mt-6 h-10 px-5 rounded-lg bg-[#0A84FF] text-white text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
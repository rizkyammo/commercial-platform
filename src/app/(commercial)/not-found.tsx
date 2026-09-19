import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🔍</div>
      <h1 className="text-2xl font-semibold">Halaman Tidak Ditemukan</h1>
      <p className="mt-2 text-sm text-[#6E6E73] max-w-md">
        Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <Link
        href="/home"
        className="mt-6 h-10 px-5 rounded-lg bg-[#0A84FF] text-white text-sm font-medium flex items-center"
      >
        Kembali ke Home
      </Link>
    </div>
  );
}
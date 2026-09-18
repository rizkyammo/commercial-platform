import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  total: number;
  pageSize: number;
}

export function Pagination({ currentPage, totalPages, buildHref, total, pageSize }: PaginationProps) {
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, total);

  const pages: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E5EA] text-sm">
      <div className="text-[#6E6E73]">
        Showing <span className="font-medium text-[#1D1D1F]">{from}</span>–
        <span className="font-medium text-[#1D1D1F]">{to}</span> of{" "}
        <span className="font-medium text-[#1D1D1F]">{total}</span> records
      </div>
      <div className="flex items-center gap-1">
        {currentPage > 1 && (
          <Link href={buildHref(currentPage - 1)} className="h-8 px-3 rounded-md hover:bg-[#F2F2F4] flex items-center">←</Link>
        )}
        {pages.map((p) => (
          <Link
            key={p}
            href={buildHref(p)}
            className={`h-8 min-w-8 px-2 rounded-md flex items-center justify-center ${
              p === currentPage ? "bg-[#0A84FF] text-white" : "hover:bg-[#F2F2F4]"
            }`}
          >
            {p}
          </Link>
        ))}
        {currentPage < totalPages && (
          <Link href={buildHref(currentPage + 1)} className="h-8 px-3 rounded-md hover:bg-[#F2F2F4] flex items-center">→</Link>
        )}
      </div>
    </div>
  );
}
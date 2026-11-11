function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(total - 1, page + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

const base =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className={`${base} gap-1 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800`}
      >
        <span aria-hidden="true">←</span>
        <span className="hidden sm:inline cursor-pointer">Previous</span>
        <span className="sr-only sm:hidden">Previous page</span>
      </button>

      {pageList(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Page ${p}`}
            className={`cursor-pointer ${base} ${
              p === page
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                : "text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className={`${base} gap-1 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-slate-200 dark:hover:bg-slate-800`}
      >
        <span className="hidden sm:inline cursor-pointer">Next</span>
        <span className="sr-only sm:hidden">Next page</span>
        <span aria-hidden="true">→</span>
      </button>
    </nav>
  );
}
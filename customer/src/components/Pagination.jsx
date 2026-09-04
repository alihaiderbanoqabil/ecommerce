import { ChevronLeft, ChevronRight } from "lucide-react";

// Backend har list route par yehi shape deta hai:
// { total, page, limit, totalPages, hasNextPage, hasPrevPage }
export default function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasNextPage, hasPrevPage, total } = pagination;

  // Bohat se pages hon to sirf current ke aas paas ke numbers dikhate hain
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let index = start; index <= end; index += 1) pages.push(index);

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · {total} items
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!hasPrevPage}
          onClick={() => onChange(page - 1)}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Prev
        </button>

        {pages.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => onChange(entry)}
            className={`h-9 w-9 rounded-lg border text-sm font-medium transition ${
              entry === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {entry}
          </button>
        ))}

        <button
          type="button"
          disabled={!hasNextPage}
          onClick={() => onChange(page + 1)}
          className="flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

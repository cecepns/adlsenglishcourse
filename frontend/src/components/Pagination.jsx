import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ pagination, onPage, onLimit }) {
  if (!pagination) return null;
  const { page, limit, total, totalPages } = pagination;
  const start = Math.max(1, Math.min(page - 2, totalPages - 4)), pages = [];
  for (let i = start; i <= Math.min(totalPages, start + 4); i++) pages.push(i);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t p-3 text-sm sm:flex-row">
      <div className="flex items-center gap-2 text-slate-500">
        <select className="input !w-20 !py-1" value={limit} onChange={(e) => onLimit(+e.target.value)}>
          {[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}
        </select>
        <span>per halaman · {total} data</span>
      </div>
      <div className="flex items-center gap-1">
        <button className="btn-ghost !px-2 !py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}><ChevronLeft size={16} /></button>
        {pages.map((p) => (
          <button key={p} onClick={() => onPage(p)} className={`h-8 w-8 rounded-lg ${p === page ? "bg-brand text-white" : "hover:bg-slate-100"}`}>{p}</button>
        ))}
        <button className="btn-ghost !px-2 !py-1" disabled={page >= totalPages} onClick={() => onPage(page + 1)}><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}

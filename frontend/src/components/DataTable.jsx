import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Pencil, Trash2 } from "lucide-react";
import BranchBadges from "./BranchBadges";
import ProductImage from "./ProductImage";

function renderCell(c, r) {
  const val = r[c.key];
  if (c.type === "image") return <ProductImage src={val} alt={r.name} size="sm" />;
  if (c.type === "branch-badges") return <BranchBadges row={r} />;
  if (c.type === "badge") {
    const cls = c.badgeMap?.[val] || "bg-slate-100 text-slate-700";
    return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${cls}`}>{val || "-"}</span>;
  }
  const content = c.render ? c.render(val, r) : (val ?? "-");
  return c.bold ? <span className="font-semibold text-slate-800">{content}</span> : content;
}

export default function DataTable({ columns, rows, loading, error, canEdit, sortKey, sortOrder, onSort, onEdit, onDelete, onRetry }) {
  if (error) return <div className="p-8 text-center text-red-600">{error} <button className="ml-2 underline" onClick={onRetry}>Coba lagi</button></div>;
  if (loading) return <div className="space-y-2.5 p-5">{[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div>;
  if (!rows.length) return <div className="flex flex-col items-center gap-2 p-12 text-slate-400"><Inbox size={40} /><span>Belum ada data</span></div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((c) => {
              const isSorted = sortKey === c.key;
              return (
                <th key={c.key} className="whitespace-nowrap px-4 py-3.5 font-bold">
                  {c.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(c.key)}
                      className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600 transition hover:text-brand-dark"
                      title={`Sortir berdasarkan ${c.label}`}
                    >
                      <span>{c.label}</span>
                      <span className={`rounded p-0.5 ${isSorted ? "bg-brand-50 text-brand" : "text-slate-400"}`}>
                        {isSorted ? (
                          sortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                        ) : (
                          <ArrowUpDown size={13} />
                        )}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
            {canEdit && <th className="px-4 py-3.5 text-right font-bold">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.id} className="transition hover:bg-slate-50/80">
              {columns.map((c) => (
                <td key={c.key} className={`${c.nowrap ? "whitespace-nowrap " : ""}px-4 py-3 text-slate-700`}>
                  {renderCell(c, r)}
                </td>
              ))}
              {canEdit && (
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <button className="mr-2 rounded-lg p-1.5 text-brand transition hover:bg-brand-50" onClick={() => onEdit(r)} aria-label="Edit" title="Edit"><Pencil size={16} /></button>
                  <button className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50" onClick={() => onDelete(r)} aria-label="Hapus" title="Hapus"><Trash2 size={16} /></button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
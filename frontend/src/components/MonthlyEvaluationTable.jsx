import { Check } from "lucide-react";

const RATINGS = [
  { val: 1, label: "Needs Stimulation", short: "(1)" },
  { val: 2, label: "Beginning to Develop", short: "(2)" },
  { val: 3, label: "Developing as Expected", short: "(3)" },
  { val: 4, label: "Very Good", short: "(4)" },
];

export default function MonthlyEvaluationTable({
  title = "LEMBAR EVALUASI",
  structure = [],
  scores = {},
  editable = false,
  onScoreChange,
  compact = false,
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-2xs">
      <table className={`w-full border-collapse text-left ${compact ? "text-[11px]" : "text-xs"}`}>
        <thead>
          <tr className="border-b border-slate-300 bg-slate-100">
            <th
              colSpan={7}
              className="px-3 py-2.5 text-center text-xs font-black uppercase tracking-wider text-slate-900"
            >
              {title}
            </th>
          </tr>
          <tr className="border-b border-slate-300 bg-slate-50 text-slate-800">
            <th className="border-r border-slate-300 px-3 py-2.5 font-extrabold w-28">Learning Aspects</th>
            <th className="border-r border-slate-300 px-3 py-2.5 font-extrabold min-w-[160px]">Learning Targets</th>
            <th className="border-r border-slate-300 px-3 py-2.5 font-extrabold min-w-[200px]">Competency Achievement</th>
            {RATINGS.map((rt) => (
              <th
                key={rt.val}
                className="border-r border-slate-300 px-2 py-2 text-center font-extrabold last:border-r-0 w-24"
              >
                <div className="leading-tight">{rt.label}</div>
                <div className="mt-0.5 text-[10px] font-bold text-slate-500">{rt.short}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {structure.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                Belum ada struktur tabel evaluasi bulanan.
              </td>
            </tr>
          ) : (
            structure.map((blk) => {
              const criteria = blk.criteria?.length ? blk.criteria : [{ id: `${blk.id}_1`, label: "-" }];
              return criteria.map((cr, crIdx) => {
                const currentScore = Number(scores?.[cr.id] || 0);
                return (
                  <tr key={cr.id} className="border-b border-slate-300 last:border-b-0">
                    {crIdx === 0 && (
                      <td
                        rowSpan={criteria.length}
                        className="border-r border-slate-300 bg-slate-50/40 px-3 py-2.5 align-middle font-extrabold text-slate-900"
                      >
                        {blk.aspect}
                      </td>
                    )}
                    {crIdx === 0 && (
                      <td
                        rowSpan={criteria.length}
                        className="border-r border-slate-300 px-3 py-2.5 align-middle text-slate-700 leading-relaxed"
                      >
                        {blk.target || "-"}
                      </td>
                    )}
                    <td className="border-r border-slate-300 px-3 py-2 text-slate-700">{cr.label}</td>
                    {RATINGS.map((rt) => {
                      const checked = currentScore === rt.val;
                      return (
                        <td
                          key={rt.val}
                          onClick={() => {
                            if (!editable || !onScoreChange) return;
                            onScoreChange(cr.id, checked ? 0 : rt.val);
                          }}
                          className={`border-r border-slate-300 px-2 py-2 text-center align-middle last:border-r-0 transition ${
                            editable ? "cursor-pointer hover:bg-brand-50/70" : ""
                          } ${checked ? "bg-emerald-50/80" : ""}`}
                        >
                          {checked ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                              <Check size={13} className="stroke-[3]" />
                            </span>
                          ) : editable ? (
                            <span className="inline-block h-4 w-4 rounded border border-slate-300 bg-white" />
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

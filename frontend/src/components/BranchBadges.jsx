const BRANCH_BADGE_THEMES = [
  { badge: "border-sky-200 bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  { badge: "border-violet-200 bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  { badge: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  { badge: "border-teal-200 bg-teal-50 text-teal-700", dot: "bg-teal-500" },
  { badge: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  { badge: "border-indigo-200 bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  { badge: "border-orange-200 bg-orange-50 text-orange-700", dot: "bg-orange-500" },
  { badge: "border-cyan-200 bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  { badge: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700", dot: "bg-fuchsia-500" },
  { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
];

function hashText(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getBranchTheme(branch) {
  const id = Number(branch?.id);
  const idx =
    id > 0
      ? (id - 1) % BRANCH_BADGE_THEMES.length
      : hashText(String(branch?.name || "")) % BRANCH_BADGE_THEMES.length;
  return BRANCH_BADGE_THEMES[idx];
}

function resolveBranchList(row) {
  if (Array.isArray(row?.branch_list) && row.branch_list.length) {
    return row.branch_list;
  }
  if (row?.teaching_branches) {
    const names = String(row.teaching_branches)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ids = Array.isArray(row.branch_ids) ? row.branch_ids : [];
    return names.map((name, i) => ({ id: ids[i] || null, name }));
  }
  if (row?.branch_name) {
    return [{ id: row.branch_id || null, name: row.branch_name }];
  }
  if (row?.branch_id) {
    return [{ id: row.branch_id, name: `#${row.branch_id}` }];
  }
  return [];
}

export default function BranchBadges({ row }) {
  const branches = resolveBranchList(row);

  if (!branches.length) {
    const isHQRole = ["owner", "admin_pusat"].includes(row?.role);
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          isHQRole
            ? "border-brand/25 bg-brand-50 text-brand-dark"
            : "border-slate-200 bg-slate-100 font-medium text-slate-600"
        }`}
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isHQRole ? "bg-brand" : "bg-slate-400"}`} />
        {isHQRole ? "Semua Cabang (Pusat)" : "Pusat / Umum"}
      </span>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        branches.length > 1 ? "min-w-[230px] max-w-[400px]" : "min-w-[140px]"
      }`}
    >
      {branches.map((b, i) => {
        const theme = getBranchTheme(b);
        return (
          <span
            key={`${b.id || b.name}-${i}`}
            title={b.name}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${theme.badge}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${theme.dot}`} />
            {b.name}
          </span>
        );
      })}
    </div>
  );
}

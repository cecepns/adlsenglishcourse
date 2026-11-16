import toast from "react-hot-toast";

/**
 * Utility to export tabular data to an Excel-compatible CSV file with UTF-8 BOM.
 * @param {string} baseFilename - Base filename without extension
 * @param {Array<{key: string, label: string, render?: Function}>} columns - Columns definitions
 * @param {Array<Object>} rows - Data rows
 */
export function exportToExcel(baseFilename, columns, rows) {
  if (!rows || rows.length === 0) {
    toast.error("Tidak ada data untuk diexport");
    return;
  }

  try {
    const validCols = (columns || []).filter((c) => c && c.key && c.key !== "actions");
    const headers = ["No", ...validCols.map((c) => `"${String(c.label || c.key).replace(/"/g, '""')}"`)];

    const dataRows = rows.map((row, index) => {
      const cells = [index + 1];
      validCols.forEach((col) => {
        let val = row[col.key];

        // Format boolean
        if (typeof val === "boolean") {
          val = val ? "Ya" : "Tidak";
        } else if (val === null || val === undefined) {
          val = "";
        } else if (typeof val === "object") {
          val = JSON.stringify(val);
        } else {
          val = String(val).trim();
        }

        // Escape double quotes and enclose in quotes
        cells.push(`"${val.replace(/"/g, '""')}"`);
      });
      return cells.join(",");
    });

    // \uFEFF is UTF-8 Byte Order Mark (BOM) to force Excel to read UTF-8 properly
    const csvContent = "\uFEFF" + [headers.join(","), ...dataRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const cleanName = (baseFilename || "Export_ADLS").replace(/[^a-zA-Z0-9_\-]/g, "_");

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${cleanName}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Berhasil export ke Excel (${rows.length} baris)`);
  } catch (err) {
    console.error("Export error:", err);
    toast.error("Gagal mengexport file Excel");
  }
}

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, Download, FileSpreadsheet, CalendarDays, ShieldCheck, Info } from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";

function loadRows() {
  try { const data = JSON.parse(sessionStorage.getItem("phishguardHistory") || "[]"); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function exportCsv(rows) {
  const fields = ["URL", "Status", "Time", "Type"];
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [fields, ...rows.map((r) => [r.url, r.status, r.time, r.type || "User entry"])].map((r) => r.map(quote).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = "phishguard-report.csv"; a.click(); URL.revokeObjectURL(url);
}
export default function ReportsAnalytics() {
  const [range, setRange] = useState("all");
  const rows = useMemo(loadRows, []);
  const filteredRows = rows.filter((row) => {
    if (range === "all") return true;
    if (!row.createdAt) return false;
    const age = Date.now() - new Date(row.createdAt).getTime();
    return Number.isFinite(age) && age <= Number(range) * 24 * 60 * 60 * 1000;
  });
  return <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-7xl">
    <motion.div variants={fadeUp} className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><BarChart3 size={17} /> Reporting workspace</div><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Reports & Analytics</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Review the records currently available and export a report for your own analysis.</p></div><button type="button" onClick={() => exportCsv(filteredRows)} disabled={!filteredRows.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={17} /> Download CSV report</button></motion.div>
    <motion.div variants={fadeUp} className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileSpreadsheet size={20} /></span><p className="mt-5 text-sm font-medium text-slate-500">Stored user entries</p><p className="mt-1 text-3xl font-bold text-slate-950">{rows.length}</p><p className="mt-2 text-xs text-slate-400">Current browser session</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><CalendarDays size={20} /></span><p className="mt-5 text-sm font-medium text-slate-500">Reporting period</p><p className="mt-1 text-2xl font-bold text-slate-950">All available</p><p className="mt-2 text-xs text-slate-400">Older entries may not have timestamps</p></div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck size={20} /></span><p className="mt-5 text-sm font-medium text-slate-500">Verified detections</p><p className="mt-1 text-2xl font-bold text-slate-950">Unavailable</p><p className="mt-2 text-xs text-slate-400">ML integration pending</p></div>
    </motion.div>
    <motion.section variants={fadeUp} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="text-lg font-semibold text-slate-900">Exportable scan records</h2><p className="mt-1 text-sm text-slate-500">Download a CSV file containing the currently stored user entries.</p></div><select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Select report date range" className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600"><option value="all">All available records</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div>
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><Info size={19} className="mt-0.5 shrink-0 text-blue-700" /><p className="text-sm leading-6 text-blue-900/80">This version exports the real entries saved in this browser session. New records include timestamps, so the date filter can be used for newer entries. Older entries without timestamps are included only in the all-records report. PDF reports will be added in a later step.</p></div>
    </motion.section>
  </motion.div>;
}

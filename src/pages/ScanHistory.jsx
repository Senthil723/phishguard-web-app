import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Download, Filter, Globe, History, Search, ShieldAlert, ShieldCheck, Clock3 } from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";

function readHistory() {
  try {
    const value = JSON.parse(sessionStorage.getItem("phishguardHistory") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function downloadCsv(rows) {
  const headers = ["URL", "Status", "Time", "Type"];
  const escapeCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers, ...rows.map((row) => [row.url, row.status, row.time, row.type || "User entry"])]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "phishguard-scan-history.csv";
  link.click();
  URL.revokeObjectURL(href);
}

export default function ScanHistory() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const rows = useMemo(() => readHistory(), []);
  const filtered = rows.filter((row) => {
    const matchesQuery = String(row.url || "").toLowerCase().includes(query.toLowerCase());
    const rowStatus = String(row.status || "not analyzed").toLowerCase();
    const matchesStatus = status === "all" || (status === "pending" ? rowStatus.includes("not analyzed") || rowStatus.includes("pending") : rowStatus.includes(status));
    const createdAt = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
    const rangeDays = Number(dateRange);
    const matchesDate = dateRange === "all" || (Number.isFinite(createdAt) && Date.now() - createdAt <= rangeDays * 24 * 60 * 60 * 1000);
    return matchesQuery && matchesStatus && matchesDate;
  });

  return <motion.div variants={staggerContainer} initial="hidden" animate="show" className="mx-auto max-w-7xl">
    <motion.div variants={fadeUp} className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><History size={17} /> Investigation records</div><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Scan History</h1><p className="mt-3 text-sm leading-6 text-slate-500">Review URLs submitted in this browser session. No live detection results are available yet.</p></div>
      <button type="button" onClick={() => downloadCsv(filtered)} disabled={!filtered.length} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"><Download size={17} /> Export CSV</button>
    </motion.div>

    <motion.section variants={fadeUp} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.025]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative min-w-0 flex-1"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by URL..." aria-label="Search scan history by URL" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10" /></div>
        <div className="flex flex-wrap items-center gap-2"><Filter size={16} className="text-slate-400" /><select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter scan history by status" className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"><option value="all">All statuses</option><option value="pending">Not analyzed</option><option value="safe">Safe (demo)</option><option value="suspicious">Suspicious (demo)</option></select><select value={dateRange} onChange={(event) => setDateRange(event.target.value)} aria-label="Filter scan history by date" className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"><option value="all">All dates</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option></select></div>
      </div>
      {filtered.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Submitted URL</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date / Time</th><th className="px-5 py-4">Record type</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map((row, index) => <tr key={`${row.url}-${index}`} className="transition hover:bg-blue-50/30"><td className="max-w-[340px] px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Globe size={17} /></span><span className="truncate font-medium text-slate-800" title={row.url}>{row.url}</span></div></td><td className="px-5 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"><Clock3 size={13} />{row.status || "Demo: Not analyzed"}</span></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{row.createdAt ? new Date(row.createdAt).toLocaleString() : (row.time || "—")}</td><td className="px-5 py-4 text-slate-500">User entry</td></tr>)}</tbody></table></div> : <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500"><History size={22} /></span><h2 className="mt-4 font-semibold text-slate-900">{rows.length ? "No matching records" : "No user scans yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{rows.length ? "Try changing your search or status filter." : "URLs you submit through the URL Scanner will appear here for this browser session. Older records without a saved date appear only when All dates is selected."}</p></div>}
      <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs leading-5 text-slate-500"><ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" /> Scan status is currently demonstration-only; URLs have not been classified by a detection model.</div>
    </motion.section>
  </motion.div>;
}

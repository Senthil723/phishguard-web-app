import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  Info,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScans, getScanStats } from "../services/api";
import { getScanStatusLabel } from "../utils/scanStatus";

const REPORT_LIMIT = 100;

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function downloadCsv(rows) {
  const headers = ["ID", "URL", "Status", "Date / Time", "Record type"];
  const escapeCell = (value) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const content = [
    headers,
    ...rows.map((row) => [
      row.id,
      row.url,
      getScanStatusLabel(row.status),
      formatDateTime(row.created_at),
      "Backend database",
    ]),
  ]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");
  const downloadUrl = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = "phishguard-report.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function isValidStats(stats) {
  return (
    stats &&
    typeof stats.total_scans === "number" &&
    typeof stats.analyzed_scans === "number" &&
    typeof stats.pending_scans === "number" &&
    typeof stats.failed_scans === "number" &&
    typeof stats.unknown_scans === "number" &&
    stats.status_counts &&
    typeof stats.status_counts === "object" &&
    !Array.isArray(stats.status_counts)
  );
}

export default function ReportsAnalytics() {
  const [range, setRange] = useState("all");
  const [stats, setStats] = useState(null);
  const [rows, setRows] = useState([]);
  const [referenceTime, setReferenceTime] = useState(Date.now);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      const [statsData, records] = await Promise.all([
        getScanStats(),
        getScans(REPORT_LIMIT),
      ]);

      if (!isValidStats(statsData) || !Array.isArray(records)) {
        throw new Error("The backend returned an unexpected reports response.");
      }

      setStats(statsData);
      setRows(records);
      setReferenceTime(Date.now());
    } catch (requestError) {
      console.error("Failed to load report data:", requestError);
      setError(
        "Unable to load report data. Check that the backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  function refreshReports() {
    setLoading(true);
    setError("");
    fetchReports();
  }

  const filteredRows = useMemo(() => {
    if (range === "all") return rows;

    const cutoff = referenceTime - Number(range) * 24 * 60 * 60 * 1000;

    return rows.filter((row) => {
      const createdAt = new Date(row.created_at).getTime();
      return (
        Number.isFinite(createdAt) &&
        createdAt >= cutoff &&
        createdAt <= referenceTime
      );
    });
  }, [rows, range, referenceTime]);

  const summaryCards = [
    {
      label: "Submitted URLs",
      value: stats?.total_scans,
      description: "All records in the database",
      icon: FileSpreadsheet,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Pending analysis",
      value: stats?.pending_scans,
      description: "Waiting for analysis",
      icon: Clock3,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Completed analyses",
      value: stats?.analyzed_scans,
      description: "Marked completed by status",
      icon: BarChart3,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Failed analyses",
      value: stats?.failed_scans,
      description: "Marked failed by status",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-700",
    },
    {
      label: "Other statuses",
      value: stats?.unknown_scans,
      description: "Not in a known status group",
      icon: ShieldAlert,
      color: "bg-slate-100 text-slate-600",
    },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-7xl"
    >
      <motion.div
        variants={fadeUp}
        className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BarChart3 size={17} />
            Reporting workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Reports &amp; Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            Database-wide counts and saved scan records. Completed means the
            backend status says completed; it is not a phishing verdict.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshReports}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filteredRows)}
            disabled={loading || Boolean(error) || !filteredRows.length}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download size={17} />
            Download CSV
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          variants={fadeUp}
          role="alert"
          className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
          <button
            type="button"
            onClick={refreshReports}
            className="shrink-0 self-start font-semibold underline sm:ml-auto"
          >
            Try again
          </button>
        </motion.div>
      )}

      <motion.div
        variants={fadeUp}
        className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-busy={loading}
        aria-label="Database scan statistics"
      >
        {summaryCards.map(({ label, value, description, icon: Icon, color }) => (
          <article
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}
            >
              <Icon size={20} />
            </span>
            <p className="mt-5 text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-950">
              {loading ? "…" : error ? "—" : value}
            </p>
            <p className="mt-2 text-xs text-slate-400">{description}</p>
          </article>
        ))}
      </motion.div>

      <motion.section
        variants={fadeUp}
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Saved scan records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Select a date range to filter the records shown and exported.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays size={17} />
            <span className="sr-only">Select report date range</span>
            <select
              value={range}
              onChange={(event) => setRange(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
            >
              <option value="all">All available records</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
          <Info size={19} className="mt-0.5 shrink-0 text-blue-700" />
          <p className="text-sm leading-6 text-blue-900/80">
            Statistics cover the whole database. The API returns at most the
            latest {REPORT_LIMIT} records for display and CSV export; older
            records are not included in the exported list. No phishing
            detections or model performance are claimed.
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center" role="status">
            <RefreshCw size={24} className="mx-auto animate-spin text-blue-600" />
            <p className="mt-4 text-sm text-slate-500">
              Loading records from the backend...
            </p>
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-slate-500">
            Saved records are unavailable until the request succeeds.
          </p>
        ) : filteredRows.length ? (
          <div className="mt-5 max-h-[34rem] overflow-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Submitted URL</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {row.id}
                    </td>
                    <td className="max-w-[360px] truncate px-4 py-3 text-slate-800">
                      {row.url}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {getScanStatusLabel(row.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                      {formatDateTime(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileSpreadsheet size={24} className="mx-auto text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">
              {rows.length ? "No records in this date range" : "No saved scans yet"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {rows.length
                ? "Choose a wider date range to see available saved scans."
                : "Submit a URL through the URL Scanner to create a database record."}
            </p>
          </div>
        )}

        {stats && !error && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Backend status counts
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(stats.status_counts).length ? (
                Object.entries(stats.status_counts).map(([status, count]) => (
                  <span
                    key={status}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                  >
                    {getScanStatusLabel(status)}: {count}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  No status values recorded.
                </span>
              )}
            </div>
          </div>
        )}
      </motion.section>

      <motion.p
        variants={fadeUp}
        className="flex items-start gap-2 text-xs leading-5 text-slate-500"
      >
        <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
        Statistics describe saved database statuses only. They are not proof
        that any URL is safe or malicious.
      </motion.p>
    </motion.div>
  );
}

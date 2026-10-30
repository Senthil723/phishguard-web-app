import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Download,
  Filter,
  Globe,
  History,
  Search,
  ShieldAlert,
  Clock3,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScans } from "../services/api";
import {
  getScanStatusCategory,
  getScanStatusLabel,
} from "../utils/scanStatus";

// Export the currently filtered records as a CSV file.
function downloadCsv(rows) {
  const headers = ["ID", "URL", "Status", "Date / Time", "Type"];

  const escapeCell = (value) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  const csv = [
    headers,
    ...rows.map((row) => [
      row.id,
      row.url,
      getScanStatusLabel(row.status),
      row.createdAt ? new Date(row.createdAt).toLocaleString() : "",
      "Backend database",
    ]),
  ]
    .map((row) => row.map(escapeCell).join(","))
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = "phishguard-scan-history.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Allow the browser time to start the download before cleanup.
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

export default function ScanHistory() {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const scans = await getScans(100);

      if (!Array.isArray(scans)) {
        throw new Error("The backend returned an unexpected response.");
      }

      setRows(
        scans.map((scan) => ({
          id: scan.id,
          url: scan.url,
          status: scan.status || "not_analyzed",
          createdAt: scan.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to load scan history:", err);
      setError(
        "Unable to load scan history. Check that the backend is running and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const matchesQuery = String(row.url || "")
        .toLowerCase()
        .includes(query.toLowerCase());

      const rowStatus = getScanStatusCategory(row.status);

      const matchesStatus =
        status === "all" || rowStatus === status;

      const createdAt = row.createdAt
        ? new Date(row.createdAt).getTime()
        : NaN;

      const rangeDays = Number(dateRange);

      const matchesDate =
        dateRange === "all" ||
        (Number.isFinite(createdAt) &&
          Date.now() - createdAt >= 0 &&
          Date.now() - createdAt <=
            rangeDays * 24 * 60 * 60 * 1000);

      return matchesQuery && matchesStatus && matchesDate;
    });
  }, [rows, query, status, dateRange]);

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
            <History size={17} />
            Investigation records
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Scan History
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Review URLs saved in the PhishGuard backend database.
            Detection results are not available yet. Showing up to the latest
            100 saved records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={!filtered.length || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download size={17} />
            Export CSV
          </button>
        </div>
      </motion.div>

      <motion.section
        variants={fadeUp}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.025]"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="relative min-w-0 flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by URL..."
              aria-label="Search scan history by URL"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter size={16} className="text-slate-400" />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter scan history by status"
              className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending Analysis</option>
              <option value="completed">Analysis Completed</option>
              <option value="failed">Analysis Failed</option>
              <option value="unknown">Other / Unknown</option>
            </select>

            <select
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              aria-label="Filter scan history by date"
              className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400"
            >
              <option value="all">All dates</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center">
            <RefreshCw
              size={24}
              className="mx-auto animate-spin text-blue-600"
            />
            <p className="mt-4 text-sm text-slate-500">
              Loading saved scans...
            </p>
          </div>
        ) : error ? (
          <div className="px-6 py-16 text-center">
            <AlertTriangle
              size={24}
              className="mx-auto text-red-500"
            />
            <h2 className="mt-4 font-semibold text-slate-900">
              Couldn't load scan history
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {error}
            </p>
            <button
              type="button"
              onClick={loadHistory}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try again
            </button>
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Submitted URL</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Date / Time</th>
                  <th className="px-5 py-4">Record type</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="transition hover:bg-blue-50/30"
                  >
                    <td className="max-w-[340px] px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                          <Globe size={17} />
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/results/${row.id}`, {
                              state: {
                                url: row.url,
                              },
                            })
                          }
                          className="truncate text-left font-medium text-blue-700 underline-offset-4 transition hover:text-blue-900 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          title={`View saved scan #${row.id}`}
                          aria-label={`View scan results for ${row.url}`}
                        >
                          {row.url}
                        </button>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                        <Clock3 size={13} />
                        {getScanStatusLabel(row.status)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleString()
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-500">
                      Backend database
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <History size={22} />
            </span>

            <h2 className="mt-4 font-semibold text-slate-900">
              {rows.length ? "No matching records" : "No saved scans yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {rows.length
                ? "Try changing your search or filters."
                : "Submit a URL through the URL Scanner to create your first database record."}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs leading-5 text-slate-500">
          <ShieldAlert
            size={15}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          Scan status is not a phishing verdict. No detection model
          or security service has classified these URLs.
        </div>
      </motion.section>
    </motion.div>
  );
}

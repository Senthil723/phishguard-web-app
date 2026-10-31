import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Download,
  Filter,
  Globe,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScans } from "../services/api";
import {
  getScanStatusCategory,
  getScanStatusLabel,
} from "../utils/scanStatus";

const HISTORY_LIMIT = 100;
const PAGE_SIZE = 10;

const statusAppearance = {
  pending: {
    icon: Clock3,
    className: "bg-amber-50 text-amber-800 ring-amber-200",
  },
  completed: {
    icon: CheckCircle2,
    className: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  },
  failed: {
    icon: XCircle,
    className: "bg-red-50 text-red-800 ring-red-200",
  },
  unknown: {
    icon: CircleHelp,
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getStatusAppearance(status) {
  const category = getScanStatusCategory(status);
  return statusAppearance[category] || statusAppearance.unknown;
}

function StatusBadge({ status }) {
  const appearance = getStatusAppearance(status);
  const StatusIcon = appearance.icon;
  const category = getScanStatusCategory(status);
  const label = getScanStatusLabel(status);

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${appearance.className}`}
    >
      <StatusIcon aria-hidden="true" size={13} />
      {category === "unknown" ? `Unknown: ${label}` : label}
    </span>
  );
}

function makeCsvSafe(value) {
  const text = String(value ?? "");
  let firstVisibleCharacter = 0;

  while (
    firstVisibleCharacter < text.length &&
    text.charCodeAt(firstVisibleCharacter) <= 0x20
  ) {
    firstVisibleCharacter += 1;
  }

  if ("=+-@".includes(text[firstVisibleCharacter] || "")) {
    return `'${text}`;
  }

  return text;
}

function escapeCsvCell(value) {
  return `"${makeCsvSafe(value).replaceAll('"', '""')}"`;
}

function downloadCsv(rows) {
  const headers = [
    "Scan ID",
    "Submitted URL",
    "Status",
    "Status Category",
    "Created At (ISO 8601 UTC)",
    "Source",
  ];

  const csvRows = rows.map((row) => {
    const category = getScanStatusCategory(row.status);
    const createdAt = row.createdAt ? new Date(row.createdAt) : null;

    return [
      row.id,
      row.url,
      getScanStatusLabel(row.status),
      category,
      createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toISOString()
        : "",
      "Backend database",
    ];
  });

  const csv = [headers, ...csvRows]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = href;
  link.download = `phishguard-scan-history-${localDateKey(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}

function isValidRecord(record) {
  return (
    record &&
    typeof record === "object" &&
    Number.isSafeInteger(record.id) &&
    record.id > 0 &&
    typeof record.url === "string" &&
    record.url.trim().length > 0 &&
    (record.status == null || typeof record.status === "string") &&
    (record.created_at == null || typeof record.created_at === "string")
  );
}

export default function ScanHistory() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [todayKey, setTodayKey] = useState(() => localDateKey(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;

    try {
      const scans = await getScans(HISTORY_LIMIT);

      if (!Array.isArray(scans) || !scans.every(isValidRecord)) {
        throw new Error("The backend returned an unexpected history response.");
      }

      setRows(
        scans.map((scan) => ({
          id: scan.id,
          url: scan.url,
          status: scan.status || "",
          createdAt: scan.created_at || "",
        }))
      );
    } catch (requestError) {
      console.error("Failed to load scan history:", requestError);
      setError(
        "Unable to load scan history. Check that the backend is running and try again."
      );
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadHistory);
  }, [loadHistory]);

  const refreshHistory = useCallback(() => {
    setTodayKey(localDateKey(new Date()));
    setLoading(true);
    setError("");
    loadHistory();
  }, [loadHistory]);

  const customRangeInvalid =
    dateRange === "custom" && dateFrom && dateTo && dateFrom > dateTo;

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const todayStart = new Date(`${todayKey}T00:00:00`);
    todayStart.setHours(0, 0, 0, 0);

    const filteredRows = rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        row.url.toLocaleLowerCase().includes(normalizedQuery) ||
        String(row.id).includes(normalizedQuery);

      const category = getScanStatusCategory(row.status);
      const matchesStatus = status === "all" || category === status;

      let matchesDate = true;
      if (dateRange !== "all") {
        const timestamp = row.createdAt ? new Date(row.createdAt) : null;
        const validTimestamp =
          timestamp && !Number.isNaN(timestamp.getTime());

        if (!validTimestamp) {
          matchesDate = false;
        } else if (dateRange === "today") {
          matchesDate = localDateKey(timestamp) === todayKey;
        } else if (dateRange === "7" || dateRange === "30") {
          const firstDay = new Date(todayStart);
          firstDay.setDate(firstDay.getDate() - (Number(dateRange) - 1));
          matchesDate =
            localDateKey(timestamp) >= localDateKey(firstDay) &&
            localDateKey(timestamp) <= todayKey;
        } else if (dateRange === "custom") {
          const recordDate = localDateKey(timestamp);
          matchesDate =
            (!dateFrom || recordDate >= dateFrom) &&
            (!dateTo || recordDate <= dateTo) &&
            !customRangeInvalid;
        }
      }

      return matchesQuery && matchesStatus && matchesDate;
    });

    return filteredRows.sort((a, b) => {
      if (sortBy === "url-asc" || sortBy === "url-desc") {
        const order = a.url.localeCompare(b.url, undefined, {
          sensitivity: "base",
          numeric: true,
        });
        return sortBy === "url-asc" ? order : -order;
      }

      if (sortBy === "id-asc") return a.id - b.id;
      if (sortBy === "id-desc") return b.id - a.id;

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
      const validA = Number.isFinite(timeA);
      const validB = Number.isFinite(timeB);

      if (validA !== validB) return validA ? -1 : 1;
      if (validA && timeA !== timeB) {
        return sortBy === "oldest" ? timeA - timeB : timeB - timeA;
      }

      return sortBy === "oldest" ? a.id - b.id : b.id - a.id;
    });
  }, [
    rows,
    query,
    status,
    dateRange,
    dateFrom,
    dateTo,
    customRangeInvalid,
    sortBy,
    todayKey,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstVisible = filtered.length ? (currentPage - 1) * PAGE_SIZE : 0;
  const visibleRows = filtered.slice(firstVisible, firstVisible + PAGE_SIZE);
  const summary = useMemo(
    () =>
      rows.reduce(
        (counts, row) => {
          counts[getScanStatusCategory(row.status)] += 1;
          return counts;
        },
        { pending: 0, completed: 0, failed: 0, unknown: 0 }
      ),
    [rows]
  );

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setDateRange("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("newest");
    setPage(1);
  }

  function openRecord(row) {
    if (!Number.isSafeInteger(row.id) || row.id < 1) return;

    navigate(`/results/${row.id}`, {
      state: { url: row.url },
    });
  }

  function renderDetailsButton(row) {
    return (
      <button
        type="button"
        onClick={() => openRecord(row)}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        aria-label={`View scan results for record ${row.id}`}
      >
        View details <ChevronRight aria-hidden="true" size={16} />
      </button>
    );
  }

  const pageVariants = shouldReduceMotion ? undefined : staggerContainer;
  const itemVariants = shouldReduceMotion ? undefined : fadeUp;

  return (
    <motion.main
      variants={pageVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="mx-auto max-w-7xl"
      aria-labelledby="scan-history-title"
    >
      <motion.header
        variants={itemVariants}
        className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <History aria-hidden="true" size={17} />
            Backend investigation records
          </div>
          <h1
            id="scan-history-title"
            className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            Scan History
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Browse saved URL submissions and their database-reported status.
            Phishing detection is not connected.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshHistory}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            <RefreshCw
              aria-hidden="true"
              size={17}
              className={loading ? "animate-spin motion-reduce:animate-none" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(filtered)}
            disabled={!filtered.length || loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 motion-reduce:transition-none"
          >
            <Download aria-hidden="true" size={17} />
            Export filtered records ({filtered.length})
          </button>
        </div>
      </motion.header>

      <motion.section
        variants={itemVariants}
        className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4"
        aria-label={`Status counts across ${rows.length} loaded records`}
      >
        {[
          ["Pending", summary.pending, "text-amber-800", "bg-amber-50"],
          ["Completed", summary.completed, "text-cyan-800", "bg-cyan-50"],
          ["Failed", summary.failed, "text-red-800", "bg-red-50"],
          ["Unknown", summary.unknown, "text-slate-700", "bg-slate-100"],
        ].map(([label, count, textColor, surface]) => (
          <article
            key={label}
            className={`rounded-xl border border-slate-200 ${surface} p-4`}
          >
            <p className="text-xs font-medium text-slate-600">{label} status</p>
            <p className={`mt-1 text-2xl font-bold ${textColor}`}>
              {loading ? "—" : count}
            </p>
          </article>
        ))}
        <p className="col-span-full text-xs text-slate-500">
          Counts reflect the {rows.length} records loaded from the latest{" "}
          {HISTORY_LIMIT} backend results, not necessarily every database record.
        </p>
      </motion.section>

      <motion.section
        variants={itemVariants}
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.025]"
        aria-label="Scan history records"
      >
        <div className="space-y-4 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                aria-hidden="true"
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => updateFilter(setQuery, event.target.value)}
                placeholder="Search by URL or record ID..."
                aria-label="Search scan history by URL or record ID"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-10 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => updateFilter(setQuery, "")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X aria-hidden="true" size={16} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter aria-hidden="true" size={16} className="text-slate-500" />
              <select
                value={status}
                onChange={(event) => updateFilter(setStatus, event.target.value)}
                aria-label="Filter scan history by status"
                className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending Analysis</option>
                <option value="completed">Analysis Completed</option>
                <option value="failed">Analysis Failed</option>
                <option value="unknown">Unknown Status</option>
              </select>

              <select
                value={dateRange}
                onChange={(event) => {
                  setTodayKey(localDateKey(new Date()));
                  updateFilter(setDateRange, event.target.value);
                  if (event.target.value !== "custom") {
                    setDateFrom("");
                    setDateTo("");
                  }
                }}
                aria-label="Filter scan history by date"
                className="min-w-36 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="all">All dates</option>
                <option value="today">Today</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>

              <select
                value={sortBy}
                onChange={(event) => updateFilter(setSortBy, event.target.value)}
                aria-label="Sort scan history"
                className="min-w-40 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="url-asc">URL A to Z</option>
                <option value="url-desc">URL Z to A</option>
                <option value="id-asc">ID low to high</option>
                <option value="id-desc">ID high to low</option>
              </select>
            </div>
          </div>

          {dateRange === "custom" && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => updateFilter(setDateFrom, event.target.value)}
                  aria-label="Custom date range start"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                Through
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => updateFilter(setDateTo, event.target.value)}
                  aria-label="Custom date range end"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                />
              </label>
              {customRangeInvalid && (
                <p role="alert" className="pb-2 text-sm text-red-700">
                  The start date must be on or before the end date.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <p aria-live="polite">
              {loading
                ? "Loading backend records..."
                : `Showing ${filtered.length ? firstVisible + 1 : 0}–${Math.min(
                    firstVisible + PAGE_SIZE,
                    filtered.length
                  )} of ${filtered.length} matching loaded records`}
            </p>
            <button
              type="button"
              onClick={clearFilters}
              disabled={
                !query &&
                status === "all" &&
                dateRange === "all" &&
                !dateFrom &&
                !dateTo &&
                sortBy === "newest"
              }
              className="rounded px-2 py-1 font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {loading ? (
          <div
            role="status"
            aria-live="polite"
            className="px-6 py-16 text-center"
          >
            <RefreshCw
              aria-hidden="true"
              size={24}
              className="mx-auto animate-spin text-blue-600 motion-reduce:animate-none"
            />
            <p className="mt-4 text-sm text-slate-600">
              Retrieving saved records from the backend...
            </p>
          </div>
        ) : error ? (
          <div role="alert" className="px-6 py-16 text-center">
            <AlertTriangle
              aria-hidden="true"
              size={24}
              className="mx-auto text-red-700"
            />
            <h2 className="mt-4 font-semibold text-slate-900">
              Couldn’t load scan history
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
              {error}
            </p>
            <button
              type="button"
              onClick={refreshHistory}
              className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Try again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <History
              aria-hidden="true"
              size={24}
              className="mx-auto text-slate-500"
            />
            <h2 className="mt-4 font-semibold text-slate-900">
              No saved submissions yet
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Submit a URL to create a backend investigation record.
            </p>
            <Link
              to="/scanner"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Open URL Scanner <ArrowUpRight aria-hidden="true" size={16} />
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Search aria-hidden="true" size={24} className="mx-auto text-slate-500" />
            <h2 className="mt-4 font-semibold text-slate-900">
              No matching records
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Try another URL or record ID, or clear the selected filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {visibleRows.map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Globe aria-hidden="true" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => openRecord(row)}
                        className="block w-full break-all text-left text-sm font-semibold text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label={`View scan results for ${row.url}`}
                      >
                        {row.url}
                      </button>
                      <p className="mt-1 text-xs text-slate-600">
                        Record #{row.id} · {formatDateTime(row.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <StatusBadge status={row.status} />
                    {renderDetailsButton(row)}
                  </div>
                  <p className="text-xs text-slate-600">Backend database submission</p>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[800px] text-left text-sm">
                <caption className="sr-only">
                  Loaded URL submissions, their status, date, and available actions
                </caption>
                <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-4">Record ID</th>
                    <th scope="col" className="px-4 py-4">Submitted URL</th>
                    <th scope="col" className="px-4 py-4">Status</th>
                    <th scope="col" className="px-4 py-4">Date / Time</th>
                    <th scope="col" className="px-4 py-4">Source</th>
                    <th scope="col" className="px-4 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRows.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-blue-50/30 motion-reduce:transition-none"
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-800">
                        {row.id}
                      </td>
                      <td className="max-w-[360px] px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openRecord(row)}
                          title={row.url}
                          aria-label={`View scan results for ${row.url}`}
                          className="block w-full break-all text-left font-medium text-blue-700 underline-offset-4 hover:text-blue-900 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          {row.url}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        Backend database
                      </td>
                      <td className="px-4 py-4">{renderDetailsButton(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav
              aria-label="Scan history pagination"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 sm:px-5"
            >
              <p className="text-sm text-slate-600">
                Page {currentPage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft aria-hidden="true" size={16} />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(pageCount, value + 1))
                  }
                  disabled={currentPage >= pageCount}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                  <ChevronRight aria-hidden="true" size={16} />
                </button>
              </div>
            </nav>
          </>
        )}

        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs leading-5 text-slate-600">
          <ShieldAlert
            aria-hidden="true"
            size={15}
            className="mt-0.5 shrink-0 text-amber-700"
          />
          These records are saved submissions, not phishing verdicts. Only
          backend statuses are shown; no detection model or security service
          has classified these URLs.
        </div>
      </motion.section>
    </motion.main>
  );
}

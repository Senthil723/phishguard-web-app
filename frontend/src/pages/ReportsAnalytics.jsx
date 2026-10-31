import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  HelpCircle,
  Info,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScanAnalytics, getScans } from "../services/api";
import {
  getScanStatusCategory,
  getScanStatusLabel,
} from "../utils/scanStatus";

const REPORT_LIMIT = 100;
const STATUS_CATEGORIES = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock3,
    color: "bg-amber-500",
    text: "text-amber-800",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    color: "bg-cyan-600",
    text: "text-cyan-800",
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
    color: "bg-red-600",
    text: "text-red-800",
  },
  {
    key: "unknown",
    label: "Unknown",
    icon: HelpCircle,
    color: "bg-slate-500",
    text: "text-slate-700",
  },
];

function utcDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function validDateKey(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function formatDateTime(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function safeCsvCell(value) {
  const text = String(value ?? "");
  let firstVisibleCharacter = 0;

  while (
    firstVisibleCharacter < text.length &&
    text.charCodeAt(firstVisibleCharacter) <= 0x20
  ) {
    firstVisibleCharacter += 1;
  }

  const safeText = "=+-@".includes(text[firstVisibleCharacter] || "")
    ? `'${text}`
    : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadCsv(analytics, records, rangeLabel) {
  const output = [
    ["PhishGuard Reports & Analytics"],
    ["Generated at (UTC)", new Date().toISOString()],
    ["Selected UTC range", rangeLabel],
    ["Data source", "Backend database aggregates"],
    ["Record detail limit", `Latest ${REPORT_LIMIT} records only`],
    [],
    ["Summary metric", "Count"],
    ["Total submissions", analytics.total_scans],
    ["Completed processing statuses", analytics.analyzed_scans],
    ["Pending processing statuses", analytics.pending_scans],
    ["Failed processing statuses", analytics.failed_scans],
    ["Unknown statuses", analytics.unknown_scans],
    [],
    ["Status distribution (raw backend statuses)", "Count"],
    ...Object.entries(analytics.status_counts),
    [],
    ["Daily submissions (UTC)", "Count"],
    ...analytics.daily_submissions.map(({ date, count }) => [date, count]),
    [],
    [`Latest matching record details (maximum ${REPORT_LIMIT})`],
    ["ID", "Submitted URL", "Backend status", "Created at (UTC)"],
    ...records.map((record) => {
      const createdAt = record.created_at ? new Date(record.created_at) : null;
      return [
        record.id,
        record.url,
        record.status,
        createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.toISOString()
          : "Date unavailable",
      ];
    }),
  ];
  const content = output
    .map((row) => row.map(safeCsvCell).join(","))
    .join("\r\n");
  const downloadUrl = URL.createObjectURL(
    new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" })
  );
  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = `phishguard-report-${utcDateKey(new Date())}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
}

function isValidAnalytics(data, dateFilter) {
  const countFields = [
    "total_scans",
    "analyzed_scans",
    "pending_scans",
    "failed_scans",
    "unknown_scans",
  ];
  const validCounts =
    data &&
    countFields.every(
      (field) => Number.isSafeInteger(data[field]) && data[field] >= 0
    ) &&
    data.status_counts &&
    typeof data.status_counts === "object" &&
    !Array.isArray(data.status_counts) &&
    Object.values(data.status_counts).every(
      (count) => Number.isSafeInteger(count) && count >= 0
    );

  return (
    data &&
    typeof data === "object" &&
    validCounts &&
    (data.from_date || null) === (dateFilter.fromDate || null) &&
    (data.through_date || null) === (dateFilter.throughDate || null) &&
    data.total_scans === Object.values(data.status_counts).reduce((sum, count) => sum + count, 0) &&
    data.total_scans ===
      data.analyzed_scans +
        data.pending_scans +
        data.failed_scans +
        data.unknown_scans &&
    data.timezone === "UTC" &&
    Array.isArray(data.daily_submissions) &&
    data.daily_submissions.every(
      (bucket) =>
        bucket &&
        validDateKey(bucket.date) &&
        Number.isSafeInteger(bucket.count) &&
        bucket.count > 0
    ) &&
    data.daily_submissions.reduce((sum, bucket) => sum + bucket.count, 0) ===
      data.total_scans
  );
}

function isValidRecord(record) {
  return (
    record &&
    typeof record === "object" &&
    Number.isSafeInteger(record.id) &&
    record.id > 0 &&
    typeof record.url === "string" &&
    typeof record.status === "string" &&
    (record.created_at == null || typeof record.created_at === "string")
  );
}

function dateToDayNumber(value) {
  return Date.parse(`${value}T00:00:00Z`) / 86400000;
}

function ActivityChart({ analytics, dateFilter }) {
  const buckets = analytics?.daily_submissions || [];
  if (!buckets.length) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-10 text-center">
        <BarChart3 aria-hidden="true" size={24} className="mx-auto text-slate-400" />
        <p className="mt-3 font-medium text-slate-800">No activity in this range</p>
        <p className="mt-1 text-sm text-slate-600">
          No saved submissions with timestamps were returned for this UTC range.
        </p>
      </div>
    );
  }

  const width = 960;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 48, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const firstDay =
    dateFilter.fromDate || buckets[0].date;
  const lastDay =
    dateFilter.throughDate || buckets[buckets.length - 1].date;
  const startDay = dateToDayNumber(firstDay);
  const endDay = Math.max(startDay + 1, dateToDayNumber(lastDay));
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const slotWidth = chartWidth / Math.max(1, endDay - startDay + 1);
  const barWidth = Math.max(1, Math.min(20, slotWidth * 0.72));
  const labelIndexes = new Set(
    buckets.map((_, index) =>
      Math.round((index * (buckets.length - 1)) / Math.min(5, buckets.length - 1 || 1))
    )
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Daily submissions in UTC. ${analytics.total_scans} total records in selected range.`}
        className="h-auto min-w-[640px] w-full"
      >
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          stroke="#cbd5e1"
        />
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + chartHeight * (1 - fraction);
          const value = Math.round(maxCount * fraction);
          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={fraction === 0 ? undefined : "4 4"}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[11px]"
              >
                {value}
              </text>
            </g>
          );
        })}
        {buckets.map((bucket) => {
          const x =
            padding.left +
            ((dateToDayNumber(bucket.date) - startDay) / (endDay - startDay)) *
              chartWidth -
            barWidth / 2;
          const barHeight = (bucket.count / maxCount) * chartHeight;
          const y = padding.top + chartHeight - barHeight;
          return (
            <g key={bucket.date}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                className="fill-blue-600"
              >
                <title>{`${bucket.date}: ${bucket.count} submissions`}</title>
              </rect>
            </g>
          );
        })}
        {buckets.map((bucket, index) => {
          if (!labelIndexes.has(index)) return null;
          const x =
            padding.left +
            ((dateToDayNumber(bucket.date) - startDay) / (endDay - startDay)) *
              chartWidth;
          return (
            <text
              key={`${bucket.date}-label`}
              x={x}
              y={height - 16}
              textAnchor="middle"
              className="fill-slate-600 text-[11px]"
            >
              {bucket.date.slice(5)}
            </text>
          );
        })}
      </svg>
      <p className="px-4 pb-3 text-xs text-slate-600">
        Each bar is a UTC calendar day with saved submissions; unplotted days
        had no timestamped submissions.
      </p>
    </div>
  );
}

function StatusDistribution({ analytics }) {
  const total = analytics?.total_scans || 0;

  return (
    <div className="space-y-4">
      {STATUS_CATEGORIES.map(({ key, label, icon: Icon, color, text }) => {
        const count = analytics?.[`${key === "completed" ? "analyzed" : key}_scans`] || 0;
        const percentage = total ? (count / total) * 100 : 0;

        return (
          <div key={key}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className={`inline-flex items-center gap-2 text-sm font-medium ${text}`}>
                <Icon aria-hidden="true" size={16} />
                {label}
              </span>
              <span className="text-sm font-semibold text-slate-800">
                {count} <span className="font-normal text-slate-500">({percentage.toFixed(1)}%)</span>
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label={`${label} status distribution`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Number(percentage.toFixed(1))}
            >
              <div
                className={`h-full rounded-full ${color}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="border-t border-slate-100 pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          Raw backend status values
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.entries(analytics?.status_counts || {}).length ? (
            Object.entries(analytics.status_counts).map(([status, count]) => (
              <span
                key={status}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
              >
                {getScanStatusLabel(status)}: {count}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-600">No statuses recorded.</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReportsAnalytics() {
  const shouldReduceMotion = useReducedMotion();
  const [range, setRange] = useState("30");
  const [today, setToday] = useState(() => utcDateKey(new Date()));
  const [customFrom, setCustomFrom] = useState("");
  const [customThrough, setCustomThrough] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState("");
  const [recordsError, setRecordsError] = useState("");
  const requestId = useRef(0);

  const dateFilter = useMemo(() => {
    if (range === "all") {
      return { fromDate: "", throughDate: "", label: "All time (UTC)", invalid: false };
    }
    if (range === "today") {
      return { fromDate: today, throughDate: today, label: `${today} UTC`, invalid: false };
    }
    if (range === "7" || range === "30") {
      const start = new Date(`${today}T00:00:00Z`);
      start.setUTCDate(start.getUTCDate() - (Number(range) - 1));
      const fromDate = utcDateKey(start);
      return {
        fromDate,
        throughDate: today,
        label: `${fromDate} through ${today} UTC`,
        invalid: false,
      };
    }
    const invalid =
      (customFrom && !validDateKey(customFrom)) ||
      (customThrough && !validDateKey(customThrough)) ||
      (customFrom && customThrough && customFrom > customThrough);
    return {
      fromDate: customFrom,
      throughDate: customThrough,
      label: `${customFrom || "Beginning"} through ${customThrough || "Present"} UTC`,
      invalid: Boolean(invalid),
    };
  }, [range, today, customFrom, customThrough]);

  const fetchAnalytics = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setAnalytics(null);
    setAnalyticsError("");

    if (dateFilter.invalid) {
      setAnalyticsLoading(false);
      setAnalyticsError("Choose valid dates and ensure the start is not after the end.");
      return;
    }

    setAnalyticsLoading(true);
    try {
      const response = await getScanAnalytics({
        fromDate: dateFilter.fromDate || undefined,
        throughDate: dateFilter.throughDate || undefined,
      });

      if (!isValidAnalytics(response, dateFilter)) {
        throw new Error("The backend returned an unexpected analytics response.");
      }
      if (currentRequest === requestId.current) setAnalytics(response);
    } catch (requestError) {
      console.error("Failed to load report analytics:", requestError);
      if (currentRequest === requestId.current) {
        setAnalyticsError(
          "Unable to load analytics from the backend. Check the connection and try again."
        );
      }
    } finally {
      if (currentRequest === requestId.current) setAnalyticsLoading(false);
    }
  }, [dateFilter]);

  const fetchRecords = useCallback(async () => {
    setRecordsLoading(true);
    setRecordsError("");
    try {
      const response = await getScans(REPORT_LIMIT);
      if (!Array.isArray(response) || !response.every(isValidRecord)) {
        throw new Error("The backend returned an unexpected scan list.");
      }
      setRecords(response);
    } catch (requestError) {
      console.error("Failed to load report records:", requestError);
      setRecordsError("Latest scan record details are unavailable. Try refreshing.");
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchAnalytics);
  }, [fetchAnalytics]);

  useEffect(() => {
    void Promise.resolve().then(fetchRecords);
  }, [fetchRecords]);

  const filteredRecords = useMemo(() => {
    if (!dateFilter.fromDate && !dateFilter.throughDate) return records;

    return records.filter((record) => {
      if (!record.created_at) return false;
      const timestamp = new Date(record.created_at);
      if (Number.isNaN(timestamp.getTime())) return false;
      const recordDate = timestamp.toISOString().slice(0, 10);
      return (
        (!dateFilter.fromDate || recordDate >= dateFilter.fromDate) &&
        (!dateFilter.throughDate || recordDate <= dateFilter.throughDate)
      );
    });
  }, [records, dateFilter]);

  const summaryCards = [
    {
      label: "Total submissions",
      value: analytics?.total_scans,
      description: "Matching database records",
      icon: FileSpreadsheet,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Completed analyses",
      value: analytics?.analyzed_scans,
      description: "Completed processing status, not a verdict",
      icon: CheckCircle2,
      color: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Pending analyses",
      value: analytics?.pending_scans,
      description: "Awaiting backend processing",
      icon: Clock3,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "Failed analyses",
      value: analytics?.failed_scans,
      description: "Marked failed by backend status",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-700",
    },
    {
      label: "Unknown statuses",
      value: analytics?.unknown_scans,
      description: "Unrecognized processing statuses",
      icon: ShieldAlert,
      color: "bg-slate-100 text-slate-700",
    },
  ];

  const busy = analyticsLoading || recordsLoading;

  function refreshReports() {
    const refreshedToday = utcDateKey(new Date());
    setToday(refreshedToday);
    if (refreshedToday === today) {
      void fetchAnalytics();
    }
    void fetchRecords();
  }

  function changeRange(value) {
    setToday(utcDateKey(new Date()));
    setRange(value);
  }

  const pageVariants = shouldReduceMotion ? undefined : staggerContainer;
  const itemVariants = shouldReduceMotion ? undefined : fadeUp;

  return (
    <motion.main
      variants={pageVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="mx-auto max-w-7xl"
      aria-labelledby="reports-title"
    >
      <motion.header
        variants={itemVariants}
        className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
            <BarChart3 aria-hidden="true" size={17} />
            Reporting workspace
          </div>
          <h1 id="reports-title" className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Reports &amp; Analytics
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Database-wide URL submission and backend processing statistics for the selected UTC date range.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refreshReports}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
          >
            <RefreshCw aria-hidden="true" size={17} className={busy ? "animate-spin motion-reduce:animate-none" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => downloadCsv(analytics, filteredRecords, dateFilter.label)}
            disabled={analyticsLoading || recordsLoading || !analytics}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 motion-reduce:transition-none"
          >
            <Download aria-hidden="true" size={17} />
            Export CSV report
          </button>
        </div>
      </motion.header>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CalendarDays aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-blue-700" />
          <div>
            <label htmlFor="report-range" className="block text-sm font-semibold text-slate-900">
              Report date range
            </label>
            <p className="mt-1 text-xs text-slate-600">All boundaries and daily buckets use UTC.</p>
          </div>
        </div>
        <select
          id="report-range"
          value={range}
          onChange={(event) => changeRange(event.target.value)}
          className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="custom">Custom date range</option>
        </select>
        {range === "custom" && (
          <div className="flex flex-wrap gap-3">
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              From (UTC)
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Through (UTC)
              <input
                type="date"
                value={customThrough}
                onChange={(event) => setCustomThrough(event.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
          </div>
        )}
      </div>

      {analyticsError && (
        <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center">
          <div className="flex items-start gap-2">
            <AlertTriangle aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            <p>{analyticsError}</p>
          </div>
          <button
            type="button"
            onClick={refreshReports}
            className="shrink-0 rounded px-2 py-1 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:ml-auto"
          >
            Try again
          </button>
        </div>
      )}

      <motion.section
        variants={itemVariants}
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Statistics for the selected date range"
        aria-busy={analyticsLoading}
      >
        {summaryCards.map(({ label, value, description, icon: Icon, color }) => (
          <article key={label} className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon aria-hidden="true" size={20} />
            </span>
            <p className="mt-4 text-sm font-medium text-slate-600">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-950" aria-live="polite">
              {analyticsLoading ? "…" : analyticsError ? "—" : value}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
          </article>
        ))}
      </motion.section>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <motion.section
          variants={itemVariants}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="activity-title"
          aria-busy={analyticsLoading}
        >
          <div className="mb-4">
            <h2 id="activity-title" className="text-lg font-semibold text-slate-900">Daily submission activity</h2>
            <p className="mt-1 text-sm text-slate-600">
              Actual saved URL submissions by UTC calendar day.
            </p>
          </div>
          {analyticsLoading ? (
            <div role="status" className="py-12 text-center text-sm text-slate-600">
              <RefreshCw aria-hidden="true" size={22} className="mx-auto animate-spin text-blue-600 motion-reduce:animate-none" />
              <p className="mt-3">Loading database activity…</p>
            </div>
          ) : analyticsError ? (
            <p className="py-12 text-center text-sm text-slate-600">Activity chart unavailable until analytics load.</p>
          ) : (
            <ActivityChart analytics={analytics} dateFilter={dateFilter} />
          )}
        </motion.section>

        <motion.section
          variants={itemVariants}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="status-title"
          aria-busy={analyticsLoading}
        >
          <div className="mb-5">
            <h2 id="status-title" className="text-lg font-semibold text-slate-900">Processing status distribution</h2>
            <p className="mt-1 text-sm text-slate-600">
              Backend processing categories, not phishing classifications.
            </p>
          </div>
          {analyticsLoading ? (
            <p role="status" className="py-10 text-center text-sm text-slate-600">Loading status totals…</p>
          ) : analyticsError ? (
            <p className="py-10 text-center text-sm text-slate-600">Status distribution unavailable until analytics load.</p>
          ) : (
            <StatusDistribution analytics={analytics} />
          )}
        </motion.section>
      </div>

      <motion.section
        variants={itemVariants}
        className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-labelledby="records-title"
        aria-busy={recordsLoading}
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 id="records-title" className="text-lg font-semibold text-slate-900">Latest saved record details</h2>
            <p className="mt-1 text-sm text-slate-600">
              {filteredRecords.length} matching records shown from the latest {REPORT_LIMIT} fetched.
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            Selected range: {dateFilter.label}
          </span>
        </div>

        <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950">
          <Info aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-blue-700" />
          <p>
            Aggregate cards and charts cover the entire database for this range.
            The record-detail list is limited to the latest {REPORT_LIMIT} rows;
            the CSV includes those matching details plus complete backend aggregates.
          </p>
        </div>

        {recordsError && (
          <div role="alert" className="m-4 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle aria-hidden="true" size={17} />
            <span>{recordsError}</span>
            <button type="button" onClick={fetchRecords} className="font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
              Retry
            </button>
          </div>
        )}

        {recordsLoading ? (
          <div role="status" className="px-6 py-12 text-center text-sm text-slate-600">
            <RefreshCw aria-hidden="true" size={22} className="mx-auto animate-spin text-blue-600 motion-reduce:animate-none" />
            <p className="mt-3">Loading recent record details…</p>
          </div>
        ) : !recordsError && filteredRecords.length ? (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {filteredRecords.map((record) => (
                <article key={record.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">#{record.id}</span>
                    <span className="text-right text-xs text-slate-600">{formatDateTime(record.created_at)}</span>
                  </div>
                  <p className="break-all text-sm font-medium text-slate-900">{record.url}</p>
                  <StatusBadge status={record.status} />
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[680px] text-left text-sm">
                <caption className="sr-only">Latest matching saved URL submission records</caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">ID</th>
                    <th scope="col" className="px-4 py-3">Submitted URL</th>
                    <th scope="col" className="px-4 py-3">Backend status</th>
                    <th scope="col" className="px-4 py-3">Created at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{record.id}</td>
                      <td className="max-w-[360px] break-all px-4 py-3 text-slate-900">{record.url}</td>
                      <td className="px-4 py-3"><StatusBadge status={record.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(record.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : !recordsError && (
          <div className="px-6 py-12 text-center">
            <FileSpreadsheet aria-hidden="true" size={24} className="mx-auto text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">
              {analytics?.total_scans
                ? "No matching records in the latest loaded rows"
                : "No submissions in this date range"}
            </h3>
            <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
              {analytics?.total_scans
                ? "The database aggregates above include matching older records; only the latest 100 record details are available here."
                : "No saved URL submissions were returned for this UTC date range."}
            </p>
          </div>
        )}
      </motion.section>

      <motion.p variants={itemVariants} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
        <ShieldAlert aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-amber-700" />
        These analytics represent URL submissions and backend processing statuses.
        Phishing classification statistics will become available only after a genuine
        detection engine is integrated. Completed status is not a safe or malicious verdict.
      </motion.p>
    </motion.main>
  );
}

function StatusBadge({ status }) {
  const category = getScanStatusCategory(status);
  const style = {
    pending: "bg-amber-50 text-amber-800 ring-amber-200",
    completed: "bg-cyan-50 text-cyan-800 ring-cyan-200",
    failed: "bg-red-50 text-red-800 ring-red-200",
    unknown: "bg-slate-100 text-slate-700 ring-slate-200",
  }[category];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>
      {category === "unknown"
        ? `Unknown: ${getScanStatusLabel(status)}`
        : getScanStatusLabel(status)}
    </span>
  );
}

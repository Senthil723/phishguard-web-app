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
  XCircle,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScanAnalytics, getAllScans } from "../services/api";
import {
  getScanStatusCategory,
  getScanStatusLabel,
} from "../utils/scanStatus";

const REPORT_PAGE_SIZE = 20;
const STATUS_CATEGORIES = [
  {
    key: "pending",
    label: "Pending",
    icon: Clock3,
    fill: "#f59e0b",
    text: "text-amber-800",
  },
  {
    key: "completed",
    label: "Completed",
    icon: CheckCircle2,
    fill: "#0891b2",
    text: "text-cyan-800",
  },
  {
    key: "failed",
    label: "Failed",
    icon: XCircle,
    fill: "#dc2626",
    text: "text-red-800",
  },
  {
    key: "unknown",
    label: "Unknown",
    icon: HelpCircle,
    fill: "#64748b",
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
    ["Record details", "All matching user records"],
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
    ["Matching record details"],
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

function dayNumberToDate(value) {
  return new Date(value * 86400000).toISOString().slice(0, 10);
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

  const startDay = dateToDayNumber(dateFilter.fromDate || buckets[0].date);
  const endDay = dateToDayNumber(dateFilter.throughDate || buckets[buckets.length - 1].date);
  const daySpan = endDay - startDay + 1;
  const intervalDays = Math.max(1, Math.ceil(daySpan / 6));
  const intervals = Array.from({ length: Math.ceil(daySpan / intervalDays) }, (_, index) => {
    const fromDay = startDay + index * intervalDays;
    const throughDay = Math.min(endDay, fromDay + intervalDays - 1);
    const count = buckets
      .filter(({ date }) => {
        const day = dateToDayNumber(date);
        return day >= fromDay && day <= throughDay;
      })
      .reduce((sum, bucket) => sum + bucket.count, 0);
    return {
      from: dayNumberToDate(fromDay),
      through: dayNumberToDate(throughDay),
      count,
    };
  }).reverse();
  const width = 560;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 50, left: 44 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maxCount = Math.max(1, ...intervals.map(({ count }) => count));
  const slotWidth = chartWidth / intervals.length;
  const barWidth = Math.min(24, slotWidth * 0.72);
  return (
    <div className="rounded-xl border border-slate-100 bg-white">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Submission activity for ${dateFilter.label}: ${analytics.total_scans} total submissions, grouped into ${intervalDays}-day intervals, newest first.`}
        className="h-auto w-full"
      >
        {[0, 0.5, 1].map((fraction) => {
          const y = padding.top + chartHeight * (1 - fraction);
          return (
            <g key={fraction}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[11px]">
                {Math.round(maxCount * fraction)}
              </text>
            </g>
          );
        })}
        {intervals.map(({ from, through, count }, index) => {
          const x = padding.left + index * slotWidth + (slotWidth - barWidth) / 2;
          const barHeight = (count / maxCount) * chartHeight;
          return (
            <g key={from}>
              <rect x={x} y={padding.top + chartHeight - barHeight} width={barWidth} height={barHeight} rx="3" fill="#2563eb">
                <title>{`${from}${from === through ? "" : ` through ${through}`}: ${count} submissions`}</title>
              </rect>
              <text x={x + barWidth / 2} y={height - 16} textAnchor="middle" className="fill-slate-600 text-[11px]">
                {through.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="px-4 pb-3 text-xs text-slate-600">
        {intervalDays === 1 ? "Each bar shows one UTC day" : `Each bar shows up to ${intervalDays} UTC days`} in the selected range, newest first. Empty intervals have no submissions.
      </p>
    </div>
  );
}

function StatusDistribution({ analytics }) {
  const total = analytics?.total_scans || 0;
  const statuses = STATUS_CATEGORIES.map((category) => ({
    ...category,
    count: analytics?.[`${category.key === "completed" ? "analyzed" : category.key}_scans`] || 0,
  }));
  const { slices } = statuses
    .filter(({ count }) => count > 0)
    .reduce(({ slices: previousSlices, endCount }, status) => {
      const startAngle = (endCount / total) * Math.PI * 2 - Math.PI / 2;
      const nextCount = endCount + status.count;
      const endAngle = (nextCount / total) * Math.PI * 2 - Math.PI / 2;
      const point = (angle) => [120 + 100 * Math.cos(angle), 120 + 100 * Math.sin(angle)];
      const [startX, startY] = point(startAngle);
      const [endX, endY] = point(endAngle);
      const path = `M 120 120 L ${startX} ${startY} A 100 100 0 ${endAngle - startAngle > Math.PI ? 1 : 0} 1 ${endX} ${endY} Z`;
      return {
        endCount: nextCount,
        slices: [...previousSlices, { ...status, path }],
      };
    }, { slices: [], endCount: 0 });

  return (
    <div className="space-y-4">
      {total ? (
        <svg viewBox="0 0 240 240" role="img" aria-label={`Pie chart of ${total} processing statuses.`} className="mx-auto h-auto w-full max-w-[240px]">
          {slices.length === 1 ? (
            <circle cx="120" cy="120" r="100" fill={slices[0].fill}>
              <title>{`${slices[0].label}: ${slices[0].count} (100%)`}</title>
            </circle>
          ) : (
            slices.map(({ key, label, count, fill, path }) => (
              <path key={key} d={path} fill={fill} stroke="white" strokeWidth="2">
                <title>{`${label}: ${count} (${((count / total) * 100).toFixed(1)}%)`}</title>
              </path>
            ))
          )}
        </svg>
      ) : (
        <p className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-600">No processing statuses in this range.</p>
      )}
      <ul aria-label="Processing status counts" className="space-y-2">
        {statuses.map(({ key, label, icon: Icon, fill, text, count }) => (
          <li key={key} className="flex items-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: fill }} aria-hidden="true" />
            <span className={`inline-flex items-center gap-1.5 font-medium ${text}`}>
              <Icon aria-hidden="true" size={15} />{label}
            </span>
            <span className="ml-auto text-slate-700">{count} ({total ? ((count / total) * 100).toFixed(1) : "0.0"}%)</span>
          </li>
        ))}
      </ul>

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
  const [recordsPage, setRecordsPage] = useState(1);
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
      const response = await getAllScans();
      if (!Array.isArray(response) || !response.every(isValidRecord)) {
        throw new Error("The backend returned an unexpected scan list.");
      }
      setRecords(response);
    } catch (requestError) {
      console.error("Failed to load report records:", requestError);
      setRecordsError("Scan record details are unavailable. Try refreshing.");
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
  const recordsPageCount = Math.max(1, Math.ceil(filteredRecords.length / REPORT_PAGE_SIZE));
  const currentRecordsPage = Math.min(recordsPage, recordsPageCount);
  const visibleRecords = filteredRecords.slice(
    (currentRecordsPage - 1) * REPORT_PAGE_SIZE,
    currentRecordsPage * REPORT_PAGE_SIZE
  );

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
    setRecordsPage(1);
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
            Your URL submissions and backend processing statistics for the selected UTC date range.
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
                onChange={(event) => { setCustomFrom(event.target.value); setRecordsPage(1); }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium text-slate-600">
              Through (UTC)
              <input
                type="date"
                value={customThrough}
                onChange={(event) => { setCustomThrough(event.target.value); setRecordsPage(1); }}
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

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <motion.section
          variants={itemVariants}
          className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
          aria-labelledby="activity-title"
          aria-busy={analyticsLoading}
        >
          <div className="mb-4">
            <h2 id="activity-title" className="text-lg font-semibold text-slate-900">Submission activity by date range</h2>
            <p className="mt-1 text-sm text-slate-600">
              Saved URL submissions grouped across the selected UTC date range.
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
            <h2 id="records-title" className="text-lg font-semibold text-slate-900">Saved record details</h2>
            <p className="mt-1 text-sm text-slate-600">
              {filteredRecords.length} matching records. Showing page {currentRecordsPage} of {recordsPageCount}.
            </p>
          </div>
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            Selected range: {dateFilter.label}
          </span>
        </div>

        <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950">
          <Info aria-hidden="true" size={19} className="mt-0.5 shrink-0 text-blue-700" />
          <p>
            The charts and CSV cover all of your matching records for this range.
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
            <p className="mt-3">Loading record details…</p>
          </div>
        ) : !recordsError && filteredRecords.length ? (
          <>
            <div className="divide-y divide-slate-100 md:hidden">
              {visibleRecords.map((record) => (
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
                <caption className="sr-only">Matching saved URL submission records</caption>
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">ID</th>
                    <th scope="col" className="px-4 py-3">Submitted URL</th>
                    <th scope="col" className="px-4 py-3">Backend status</th>
                    <th scope="col" className="px-4 py-3">Created at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleRecords.map((record) => (
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
            {recordsPageCount > 1 && (
              <nav aria-label="Report record pages" className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
                <button type="button" onClick={() => setRecordsPage(currentRecordsPage - 1)} disabled={currentRecordsPage === 1} className="rounded-lg px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400">Previous</button>
                <span className="text-slate-600">Page {currentRecordsPage} of {recordsPageCount}</span>
                <button type="button" onClick={() => setRecordsPage(currentRecordsPage + 1)} disabled={currentRecordsPage === recordsPageCount} className="rounded-lg px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400">Next</button>
              </nav>
            )}
          </>
        ) : !recordsError && (
          <div className="px-6 py-12 text-center">
            <FileSpreadsheet aria-hidden="true" size={24} className="mx-auto text-slate-400" />
            <h3 className="mt-3 font-semibold text-slate-900">
              {analytics?.total_scans
                ? "No matching records in this range"
                : "No submissions in this date range"}
            </h3>
            <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-slate-600">
              {analytics?.total_scans
                ? "Try a wider date range to see matching records."
                : "No saved URL submissions were returned for this UTC date range."}
            </p>
          </div>
        )}
      </motion.section>

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

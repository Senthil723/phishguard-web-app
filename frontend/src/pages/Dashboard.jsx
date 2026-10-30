
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  Clock3,
  Link2,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
  Globe,
  History,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { fadeUp, staggerContainer } from "../animations";
import { getScans, getScanStats } from "../services/api";
import {
  getScanStatusLabel,
  getScanStatusCategory,
} from "../utils/scanStatus";

export default function Dashboard() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Fetch database-wide statistics and recent scan records together.
      const [statsData, records] = await Promise.all([
        getScanStats(),
        getScans(20),
      ]);

      if (
        !statsData ||
        typeof statsData.total_scans !== "number" ||
        typeof statsData.analyzed_scans !== "number" ||
        typeof statsData.pending_scans !== "number" ||
        typeof statsData.failed_scans !== "number" ||
        typeof statsData.unknown_scans !== "number"
      ) {
        throw new Error("Unexpected response from the statistics endpoint.");
      }

      if (!Array.isArray(records)) {
        throw new Error("Unexpected response from the scans endpoint.");
      }

      setStats(statsData);
      setHistory(records);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(
        "Unable to load dashboard data. Check that the backend is running and both API endpoints are available."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Dashboard summary cards.
  const cards = [
    {
      label: "Total URLs Submitted",
      value: stats?.total_scans ?? 0,
      description: "All records in the database",
      icon: Link2,
      iconStyle: "bg-blue-50 text-blue-700",
    },
    {
      label: "Scans Completed",
      value: stats?.analyzed_scans ?? 0,
      description: "Marked as analyzed",
      icon: Activity,
      iconStyle: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Pending Analysis",
      value: stats?.pending_scans ?? 0,
      description: "Awaiting analysis",
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-700",
    },
    {
      label: "Failed Analyses",
      value: stats?.failed_scans ?? 0,
      description: "Analysis attempts marked failed",
      icon: AlertTriangle,
      iconStyle: "bg-red-50 text-red-700",
    },
    {
      label: "Detection Engine",
      value: "Not Connected",
      description: "ML model unavailable",
      icon: ShieldAlert,
      iconStyle: "bg-violet-50 text-violet-700",
    },
    {
      label: "Unknown Status",
      value: stats?.unknown_scans ?? 0,
      description: "Unrecognized scan statuses",
      icon: AlertTriangle,
      iconStyle: "bg-slate-100 text-slate-600",
    },
  ];

  // Get the correct visual style for each scan status.
  function getStatusStyle(status) {
    const category = getScanStatusCategory(status);

    const styles = {
      pending: "bg-amber-50 text-amber-700",
      completed: "bg-cyan-50 text-cyan-700",
      failed: "bg-red-50 text-red-700",
      unknown: "bg-slate-100 text-slate-600",
    };

    return styles[category] || styles.unknown;
  }

  // Display the latest five records.
  const recentScans = useMemo(() => {
    return [...history]
      .sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [history]);

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleString();
  };

  // Open the Results page for the selected database record.
  function handleViewDetails(scan) {
    navigate(`/results/${scan.id}`, {
      state: {
        url: scan.url,
        status: scan.status,
      },
    });
  }

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-7xl"
      aria-labelledby="dashboard-title"
    >
      {/* Dashboard heading and refresh action */}
      <motion.div
        variants={fadeUp}
        className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div>
          <h1
            id="dashboard-title"
            className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
          >
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Overview of your submitted URL investigations.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh statistics
        </button>
      </motion.div>

      {/* Dashboard error message */}
      {error && (
        <motion.div
          variants={fadeUp}
          role="alert"
          className="mb-5 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="shrink-0 self-start font-semibold underline sm:ml-auto"
          >
            Try again
          </button>
        </motion.div>
      )}

      {/* Summary cards */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        aria-label="PhishGuard summary"
        aria-busy={loading}
      >
        {cards.map(
          ({ label, value, description, icon: Icon, iconStyle }) => {
            const shownValue =
              label === "Detection Engine"
                ? value
                : loading
                  ? "…"
                  : error
                    ? "—"
                    : value;

            return (
              <article
                key={label}
                className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="max-w-[calc(100%-3rem)] text-sm font-medium leading-5 text-slate-500">
                    {label}
                  </p>

                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}
                  >
                    <Icon size={19} strokeWidth={1.9} />
                  </span>
                </div>

                <p
                  className={`mt-4 break-words font-bold tracking-tight text-slate-950 ${
                    typeof shownValue === "number" ? "text-3xl" : "text-lg"
                  }`}
                >
                  {shownValue}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {description}
                </p>
              </article>
            );
          }
        )}
      </motion.div>

      {/* Recent Scans */}
      <motion.section
        variants={fadeUp}
        className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.025]"
        aria-labelledby="recent-scans-title"
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="recent-scans-title"
              className="text-lg font-bold text-slate-900"
            >
              Recent Scans
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Your latest submitted URLs from the backend database.
            </p>
          </div>

          <Link
            to="/history"
            className="inline-flex items-center gap-2 self-start rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            View all history <ArrowRight size={16} />
          </Link>
        </div>

        {/* Animated loading skeletons */}
        {loading ? (
          <div
            className="divide-y divide-slate-100"
            role="status"
            aria-live="polite"
            aria-label="Loading recent scans"
          >
            {[1, 2, 3].map((item) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  delay: (item - 1) * 0.08,
                }}
                className="flex items-center gap-3 px-5 py-4"
              >
                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-blue-100" />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-3 w-3/4 max-w-64 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-32 max-w-full animate-pulse rounded bg-slate-100" />
                </div>

                <div className="hidden h-7 w-28 animate-pulse rounded-full bg-amber-100 sm:block" />
                <div className="hidden h-9 w-28 animate-pulse rounded-lg bg-slate-100 sm:block" />
              </motion.div>
            ))}

            <p className="px-5 py-3 text-center text-xs text-slate-500">
              Loading recent scans...
            </p>
          </div>
        ) : error ? (
          /* Error state */
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Recent scans could not be loaded. Use Refresh statistics to try
            again.
          </div>
        ) : recentScans.length > 0 ? (
          /* Scan records */
          <div className="divide-y divide-slate-100">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="flex flex-col gap-3 px-5 py-4 transition hover:bg-blue-50/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Globe size={18} />
                  </span>

                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold text-slate-800"
                      title={scan.url}
                    >
                      {scan.url}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(scan.created_at)}
                    </p>
                  </div>
                </div>

                {/* Status and View Details action */}
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span
                    className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyle(
                      scan.status
                    )}`}
                  >
                    <Clock3 size={13} />
                    {getScanStatusLabel(scan.status)}
                  </span>

                  <motion.button
                    type="button"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleViewDetails(scan)}
                    aria-label={`View details for ${scan.url}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <Eye size={16} />
                    View Details
                    <ArrowRight size={15} />
                  </motion.button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="px-5 py-12 text-center">
            <History size={24} className="mx-auto text-slate-400" />

            <h3 className="mt-3 font-semibold text-slate-900">
              No scans yet
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Submit a URL through URL Scanner to see it here.
            </p>
          </div>
        )}

        {/* Security disclaimer */}
        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 text-xs leading-5 text-slate-500">
          <ShieldAlert
            size={15}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          These are saved submissions, not phishing verdicts. A real detection
          model has not classified these URLs.
        </div>
      </motion.section>
    </motion.section>
  );
}

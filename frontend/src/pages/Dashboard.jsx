
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  Clock3,
  Link2,
  ShieldAlert,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import { getScans } from "../services/api";

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const records = await getScans(20);

      if (!Array.isArray(records)) {
        throw new Error("Unexpected response from the backend.");
      }

      setHistory(records);
    } catch (err) {
      console.error("Failed to load dashboard scans:", err);
      setError(
        "Unable to load scan statistics. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const counts = useMemo(() => {
    const completed = history.filter((item) => {
      const status = String(item.status || "").toLowerCase();

      return (
        status === "completed" ||
        status === "analyzed" ||
        status === "analysed"
      );
    }).length;

    return {
      submitted: history.length,
      completed,
      pending: history.length - completed,
    };
  }, [history]);

  const displayValue = (value) => {
    if (loading) return "…";
    if (error) return "—";
    return value;
  };

  const cards = [
    {
      label: "Total URLs Submitted",
      value: counts.submitted,
      description: "Saved in the backend database",
      icon: Link2,
      iconStyle: "bg-blue-50 text-blue-700",
    },
    {
      label: "Scans Completed",
      value: counts.completed,
      description: "Marked as analyzed",
      icon: Activity,
      iconStyle: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Pending Analysis",
      value: counts.pending,
      description: "Awaiting real analysis",
      icon: Clock3,
      iconStyle: "bg-amber-50 text-amber-700",
    },
    {
      label: "Detection Engine",
      value: "Not Connected",
      description: "ML model unavailable",
      icon: ShieldAlert,
      iconStyle: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-7xl"
      aria-labelledby="dashboard-title"
    >
      <motion.div
        variants={fadeUp}
        className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <h1
          id="dashboard-title"
          className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Dashboard
        </h1>

        <button
          type="button"
          onClick={loadHistory}
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
            onClick={loadHistory}
            className="shrink-0 self-start font-semibold underline sm:ml-auto"
          >
            Try again
          </button>
        </motion.div>
      )}

      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="PhishGuard summary"
        aria-busy={loading}
      >
        {cards.map(
          ({ label, value, description, icon: Icon, iconStyle }) => {
            const shownValue =
              label === "Detection Engine"
                ? value
                : displayValue(value);

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
                    typeof shownValue === "number"
                      ? "text-3xl"
                      : "text-lg"
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

      <motion.p
        variants={fadeUp}
        className="mt-5 text-xs leading-5 text-slate-500"
      >
        Statistics are based on the latest records returned by the backend.
        Saved URLs have not been classified by a phishing detection model.
      </motion.p>
    </motion.section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Activity, Clock3, Link2, ShieldAlert } from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";

function readHistory() {
  try {
    const records = JSON.parse(sessionStorage.getItem("phishguardHistory") || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

export default function Dashboard() {
  const [history, setHistory] = useState(readHistory);

  useEffect(() => {
    const refresh = () => setHistory(readHistory());
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("phishguard-history-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("phishguard-history-updated", refresh);
    };
  }, []);

  const counts = useMemo(() => {
    const completed = history.filter((item) => {
      const status = String(item.status || "").toLowerCase();
      const type = String(item.type || "").toLowerCase();
      return type === "completed" ||
        (status.includes("completed") && !status.includes("not completed")) ||
        (status.includes("analyzed") && !status.includes("not analyzed"));
    }).length;
    return {
      submitted: history.length,
      completed,
      pending: Math.max(0, history.length - completed),
    };
  }, [history]);

  const cards = [
    {
      label: "Total URLs Submitted",
      value: counts.submitted,
      description: "User-submitted URLs",
      icon: Link2,
      iconStyle: "bg-blue-50 text-blue-700",
    },
    {
      label: "Scans Completed",
      value: counts.completed,
      description: "Actually analyzed",
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
      <motion.h1
        variants={fadeUp}
        id="dashboard-title"
        className="mb-6 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
      >
        Dashboard
      </motion.h1>

      <motion.div
        variants={fadeUp}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="PhishGuard summary"
      >
        {cards.map(({ label, value, description, icon: Icon, iconStyle }) => (
          <article
            key={label}
            className="min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.025] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="max-w-[calc(100%-3rem)] text-sm font-medium leading-5 text-slate-500">
                {label}
              </p>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyle}`}>
                <Icon size={19} strokeWidth={1.9} />
              </span>
            </div>
            <p className={`mt-4 break-words font-bold tracking-tight text-slate-950 ${typeof value === "number" ? "text-3xl" : "text-lg"}`}>
              {value}
            </p>
            <p className="mt-1 text-xs text-slate-400">{description}</p>
          </article>
        ))}
      </motion.div>
    </motion.section>
  );
}

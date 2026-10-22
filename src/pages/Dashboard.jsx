import { useState } from "react";
import { motion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FileSearch,
  Globe,
  History,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";

const initialScans = [
  {
    url: "https://example.com",
    status: "Demo: Safe",
    time: "10:42 AM",
    type: "safe",
  },
  {
    url: "http://verify-account.example",
    status: "Demo: Suspicious",
    time: "10:18 AM",
    type: "warning",
  },
  {
    url: "https://docs.example.org",
    status: "Demo: Safe",
    time: "09:56 AM",
    type: "safe",
  },
  {
    url: "http://login-check.example",
    status: "Demo: Suspicious",
    time: "09:31 AM",
    type: "warning",
  },
];

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "URL Scanner", icon: Search },
  { label: "Scan History", icon: History },
  { label: "About Project", icon: FileSearch },
];

// Animation settings for the stat cards (variants).
// "hidden" is the starting look, "show" is the final look.
// The container does not move itself; it only tells its children
// to start one after another (staggerChildren).
const cardContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function Dashboard() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [url, setUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

const [scans, setScans] = useState(() => {
  try {
    const savedHistory = JSON.parse(
      sessionStorage.getItem("phishguardHistory") || "[]"
    );

    if (Array.isArray(savedHistory) && savedHistory.length > 0) {
      const savedUrls = new Set(
        savedHistory.map((scan) => scan.url)
      );

      const remainingSamples = initialScans.filter(
        (scan) => !savedUrls.has(scan.url)
      );

      return [
        ...savedHistory,
        ...remainingSamples,
      ].slice(0, 20);
    }
  } catch {
    // Use sample entries if saved history is unavailable.
  }

  return initialScans;
});


  function handleScan(event) {
    event.preventDefault();

    const enteredUrl = url.trim();

    if (!enteredUrl) {
      setNotice("Please enter a URL to continue.");
      return;
    }

    let parsedUrl;

    try {
      parsedUrl = new URL(
        /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(enteredUrl)
          ? enteredUrl
          : `https://${enteredUrl}`
      );
    } catch {
      setNotice("Please enter a valid web address.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setNotice("Please enter an HTTP or HTTPS web address.");
      return;
    }

    const normalizedUrl = parsedUrl.href;

    setScans((previous) => [
      {
        url: normalizedUrl,
        status: "Demo: Not analyzed",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "pending",
      },
      ...previous,
    ].slice(0, 5));

    setNotice(
      "Demo only: this URL was added to the sample list. No phishing analysis was performed."
    );
    setUrl("");
    setActivePage("Scan History");
  }


function selectPage(page) {
  setMobileMenuOpen(false);
  setNotice("");

  if (page === "URL Scanner") {
    window.location.assign("/scanner");
    return;
  }

  if (page === "Scan History") {
    try {
      const savedHistory = JSON.parse(
        sessionStorage.getItem("phishguardHistory") || "[]"
      );

      if (Array.isArray(savedHistory)) {
        const savedUrls = new Set(
          savedHistory.map((scan) => scan.url)
        );

        const remainingSamples = initialScans.filter(
          (scan) => !savedUrls.has(scan.url)
        );

        setScans(
          [...savedHistory, ...remainingSamples].slice(0, 20)
        );
      }
    } catch (error) {
      console.error("Unable to load scan history:", error);
    }
  }

  setActivePage(page);
}



  function renderSidebar() {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-5 py-7">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <ShieldCheck size={25} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Phish<span className="text-cyan-400">Guard</span>
            </h1>
            <p className="mt-1 text-[10px] tracking-[0.18em] text-slate-500">
              WEB SECURITY
            </p>
          </div>
        </div>

        <div className="px-4">
          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => selectPage(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${
                  activePage === label
                    ? "border border-blue-500/20 bg-blue-500/15 font-medium text-blue-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={19} />
                <span>{label}</span>
                {activePage === label && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="mb-4 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <LockKeyhole size={19} />
            </div>
            <p className="text-sm font-semibold text-slate-200">
              Stay alert online
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Check unfamiliar links carefully before opening them.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setNotice(
                "This is a dashboard demo. Real sign-out will be available when authentication is connected."
              )
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut size={18} />
            Demo sign out
          </button>

          <p className="px-3 pb-2 pt-3 text-[10px] text-slate-600">
            PhishGuard prototype · v1.0
          </p>
        </div>
      </div>
    );
  }


  const userScans = scans.filter(
    (scan) =>
      scan.type === "pending" ||
      scan.type === "user" ||
      scan.source === "user"
  );

  const stats = [
    {
      label: "Total user scans",
      value: String(userScans.length),
      detail: "User-submitted URL entries",
      icon: Globe,
      color: "blue",
      trend: null,
    },
    {
      label: "Awaiting analysis",
      value: String(
        userScans.filter(
          (scan) => scan.status === "Demo: Not analyzed"
        ).length
      ),
      detail: "Detection not connected",
      icon: Activity,
      color: "amber",
      trend: null,
    },
    {
      label: "Confirmed safe",
      value: "—",
      detail: "ML detection not connected",
      icon: ShieldCheck,
      color: "emerald",
      trend: null,
    },
    {
      label: "Confirmed threats",
      value: "—",
      detail: "ML detection not connected",
      icon: ShieldAlert,
      color: "purple",
      trend: null,
    },
  ];


  const colorStyles = {
    blue: "bg-blue-500/10 text-blue-300",
    emerald: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
    purple: "bg-purple-500/10 text-purple-300",
  };

  return (
    <div className="min-h-screen bg-[#080f1e] text-slate-100">
      {/* MOBILE NAVIGATION */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#0b1426]">
            <div className="flex items-center justify-between border-b border-white/10">
              {renderSidebar()}
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-[#0b1426] lg:block">
          {renderSidebar()}
        </aside>

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1">
          {/* TOP HEADER */}
          <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/[0.07] bg-[#080f1e]/95 px-4 py-4 backdrop-blur-xl sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-xl border border-white/10 p-2 text-slate-300 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Workspace / {activePage}
                </p>
                <h2 className="mt-1 truncate text-lg font-semibold sm:text-xl">
                  {activePage === "Dashboard"
                    ? "Security Dashboard"
                    : activePage}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <span className="hidden rounded-full border border-amber-400/20 bg-amber-400/5 px-3 py-1.5 text-[11px] text-amber-300 sm:inline-flex">
                <span className="mr-2 mt-1 h-1.5 w-1.5 rounded-full bg-amber-300" />
                Demo environment
              </span>

              <button
                type="button"
                aria-label="Notifications"
                onClick={() =>
                  setNotice(
                    "You are viewing a prototype. No live security alerts are connected."
                  )
                }
                className="relative rounded-xl border border-white/10 p-2.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-cyan-400" />
              </button>

              <div className="flex items-center gap-2 border-l border-white/10 pl-3 sm:pl-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-sm font-bold text-white">
                  PG
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium">Demo User</p>
                  <p className="text-[11px] text-slate-500">Guest session</p>
                </div>
                <ChevronDown size={15} className="hidden text-slate-500 sm:block" />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] space-y-7 p-4 sm:p-7 lg:p-10">
            {/* PAGE INTRO */}
            <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-cyan-300">
                  <Activity size={15} />
                  SECURITY OVERVIEW
                </div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Welcome to PhishGuard
                </h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                  Explore your URL security workspace and review the sample
                  activity below.
                </p>
              </div>

              <button
                type="button"
                onClick={() => selectPage("Scan History")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/[0.07]"
              >
                <History size={17} />
                View scan history
              </button>
            </section>

            {/* DEMO DISCLAIMER */}
            <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-amber-300"
              />
              <div>
                <p className="text-sm font-semibold text-amber-200">
                  Prototype data — not live detection
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  User scan counts reflect submitted URLs in this browser session.
                  No machine-learning model or security service is connected,
                  so phishing and safety classifications are unavailable.
                  Example records may still appear in the activity table.
                </p>
              </div>
            </div>

            {/* STAT CARDS */}
            {activePage !== "About Project" && (
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold">Overview</h3>
                  <span className="text-xs text-slate-500">
                    User scan counts
                  </span>
                </div>

                <motion.div
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
                  variants={cardContainer}
                  initial="hidden"
                  animate="show"
                >
                  {stats.map((stat) => {
                    const Icon = stat.icon;
                    const Trend = stat.trend;

                    return (
                      <motion.article
                        key={stat.label}
                        variants={cardItem}
                        className="rounded-2xl border border-white/[0.08] bg-[#0d182b] p-5 transition-colors hover:border-white/15"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorStyles[stat.color]}`}
                          >
                            <Icon size={22} />
                          </div>
                          {Trend && (
                            <Trend size={17} className="text-slate-500" />
                          )}
                        </div>

                        <p className="mt-5 text-sm text-slate-400">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-3xl font-bold tracking-tight">
                          {stat.value}
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          {stat.detail}
                        </p>
                      </motion.article>
                    );
                  })}
                </motion.div>
              </section>
            )}

            {/* DASHBOARD PAGE */}
            {activePage === "Dashboard" && (
              <>
                {/* URL SCANNER */}
                <section className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-600/15 via-[#101e35] to-cyan-500/[0.07] p-5 sm:p-8">
                  <div className="pointer-events-none absolute -right-12 -top-20 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

                  <div className="relative">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-300">
                      <Search size={25} />
                    </div>

                    <h3 className="text-xl font-bold sm:text-2xl">
                      Check a website URL
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Enter a web address to try the scanner interface. This
                      prototype checks the URL format only; it does not detect
                      phishing.
                    </p>

                    <form
                      onSubmit={handleScan}
                      className="mt-6 flex flex-col gap-3 sm:flex-row"
                    >
                      <div className="relative min-w-0 flex-1">
                        <Globe
                          size={19}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                        <input
                          type="text"
                          inputMode="url"
                          autoComplete="url"
                          value={url}
                          onChange={(event) => {
                            setUrl(event.target.value);
                            setNotice("");
                          }}
                          placeholder="https://example.com"
                          aria-label="Website URL"
                          className="w-full rounded-xl border border-white/10 bg-[#080f1e]/80 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
                        />
                      </div>

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                      >
                        Try demo
                        <ArrowRight size={17} />
                      </button>
                    </form>

                    {notice && (
                      <p
                        role="status"
                        className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] p-3 text-xs leading-5 text-cyan-200"
                      >
                        {notice}
                      </p>
                    )}
                  </div>
                </section>

                {/* RECENT ACTIVITY */}
                <RecentScans
                  scans={scans}
                  onViewAll={() => selectPage("Scan History")}
                />
              </>
            )}

            {/* SCANNER PAGE */}
            {activePage === "URL Scanner" && (
              <section className="rounded-2xl border border-white/[0.08] bg-[#0d182b] p-5 sm:p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300">
                  <Search size={24} />
                </div>
                <h3 className="text-xl font-bold">URL Scanner</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Try entering a URL below. This demo validates the address
                  format and adds it to the activity list. It does not open,
                  fetch, or classify the website.
                </p>
                <form
                  onSubmit={handleScan}
                  className="mt-6 flex flex-col gap-3 sm:flex-row"
                >
                  <input
                    type="text"
                    inputMode="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setNotice("");
                    }}
                    placeholder="Enter a website URL"
                    aria-label="Website URL"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-cyan-400"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold hover:bg-blue-500"
                  >
                    Try demo
                  </button>
                </form>
                {notice && (
                  <p role="status" className="mt-4 text-sm text-cyan-200">
                    {notice}
                  </p>
                )}
              </section>
            )}

            {/* HISTORY PAGE */}
            {activePage === "Scan History" && (
              <div className="space-y-6">
                <section className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-5">
                  <h3 className="text-lg font-semibold text-cyan-300">
                    Your Scan History
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    URLs you submitted are listed separately from example records.
                    Their statuses are demo-only; no real phishing detection
                    has been performed.
                  </p>
                </section>

                <RecentScans
                  scans={scans.filter(
                    (scan) =>
                      scan.type === "pending" ||
                      scan.type === "user" ||
                      scan.source === "user"
                  )}
                  onViewAll={null}
                />

                <RecentScans
                  scans={scans.filter(
                    (scan) =>
                      scan.type !== "pending" &&
                      scan.type !== "user" &&
                      scan.source !== "user"
                  )}
                  onViewAll={null}
                />
              </div>
          )}


            {/* ABOUT PAGE */}
            {activePage === "About Project" && (
              <section className="rounded-2xl border border-white/[0.08] bg-[#0d182b] p-6 sm:p-8">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <Shield size={25} />
                </div>
                <h3 className="text-2xl font-bold">
                  About PhishGuard
                </h3>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
                  PhishGuard is a web phishing detection project designed to
                  help users understand suspicious URLs and phishing risks.
                  The planned application will provide a URL scanning
                  interface, detection results, and scan history.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                    <ShieldCheck className="mb-3 text-cyan-300" size={23} />
                    <h4 className="font-semibold">Planned ML detection</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      A future backend will connect a trained model to analyze
                      URL features and return evidence-based results.
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/30 p-4">
                    <Settings className="mb-3 text-blue-300" size={23} />
                    <h4 className="font-semibold">Current prototype</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Built with React, Vite, Tailwind CSS, and Lucide React.
                      Authentication and real ML detection are not connected.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* FOOTER */}
            <footer className="flex flex-col justify-between gap-2 border-t border-white/[0.07] pt-5 text-xs text-slate-500 sm:flex-row">
              <p>© 2026 PhishGuard · Educational prototype</p>
              <p className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-cyan-400" />
                Demo data only — no live detection
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function RecentScans({
  scans,
  onViewAll,
  title = "Recent URL Activity",
}) {

  const userEntryCount = scans.filter(
    (scan) =>
      scan.type === "pending" ||
      scan.type === "user" ||
      scan.source === "user"
  ).length;

  const sampleCount = scans.length - userEntryCount;
  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d182b]">
      <div className="flex flex-col justify-between gap-3 border-b border-white/[0.07] p-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h3 className="font-semibold">Recent URL activity</h3>

        <p className="mt-1 text-xs text-slate-500">
          {userEntryCount} user scan{userEntryCount !== 1 ? "s" : ""} ·{" "}
          {sampleCount} sample record{sampleCount !== 1 ? "s" : ""}
        </p>
        </div>

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
          >
            View all
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-white/[0.02] text-xs text-slate-500">
            <tr>
              <th className="px-6 py-4 font-medium">Website URL</th>
              <th className="px-6 py-4 font-medium">Demo status</th>
              <th className="px-6 py-4 font-medium">Time</th>
              <th className="px-6 py-4 font-medium">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {scans.map((scan, index) => (
              <tr
                key={`${scan.url}-${index}`}
                className="transition hover:bg-white/[0.02]"
              >
                <td className="max-w-[260px] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                      <Globe size={17} />
                    </div>
                    <span className="truncate text-slate-200">
                      {scan.url}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${
                      scan.type === "safe"
                        ? "bg-emerald-400/10 text-emerald-300"
                        : scan.type === "warning"
                          ? "bg-amber-400/10 text-amber-300"
                          : "bg-blue-400/10 text-blue-300"
                    }`}
                  >
                    {scan.type === "safe" ? (
                      <CheckCircle2 size={13} />
                    ) : scan.type === "warning" ? (
                      <AlertTriangle size={13} />
                    ) : (
                      <Clock3 size={13} />
                    )}
                    {scan.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-400">
                  {scan.time}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-slate-500">
                    {scan.type === "pending"
                      ? "User entry"
                      : "Sample data"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 border-t border-white/[0.07] px-6 py-3 text-xs text-slate-500">
        <AlertTriangle size={14} className="shrink-0 text-amber-300" />
        These statuses are examples, not verified security results.
      </div>
    </section>
  );
}

export default Dashboard;

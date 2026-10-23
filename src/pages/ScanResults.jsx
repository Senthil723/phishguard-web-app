
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { fadeUp, pressFeedback, staggerContainer } from "../animations";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Globe,
  Info,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";

function ScanResults() {
  const navigate = useNavigate();
  const location = useLocation();

  // The URL can be passed from another page later.
  const scannedUrl = location.state?.url || "";

  const hasScannedUrl = Boolean(scannedUrl);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Top navigation */}
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
              <ShieldCheck size={24} />
            </div>

            <div className="text-left">
              <h1 className="text-lg font-bold tracking-wide">
                Phish<span className="text-cyan-400">Guard</span>
              </h1>
              <p className="text-xs text-slate-400">
                Web Threat Analysis
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate("/scanner")}
            className="flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-400 hover:text-cyan-400"
          >
            <ArrowLeft size={16} />
            New Scan
          </button>
        </div>
      </header>

      {/* The main area reveals its sections one after another.
          The header above stays still, like the Dashboard sidebar. */}
      <motion.main
        className="mx-auto max-w-7xl px-5 py-10 sm:px-8"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Page heading */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-cyan-400">
            <FileSearch size={17} />
            <span>Security Analysis</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Scan Results
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Review the submitted URL and its analysis status.
            Real phishing detection will be available after the
            machine learning backend is connected.
          </p>
        </motion.div>

        {/* Demo notice */}
        <motion.div
          variants={fadeUp}
          className="mb-8 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4"
        >
          <Info className="mt-0.5 shrink-0 text-amber-400" size={21} />

          <div>
            <p className="font-semibold text-amber-300">
              Demonstration mode
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              This page does not perform real phishing detection.
              No machine learning model or threat intelligence
              service has analyzed the URL yet.
            </p>
          </div>
        </motion.div>

        {/* URL summary */}
        <motion.section
          variants={fadeUp}
          className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10 sm:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10 text-blue-400">
              <Globe size={22} />
            </div>

            <div>
              <h3 className="font-semibold">Submitted URL</h3>
              <p className="mt-1 text-sm text-slate-400">
                URL provided for analysis
              </p>
            </div>
          </div>

          <div className="break-all rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-200">
            {hasScannedUrl
              ? scannedUrl
              : "No URL has been passed to this page yet."}
          </div>

          {!hasScannedUrl && (
            <p className="mt-3 text-sm text-slate-500">
              Start a scan from the URL Scanner page to pass a URL here.
            </p>
          )}
        </motion.section>

        {/* Analysis status
            This grid is a parent too, so its three cards
            appear one after another inside it. */}
        <motion.div
          variants={staggerContainer}
          className="mb-8 grid gap-5 md:grid-cols-3"
        >
          <motion.section
            variants={fadeUp}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Detection status
              </span>
              <ShieldQuestion className="text-amber-400" size={22} />
            </div>

            <p className="text-xl font-bold text-amber-300">
              Not analyzed
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              No detection engine is connected.
            </p>
          </motion.section>

          <motion.section
            variants={fadeUp}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Risk score
              </span>
              <ShieldAlert className="text-slate-500" size={22} />
            </div>

            <p className="text-xl font-bold text-slate-300">
              Unavailable
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              No score has been calculated.
            </p>
          </motion.section>

          <motion.section
            variants={fadeUp}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Analysis time
              </span>
              <Clock3 className="text-slate-500" size={22} />
            </div>

            <p className="text-xl font-bold text-slate-300">
              Not recorded
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              A scan has not been performed.
            </p>
          </motion.section>
        </motion.div>

        {/* Findings */}
        <motion.section
          variants={fadeUp}
          className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-7"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-400">
              <Sparkles size={21} />
            </div>

            <div>
              <h3 className="font-semibold">Analysis details</h3>
              <p className="mt-1 text-sm text-slate-400">
                Detection checks will appear here in a future version.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-slate-800 p-4">
              <CheckCircle2
                className="mt-0.5 shrink-0 text-cyan-400"
                size={20}
              />
              <div>
                <p className="font-medium">URL submission interface</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  The results page is ready to receive a URL from
                  the application.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 p-4">
              <ShieldQuestion
                className="mt-0.5 shrink-0 text-amber-400"
                size={20}
              />
              <div>
                <p className="font-medium">Phishing detection</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Pending integration with the Python backend and
                  trained machine learning model.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-800 p-4">
              <ShieldQuestion
                className="mt-0.5 shrink-0 text-amber-400"
                size={20}
              />
              <div>
                <p className="font-medium">Threat intelligence checks</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">
                  Domain reputation, certificate details, and
                  threat feed checks are not connected.
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Bottom actions */}
        <motion.div
          variants={fadeUp}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <motion.button
            type="button"
            onClick={() => navigate("/scanner")}
            {...pressFeedback}
            className="flex items-center justify-center gap-2 rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
          >
            Scan Another URL
            <ArrowRight size={18} />
          </motion.button>

          <motion.button
            type="button"
            onClick={() => navigate("/dashboard")}
            {...pressFeedback}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition-colors hover:border-slate-500"
          >
            Back to Dashboard
          </motion.button>
        </motion.div>

        <motion.p
          variants={fadeUp}
          className="mt-8 text-center text-xs leading-5 text-slate-500"
        >
          PhishGuard prototype · Results are not a security verdict.
          Always use trusted security tools to investigate suspicious URLs.
        </motion.p>
      </motion.main>
    </div>
  );
}

export default ScanResults;

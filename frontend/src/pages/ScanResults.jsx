
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  Globe,
  Info,
  LoaderCircle,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

import {
  fadeUp,
  pressFeedback,
  staggerContainer,
} from "../animations";

import { getScanById } from "../services/api";
import { getScanStatusLabel } from "../utils/scanStatus";

function formatDateTime(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not recorded";
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function ScanResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scanId: routeScanId } = useParams();

  // Keep the state fallback for existing links while supporting refreshable URLs.
  const scanId = routeScanId || location.state?.scanId;
  const passedUrl = location.state?.url || "";

  const [scan, setScan] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(scanId));
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadScan() {
      if (!scanId) {
        setScan(null);
        setIsLoading(false);
        setError("");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const savedScan = await getScanById(scanId, {
          signal: controller.signal,
        });
        setScan(savedScan);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setScan(null);
          setError(
            requestError.message ||
              "Unable to load this scan record. Please try again."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadScan();

    return () => {
      controller.abort();
    };
  }, [scanId, retryCount]);

  const scannedUrl = scan?.url || passedUrl;
  const hasScannedUrl = Boolean(scannedUrl);
  const statusLabel = getScanStatusLabel(scan?.status);

  function handleRetry() {
    if (!scanId) return;

    setIsLoading(true);
    setRetryCount((count) => count + 1);
  }

  return (
    <div className="text-slate-900">
      <motion.main
        className="mx-auto max-w-7xl px-0 py-2"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {/* Page heading */}
        <motion.div variants={fadeUp} className="mb-8">
          <div className="mb-3 flex items-center gap-2 text-sm text-blue-700">
            <FileSearch size={17} />
            <span>Security Analysis</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Scan Results
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Review a saved URL submission and its current analysis status.
            Real phishing detection is not connected yet.
          </p>
        </motion.div>

        {/* Honest prototype notice */}
        <motion.div
          variants={fadeUp}
          className="mb-8 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <Info className="mt-0.5 shrink-0 text-amber-700" size={21} />

          <div>
            <p className="font-semibold text-amber-800">
              Demonstration mode
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              PhishGuard retrieves saved submission details from its
              database. A machine-learning model or threat intelligence
              service has not analyzed this URL. No safety verdict is
              available.
            </p>
          </div>
        </motion.div>

        {location.state?.submissionNotice && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-cyan-900"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700"
            />
            <p className="text-sm leading-6">
              {location.state.submissionNotice}
            </p>
          </div>
        )}

        {/* Loading state */}
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              role="status"
              aria-live="polite"
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0 }}
              className="mb-8 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800"
            >
              <LoaderCircle className="h-5 w-5 animate-spin" />
              <div>
                <p className="font-semibold">Loading scan record</p>
                <p className="mt-1 text-sm text-blue-700">
                  Retrieving the saved details from the backend...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence>
          {!isLoading && error && (
            <motion.div
              key="error"
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-red-800">
                    Could not load scan record
                  </h3>

                  <p className="mt-2 break-words text-sm leading-6 text-red-700">
                    {error}
                  </p>

                  {scanId && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <RefreshCw size={16} />
                      Try again
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No selected record */}
        {!isLoading && !error && !hasScannedUrl && (
          <motion.section
            variants={fadeUp}
            className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileSearch size={27} />
            </div>

            <h3 className="mt-4 text-lg font-semibold">
              No scan selected
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Open a saved record from Dashboard or Scan History, or
              submit a URL from the URL Scanner to view its details.
            </p>

            <motion.button
              type="button"
              onClick={() => navigate("/scanner")}
              {...pressFeedback}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              Open URL Scanner
              <ArrowRight size={18} />
            </motion.button>
          </motion.section>
        )}

        {/* Selected URL record */}
        {!isLoading && !error && hasScannedUrl && (
          <>
            <motion.section
              variants={fadeUp}
              className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Globe size={22} />
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold">Submitted URL</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Saved submission details
                  </p>
                </div>
              </div>

              <div className="break-all rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                {scannedUrl}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Database record ID
                  </p>
                  <p className="mt-2 font-semibold text-slate-800">
                    {scan?.id ?? scanId ?? "Unavailable"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Submitted at
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">
                    {formatDateTime(scan?.created_at)}
                  </p>
                </div>
              </div>
            </motion.section>

            {/* Actual saved status, with no invented risk score */}
            <motion.div
              variants={staggerContainer}
              className="mb-8 grid gap-5 md:grid-cols-3"
            >
              <motion.section
                variants={fadeUp}
                className="rounded-2xl border border-amber-200 bg-white p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Saved record status
                  </span>
                  <ShieldQuestion className="text-amber-700" size={22} />
                </div>

                <p className="break-words text-xl font-bold text-amber-800">
                  {statusLabel}
                </p>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  Status returned by the backend database.
                </p>
              </motion.section>

              <motion.section
                variants={fadeUp}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">Risk score</span>
                  <ShieldAlert className="text-slate-500" size={22} />
                </div>

                <p className="text-xl font-bold text-slate-700">
                  Unavailable
                </p>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  No detection score has been calculated.
                </p>
              </motion.section>

              <motion.section
                variants={fadeUp}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Submission time
                  </span>
                  <Clock3 className="text-slate-500" size={22} />
                </div>

                <p className="text-xl font-bold text-slate-700">
                  {scan?.created_at ? "Recorded" : "Unavailable"}
                </p>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {formatDateTime(scan?.created_at)}
                </p>
              </motion.section>
            </motion.div>

            {/* Current capabilities */}
            <motion.section
              variants={fadeUp}
              className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-blue-700">
                  <Sparkles size={21} />
                </div>

                <div>
                  <h3 className="font-semibold">Analysis details</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Current implementation and future capabilities
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-blue-700"
                    size={20}
                  />

                  <div>
                    <p className="font-medium">Database record retrieved</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      The application loaded the selected URL submission
                      from the backend.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                  <ShieldQuestion
                    className="mt-0.5 shrink-0 text-amber-700"
                    size={20}
                  />

                  <div>
                    <p className="font-medium">Phishing detection</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Pending integration with a trained machine-learning
                      model or a suitable security analysis service.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                  <ShieldQuestion
                    className="mt-0.5 shrink-0 text-slate-500"
                    size={20}
                  />

                  <div>
                    <p className="font-medium">Threat intelligence checks</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Domain reputation, certificate details, and threat
                      feed checks are not connected.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Page actions */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <motion.button
                type="button"
                onClick={() => navigate("/scanner")}
                {...pressFeedback}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Scan Another URL
                <ArrowRight size={18} />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => navigate("/dashboard")}
                {...pressFeedback}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              >
                Back to Dashboard
              </motion.button>
            </motion.div>
          </>
        )}

        <motion.p
          variants={fadeUp}
          className="mt-8 text-center text-xs leading-5 text-slate-500"
        >
          PhishGuard prototype · A saved submission is not a security
          verdict. Do not rely on this page to determine whether a website
          is safe.
        </motion.p>
      </motion.main>
    </div>
  );
}

export default ScanResults;


import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSearch,
  HelpCircle,
  Info,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";

import { fadeUp, pressFeedback, staggerContainer } from "../animations";
import { ApiError, getScanById } from "../services/api";
import {
  getScanStatusCategory,
  getScanStatusLabel,
} from "../utils/scanStatus";
import { loadPreferences } from "../utils/preferences";

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

function getStatusAppearance(status) {
  const category = getScanStatusCategory(status);

  const appearances = {
    pending: {
      className: "border-amber-200 bg-amber-50 text-amber-800",
    },
    completed: {
      className: "border-cyan-200 bg-cyan-50 text-cyan-800",
    },
    failed: {
      className: "border-red-200 bg-red-50 text-red-800",
    },
    unknown: {
      className: "border-slate-200 bg-slate-100 text-slate-700",
    },
  };

  return appearances[category] || appearances.unknown;
}

function getPredictionAppearance(prediction) {
  const appearances = {
    phishing: {
      label: "Phishing detected",
      description: "The model classified this URL as phishing.",
      icon: ShieldAlert,
      className: "border-red-200 bg-red-50 text-red-800",
      iconClass: "text-red-700",
    },
    needs_review: {
      label: "Needs review",
      description: "The model result requires further investigation.",
      icon: AlertTriangle,
      className: "border-amber-200 bg-amber-50 text-amber-800",
      iconClass: "text-amber-700",
    },
    lower_model_risk: {
      label: "Lower model risk",
      description: "The model detected fewer phishing indicators.",
      icon: ShieldCheck,
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      iconClass: "text-emerald-700",
    },
  };

  return (
    appearances[prediction] || {
      label: "Not available",
      description: "No ML prediction is available for this record.",
      icon: HelpCircle,
      className: "border-slate-200 bg-slate-50 text-slate-700",
      iconClass: "text-slate-500",
    }
  );
}

function getRiskAppearance(riskLevel) {
  const appearances = {
    high: {
      label: "High Risk",
      description: "The model assigned a high-risk category.",
      className: "border-red-200 bg-red-50 text-red-800",
      iconClass: "text-red-700",
    },
    medium: {
      label: "Medium Risk",
      description: "The model assigned a medium-risk category.",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      iconClass: "text-amber-700",
    },
    low: {
      label: "Low Risk",
      description: "The model assigned a lower-risk category.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      iconClass: "text-emerald-700",
    },
  };

  return (
    appearances[riskLevel] || {
      label: "Not available",
      description: "No risk assessment is available for this record.",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      iconClass: "text-slate-500",
    }
  );
}

function getRetrievalError(error) {
  if (error instanceof ApiError && error.status === 401) {
    return {
      title: "Login session expired",
      message:
        "Your PhishGuard session is no longer valid. Please sign in again to view your saved scan results.",
      canRetry: false,
    };
  }


  if (error instanceof ApiError && error.kind === "invalid-id") {
    return {
      title: "Invalid scan ID",
      message:
        "The requested scan ID is not valid. Choose a saved record from Scan History.",
      canRetry: false,
    };
  }

  if (error instanceof ApiError && error.kind === "network") {
    return {
      title: "PhishGuard is unavailable",
      message:
        "Could not connect to the server to retrieve this saved record. Check your connection and try again.",
      canRetry: true,
    };
  }

  if (error instanceof ApiError && error.kind === "http") {
    if (error.status >= 500) {
      return {
        title: "The server could not retrieve this record",
        message:
          "The server encountered a temporary problem. Please try again.",
        canRetry: true,
      };
    }

    return {
      title: "Could not retrieve scan record",
      message:
        "The server could not complete this request. Return to Scan History and choose a saved record.",
      canRetry: false,
    };
  }

  return {
    title: "Unexpected scan record response",
    message:
      "The server response did not contain the expected record details. Please return to Scan History.",
    canRetry: false,
  };
}

function ScanResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { scanId: routeScanId } = useParams();
  const shouldReduceMotion = useReducedMotion();

  const [showSubmissionConfirmation] = useState(
    () => loadPreferences().preferences.showSubmissionConfirmation
  );

  // Support direct URLs, refreshes, and existing navigation state.
  const scanId = routeScanId || location.state?.scanId;
  const passedUrl = location.state?.url || "";

  const [scan, setScan] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(scanId));
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const retryInFlightRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadScan() {
      if (!scanId) {
        setScan(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setScan(null);
      setError(null);

      try {
        const savedScan = await getScanById(scanId, {
          signal: controller.signal,
        });

        setScan(savedScan);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          console.error("Failed to load scan record:", requestError);
          setScan(null);
          setError(getRetrievalError(requestError));
        }
      } finally {
        if (!controller.signal.aborted) {
          retryInFlightRef.current = false;
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

  const predictionAppearance = getPredictionAppearance(scan?.prediction);
  const PredictionIcon = predictionAppearance.icon;

  const riskAppearance = getRiskAppearance(scan?.risk_level);

  // Older records have no prediction fields. Do not display them as low risk.
  const hasModelResult =
    typeof scan?.model_score === "number" &&
    Number.isFinite(scan.model_score) &&
    Boolean(scan?.prediction) &&
    Boolean(scan?.risk_level);

  const modelScorePercentage = hasModelResult
    ? Math.min(Math.max(scan.model_score * 100, 0), 100)
    : null;

  const statusCategory = getScanStatusCategory(scan?.status);
  const statusLabel = getScanStatusLabel(scan?.status);
  const statusAppearance = getStatusAppearance(scan?.status);

  function handleRetry() {
    if (!scanId || isLoading || retryInFlightRef.current) return;

    retryInFlightRef.current = true;
    setError(null);
    setIsLoading(true);
    setRetryCount((count) => count + 1);
  }

  return (
    <div className="text-slate-900">
      <motion.main
        className="mx-auto max-w-7xl px-0 py-2"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
        aria-labelledby="scan-results-title"
      >
        {/* Page heading */}
        <motion.header
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
              <FileSearch aria-hidden="true" size={17} />
              ML-powered URL assessment
            </div>

            <h1
              id="scan-results-title"
              className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
            >
              Scan Results
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Review the experimental machine-learning assessment and saved
              details of your submitted URL.
            </p>
          </div>

          <Link
            to="/history"
            className="inline-flex w-fit items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Clock3 aria-hidden="true" size={16} />
            Scan History
          </Link>
        </motion.header>

        {/* Submission confirmation */}
        {location.state?.submissionNotice && showSubmissionConfirmation && (
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
        <AnimatePresence mode="wait" initial={false}>
          {isLoading && (
            <motion.div
              key="loading"
              role="status"
              aria-live="polite"
              aria-label="Retrieving saved scan record"
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
              className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-800"
            >
              <LoaderCircle
                aria-hidden="true"
                className="h-5 w-5 animate-spin motion-reduce:animate-none"
                size={20}
              />

              <div>
                <p className="font-semibold">Loading scan results</p>
                <p className="mt-1 text-sm text-blue-700">
                  Retrieving the saved URL and ML assessment from the backend...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        <AnimatePresence initial={false}>
          {!isLoading && error && (
            <motion.section
              key="error"
              role="alert"
              aria-live="assertive"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
              className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5"
              aria-labelledby="scan-error-title"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                />

                <div className="min-w-0 flex-1">
                  <h2
                    id="scan-error-title"
                    className="font-semibold text-red-900"
                  >
                    {error.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-red-800">
                    {error.message}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {error.title === "Login session expired" && (
                      <Link
                        to="/"
                        state={{ from: location }}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Return to Login
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    )}
                    {error.canRetry && (
                      <button
                        type="button"
                        onClick={handleRetry}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RefreshCw aria-hidden="true" size={16} />
                        Try again
                      </button>
                    )}

                    <Link
                      to="/history"
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-red-900 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                    >
                      Return to Scan History
                    </Link>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* No scan selected */}
        {!isLoading && !error && !hasScannedUrl && (
          <motion.section
            variants={shouldReduceMotion ? undefined : fadeUp}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <FileSearch aria-hidden="true" size={27} />
            </div>

            <h2 className="mt-4 text-lg font-semibold">No scan selected</h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
              Open a saved record from Scan History, or submit a URL through
              the URL Scanner.
            </p>

            <motion.button
              type="button"
              onClick={() => navigate("/scanner")}
              {...(shouldReduceMotion ? {} : pressFeedback)}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Open URL Scanner
              <ArrowRight aria-hidden="true" size={18} />
            </motion.button>
          </motion.section>
        )}

        {/* Scan result content */}
        {!isLoading && !error && hasScannedUrl && (
          <>
            {/* Submitted URL and record details */}
            <motion.section
              variants={shouldReduceMotion ? undefined : fadeUp}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
              aria-labelledby="submitted-url-title"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <FileSearch aria-hidden="true" size={22} />
                </div>

                <div>
                  <h2 id="submitted-url-title" className="font-semibold">
                    Submitted URL
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Saved investigation details
                  </p>
                </div>
              </div>

              <p className="break-all rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800">
                {scannedUrl}
              </p>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Database record ID
                  </dt>
                  <dd className="mt-2 break-all font-semibold text-slate-900">
                    {scan?.id ?? scanId ?? "Unavailable"}
                  </dd>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Submitted at
                  </dt>
                  <dd className="mt-2 text-sm font-semibold text-slate-900">
                    {formatDateTime(scan?.created_at)}
                  </dd>
                </div>

                <div
                  className={`rounded-xl border p-4 ${statusAppearance.className}`}
                >
                  <dt className="text-xs font-medium uppercase tracking-wide">
                    Record status
                  </dt>
                  <dd className="mt-2 font-semibold">
                    {statusCategory === "unknown"
                      ? `Unknown: ${statusLabel}`
                      : statusLabel}
                  </dd>
                </div>
              </dl>
            </motion.section>

            {/* Three ML result cards */}
            <motion.section
              variants={shouldReduceMotion ? undefined : staggerContainer}
              className="mb-6 grid gap-4 md:grid-cols-3"
              aria-label="Machine learning assessment summary"
            >
              {/* Prediction card */}
              <motion.div
                variants={shouldReduceMotion ? undefined : fadeUp}
                className={`rounded-2xl border p-5 ${predictionAppearance.className}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">ML Prediction</h2>
                  <PredictionIcon
                    aria-hidden="true"
                    className={predictionAppearance.iconClass}
                    size={24}
                  />
                </div>

                <p className="break-words text-xl font-bold">
                  {hasModelResult
                    ? predictionAppearance.label
                    : "Not available"}
                </p>

                <p className="mt-2 text-sm leading-5 opacity-90">
                  {hasModelResult
                    ? predictionAppearance.description
                    : "This record has no stored ML prediction."}
                </p>
              </motion.div>

              {/* Risk level card */}
              <motion.div
                variants={shouldReduceMotion ? undefined : fadeUp}
                className={`rounded-2xl border p-5 ${riskAppearance.className}`}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">Risk Level</h2>
                  <ShieldAlert
                    aria-hidden="true"
                    className={riskAppearance.iconClass}
                    size={24}
                  />
                </div>

                <p className="break-words text-xl font-bold">
                  {hasModelResult ? riskAppearance.label : "Not available"}
                </p>

                <p className="mt-2 text-sm leading-5 opacity-90">
                  {hasModelResult
                    ? riskAppearance.description
                    : "A risk category has not been stored for this record."}
                </p>
              </motion.div>

              {/* Model score card */}
              <motion.div
                variants={shouldReduceMotion ? undefined : fadeUp}
                className="rounded-2xl border border-blue-200 bg-white p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Model Score
                  </h2>
                  <FileSearch
                    aria-hidden="true"
                    className="text-blue-700"
                    size={24}
                  />
                </div>

                <p className="text-2xl font-bold text-slate-950">
                  {hasModelResult
                    ? `${modelScorePercentage.toFixed(2)}%`
                    : "Not available"}
                </p>

                {hasModelResult ? (
                  <div
                    className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label="Model score"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Number(modelScorePercentage.toFixed(2))}
                  >
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${modelScorePercentage}%` }}
                    />
                  </div>
                ) : (
                  <div className="mt-4 h-2 rounded-full bg-slate-100" />
                )}

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {hasModelResult
                    ? "Raw model score, not a calibrated probability."
                    : "No model score is available for this record."}
                </p>
              </motion.div>
            </motion.section>

            {/* Analysis information */}
            <motion.section
              variants={shouldReduceMotion ? undefined : fadeUp}
              className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"
              aria-labelledby="analysis-information-title"
            >
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-800">
                  <Info aria-hidden="true" size={21} />
                </div>

                <div>
                  <h2
                    id="analysis-information-title"
                    className="font-semibold text-slate-900"
                  >
                    Analysis Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    What PhishGuard checked and what is not yet available
                  </p>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                <div className="flex items-start gap-3 py-4 first:pt-0">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-blue-700"
                    size={20}
                  />

                  <div>
                    <h3 className="font-medium text-slate-900">
                      URL features extracted
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      PhishGuard extracts URL characteristics such as URL
                      length, hostname details, special characters, and
                      suspicious keywords. The submitted website is not visited.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-4">
                  {hasModelResult ? (
                    <CheckCircle2
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-blue-700"
                      size={20}
                    />
                  ) : (
                    <Info
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 text-amber-700"
                      size={20}
                    />
                  )}

                  <div>
                    <h3 className="font-medium text-slate-900">
                      {hasModelResult
                        ? "ML prediction generated"
                        : "ML prediction unavailable for this record"}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {hasModelResult
                        ? `The experimental Random Forest model generated this result using model version ${scan.model_version || "not recorded"}.`
                        : "This may be an older submission created before ML analysis was connected. Its missing prediction must not be interpreted as a low-risk result."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-4">
                  <ShieldQuestion
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-amber-700"
                    size={20}
                  />

                  <div>
                    <h3 className="font-medium text-slate-900">
                      External threat intelligence unavailable
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Domain reputation databases, threat feeds, and live
                      website inspection are not connected.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 py-4 last:pb-0">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-slate-500"
                    size={20}
                  />

                  <div>
                    <h3 className="font-medium text-slate-900">
                      Experimental model limitation
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      The model score is not a calibrated probability.
                      A lower model risk does not guarantee that a website
                      is safe, and a prediction should not be treated as
                      a definitive security verdict.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>

            {/* Navigation actions */}
            <motion.div
              variants={shouldReduceMotion ? undefined : fadeUp}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <motion.button
                type="button"
                onClick={() => navigate("/scanner")}
                {...(shouldReduceMotion ? {} : pressFeedback)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                Submit Another URL
                <ArrowRight aria-hidden="true" size={18} />
              </motion.button>

              <motion.button
                type="button"
                onClick={() => navigate("/dashboard")}
                {...(shouldReduceMotion ? {} : pressFeedback)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                Back to Dashboard
              </motion.button>
            </motion.div>
          </>
        )}

      </motion.main>
    </div>
  );
}

export default ScanResults;

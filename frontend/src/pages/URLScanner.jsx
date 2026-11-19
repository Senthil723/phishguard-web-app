
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  AlertTriangle,
  Info,
  Link as LinkIcon,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  fadeUp,
  pressFeedback,
  staggerContainer,
} from "../animations";

import {
  ApiError,
  createScan,
} from "../services/api";

import { loadPreferences } from "../utils/preferences";

// =============================================
// URL VALIDATION
// =============================================

function validateUrl(value, defaultProtocol) {
  const trimmedUrl = value.trim();

  if (!trimmedUrl) {
    return {
      error: "Please enter a URL.",
    };
  }

  if (trimmedUrl.length > 2048) {
    return {
      error: "The URL must be 2048 characters or fewer.",
    };
  }

  const schemeMatch = trimmedUrl.match(
    /^([a-z][a-z\d+.-]*):/i
  );

  const hasHostAndPort =
    /^(?:localhost|[^/:?#\s]+\.[^/:?#\s]+|\[[\da-f:.]+\]):\d+(?:[/?#]|$)/i.test(
      trimmedUrl
    );

  const hasHttpScheme =
    schemeMatch &&
    ["http", "https"].includes(
      schemeMatch[1].toLowerCase()
    );

  if (
    schemeMatch &&
    !hasHttpScheme &&
    !hasHostAndPort
  ) {
    return {
      error: "Only HTTP and HTTPS URLs are supported.",
    };
  }

  const normalizedUrl = hasHttpScheme
    ? trimmedUrl
    : `${defaultProtocol}://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname ||
      /[%\s]/.test(parsedUrl.hostname)
    ) {
      return {
        error:
          "Enter a valid HTTP or HTTPS URL with a hostname.",
      };
    }

    if (parsedUrl.href.length > 2048) {
      return {
        error: "The URL must be 2048 characters or fewer.",
      };
    }

    return {
      normalizedUrl: parsedUrl.href,
    };
  } catch {
    return {
      error: "Enter a valid URL, such as example.com.",
    };
  }
}

// =============================================
// API ERROR HANDLING
// =============================================

function getSubmissionErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return (
      "The scan could not be completed. " +
      "Please try again."
    );
  }

  if (error.status === 401) {
    return (
      "Your login session has expired or is invalid. " +
      "Please sign in again to scan URLs."
    );
  }

  if (error.status === 403) {
    return (
      "This request was blocked by the server. " +
      "Please refresh the page and try again."
    );
  }

  if (error.kind === "network") {
    return (
      "Unable to connect to the PhishGuard server. " +
      "Check that the backend is running."
    );
  }

  if (error.kind === "invalid-response") {
    return (
      "The server returned an unexpected response. " +
      "We could not confirm the saved scan result."
    );
  }

  if ([400, 422].includes(error.status)) {
    return (
      "The server rejected this URL. " +
      "Check its format and try again."
    );
  }

  if (error.status >= 500) {
    return (
      "The server could not complete the ML analysis. " +
      "Please try again later."
    );
  }

  return (
    "The scan could not be completed. " +
    "Please try again."
  );
}

// =============================================
// URL SCANNER COMPONENT
// =============================================

export default function URLScanner() {
  const navigate = useNavigate();

  const shouldReduceMotion = useReducedMotion();

  const [defaultProtocol] = useState(
    () => loadPreferences().preferences.defaultProtocol
  );

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prevent repeated scan submissions.
  const isSubmittingRef = useRef(false);

  // =============================================
  // SCAN URL THROUGH FASTAPI
  // =============================================

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmittingRef.current) {
      return;
    }

    const validation = validateUrl(
      url,
      defaultProtocol
    );

    if (validation.error) {
      setMessage(validation.error);
      setUrlError(true);
      return;
    }

    isSubmittingRef.current = true;

    setIsSubmitting(true);
    setMessage("");
    setUrlError(false);

    try {
      // FastAPI runs the URL-based ML assessment
      // and saves the scan for the current user.
      const savedScan = await createScan(
        validation.normalizedUrl
      );

      // The backend database is the source of truth.
      // No browser sessionStorage history is created.

      navigate(`/results/${savedScan.id}`, {
        state: {
          url: savedScan.url,
          status: savedScan.status,
          submissionNotice:
            "Your URL was submitted successfully. " +
            "The scan record and available ML assessment " +
            "were saved to your account.",
        },
      });
    } catch (error) {
      console.error(
        "Failed to analyze URL:",
        error
      );

      setMessage(
        getSubmissionErrorMessage(error)
      );

      setUrlError(false);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  // =============================================
  // URL INPUT CHANGE
  // =============================================

  function handleUrlChange(value) {
    setUrl(value);
    setMessage("");
    setUrlError(false);
  }

  return (
    <div className="px-0 py-2 text-slate-900">
      <motion.div
        className="mx-auto max-w-4xl"
        variants={
          shouldReduceMotion
            ? undefined
            : staggerContainer
        }
        initial={
          shouldReduceMotion
            ? false
            : "hidden"
        }
        animate={
          shouldReduceMotion
            ? undefined
            : "show"
        }
      >

        {/* =====================================
            PAGE HEADER
        ===================================== */}

        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : fadeUp
          }
          className="mb-8 flex items-center gap-3"
        >
          <div className="rounded-xl bg-cyan-500/10 p-3">
            <ShieldCheck className="h-8 w-8 text-cyan-700" />
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              URL Scanner
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Analyze website URLs using PhishGuard's
              machine learning detection model.
            </p>
          </div>
        </motion.div>

        {/* =====================================
            SCANNER CARD
        ===================================== */}

        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : fadeUp
          }
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8"
        >

          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Analyze a URL
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter a website URL to receive an ML-assisted
              phishing risk assessment. PhishGuard analyzes
              features of the submitted URL and saves the
              result to your private Scan History.
            </p>
          </div>

          {/* =====================================
              URL INPUT FORM
          ===================================== */}

          <form
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
          >

            <label
              htmlFor="website-url"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Website URL
            </label>

            <p
              id="website-url-hint"
              className="mb-3 text-xs text-slate-500"
            >
              Enter an HTTP or HTTPS URL. If you omit
              the protocol,{" "}
              {defaultProtocol.toUpperCase()} will be used.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* URL INPUT BOX */}

              <div
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border bg-white px-4 transition focus-within:ring-4 ${
                  urlError
                    ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-100"
                    : "border-slate-200 focus-within:border-blue-500 focus-within:ring-blue-100"
                }`}
              >

                <LinkIcon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-slate-500"
                />

                <input
                  id="website-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={url}
                  aria-invalid={urlError}
                  aria-describedby={`website-url-hint${
                    message
                      ? " website-url-message"
                      : ""
                  }`}
                  onChange={(event) =>
                    handleUrlChange(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                  className="min-w-0 flex-1 bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {/* CLEAR INPUT BUTTON */}

                {url && (
                  <button
                    type="button"
                    onClick={() =>
                      handleUrlChange("")
                    }
                    disabled={isSubmitting}
                    aria-label="Clear URL"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </button>
                )}

              </div>

              {/* =====================================
                  SCAN BUTTON
              ===================================== */}

              <motion.button
                type="submit"
                {...(
                  shouldReduceMotion
                    ? {}
                    : pressFeedback
                )}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >

                {isSubmitting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Search
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                )}

                {isSubmitting
                  ? "Analyzing URL..."
                  : "Scan URL"}

              </motion.button>
            </div>

            {/* =====================================
                ERROR MESSAGE
            ===================================== */}

            <AnimatePresence initial={false}>
              {message && (
                <motion.div
                  key="scanner-message"
                  role="alert"
                  initial={
                    shouldReduceMotion
                      ? false
                      : {
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                        }
                  }
                  animate={{
                    opacity: 1,
                    height: "auto",
                    marginTop: 16,
                  }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : {
                          opacity: 0,
                          height: 0,
                          marginTop: 0,
                        }
                  }
                  transition={{
                    duration:
                      shouldReduceMotion
                        ? 0
                        : 0.2,
                  }}
                  className={`flex gap-3 overflow-hidden rounded-xl border p-4 text-sm ${
                    urlError
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >

                  <AlertTriangle
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />

                  <p id="website-url-message">
                    {message}
                  </p>

                </motion.div>
              )}
            </AnimatePresence>

            {/* =====================================
                ANALYSIS PROGRESS
            ===================================== */}

            <AnimatePresence initial={false}>
              {isSubmitting && (
                <motion.div
                  key="submission-progress"
                  role="status"
                  aria-live="polite"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0 }
                  }
                  animate={{
                    opacity: 1,
                  }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0 }
                  }
                  transition={{
                    duration:
                      shouldReduceMotion
                        ? 0
                        : 0.15,
                  }}
                  className="mt-4 flex items-center gap-2 text-sm text-blue-700"
                >

                  <ShieldCheck
                    aria-hidden="true"
                    className="h-4 w-4"
                  />

                  <span>
                    Submitting URL for ML-assisted analysis...
                  </span>

                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </motion.div>

        {/* =====================================
            ML ASSESSMENT INFORMATION
        ===================================== */}

        <motion.div
          variants={
            shouldReduceMotion
              ? undefined
              : fadeUp
          }
          className="mt-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4"
        >

          <div className="flex items-start gap-3">

            <Info
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-blue-700"
            />

            <div>
              <h3 className="font-medium text-blue-900">
                About PhishGuard's ML analysis
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                PhishGuard uses a machine learning model
                to assess phishing-related patterns in
                submitted URLs. The model analyzes URL
                features without visiting the website.
                Predictions indicate estimated risk and
                may be incorrect. Do not treat any result
                as proof that a website is safe or malicious.
              </p>

            </div>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}

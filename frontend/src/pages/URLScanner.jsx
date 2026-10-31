import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { fadeUp, pressFeedback, staggerContainer } from "../animations";
import {
  AlertTriangle,
  Info,
  Link as LinkIcon,
  LoaderCircle,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { ApiError, createScan } from "../services/api";

function validateUrl(value) {
  const trimmedUrl = value.trim();

  if (!trimmedUrl) {
    return { error: "Please enter a URL." };
  }

  if (trimmedUrl.length > 2048) {
    return { error: "The URL must be 2048 characters or fewer." };
  }

  const schemeMatch = trimmedUrl.match(/^([a-z][a-z\d+.-]*):/i);
  const hasHostAndPort = /^(?:localhost|[^/:?#\s]+\.[^/:?#\s]+|\[[\da-f:.]+\]):\d+(?:[/?#]|$)/i.test(
    trimmedUrl
  );
  const hasHttpScheme =
    schemeMatch && ["http", "https"].includes(schemeMatch[1].toLowerCase());

  if (schemeMatch && !hasHttpScheme && !hasHostAndPort) {
    return { error: "Only HTTP and HTTPS URLs are supported." };
  }

  const normalizedUrl = hasHttpScheme
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname ||
      /[%\s]/.test(parsedUrl.hostname)
    ) {
      return {
        error: "Enter a valid HTTP or HTTPS URL with a hostname.",
      };
    }

    if (parsedUrl.href.length > 2048) {
      return { error: "The URL must be 2048 characters or fewer." };
    }

    return { normalizedUrl: parsedUrl.href };
  } catch {
    return { error: "Enter a valid URL, such as example.com." };
  }
}

function getSubmissionErrorMessage(error) {
  if (!(error instanceof ApiError)) {
    return "The submission could not be completed. Please try again.";
  }

  if (error.kind === "network") {
    return "Unable to connect to the PhishGuard server. Check your connection and try again.";
  }

  if (error.kind === "invalid-response") {
    return "The server returned an unexpected response. We could not confirm that the URL was saved.";
  }

  if ([400, 422].includes(error.status)) {
    return "The server rejected this URL. Check its format and try again.";
  }

  if (error.status >= 500) {
    return "The server could not complete the submission. Please try again.";
  }

  return "The submission could not be completed. Please try again.";
}

export default function URLScanner() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    const validation = validateUrl(url);

    if (validation.error) {
      setMessage(validation.error);
      setUrlError(true);
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setMessage("");
    setUrlError(false);

    let savedScan;

    try {
      savedScan = await createScan(validation.normalizedUrl);
    } catch (error) {
      console.error("Failed to save URL submission:", error);
      setMessage(getSubmissionErrorMessage(error));
      setUrlError(false);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Keep browser-session history as a convenience; the backend record is primary.
    try {
      const historyEntry = {
        id: savedScan.id,
        url: savedScan.url,
        status: "Demo: Not analyzed",
        time: new Date(savedScan.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "pending",
        createdAt: savedScan.created_at,
      };

      const existingHistory = JSON.parse(
        sessionStorage.getItem("phishguardHistory") || "[]"
      );

      const updatedHistory = [
        historyEntry,
        ...(Array.isArray(existingHistory) ? existingHistory : []),
      ].slice(0, 20);

      sessionStorage.setItem(
        "phishguardHistory",
        JSON.stringify(updatedHistory)
      );
    } catch (storageError) {
      console.warn(
        "URL was saved, but browser session history could not be updated:",
        storageError
      );
    }

    isSubmittingRef.current = false;
    setIsSubmitting(false);

    navigate(`/results/${savedScan.id}`, {
      state: {
        url: savedScan.url,
        status: savedScan.status,
        submissionNotice:
          "Your URL was submitted successfully and the investigation record was saved. Phishing analysis is not yet available.",
      },
    });
  }

  function handleUrlChange(value) {
    setUrl(value);
    setMessage("");
    setUrlError(false);
  }

  return (
    <div className="px-0 py-2 text-slate-900">
      <motion.div
        className="mx-auto max-w-4xl"
        variants={shouldReduceMotion ? undefined : staggerContainer}
        initial={shouldReduceMotion ? false : "hidden"}
        animate={shouldReduceMotion ? undefined : "show"}
      >
        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="mb-8 flex items-center gap-3"
        >
          <div className="rounded-xl bg-cyan-500/10 p-3">
            <ShieldCheck className="h-8 w-8 text-cyan-700" />
          </div>

          <div>
            <h1 className="text-3xl font-bold">URL Scanner</h1>
            <p className="mt-1 text-sm text-slate-500">
              Submit a website URL to PhishGuard.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Submit a URL</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              PhishGuard checks the URL format and saves a submission record.
              It does not currently perform phishing analysis.
            </p>
          </div>

          <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
            <label
              htmlFor="website-url"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Website URL
            </label>

            <p id="website-url-hint" className="mb-3 text-xs text-slate-500">
              Enter an HTTP or HTTPS URL. If you omit the protocol, HTTPS will
              be used.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
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
                  aria-describedby={`website-url-hint${message ? " website-url-message" : ""}`}
                  onChange={(event) => handleUrlChange(event.target.value)}
                  placeholder="https://example.com"
                  disabled={isSubmitting}
                  className="min-w-0 flex-1 bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                />

                {url && (
                  <button
                    type="button"
                    onClick={() => handleUrlChange("")}
                    disabled={isSubmitting}
                    aria-label="Clear URL"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>

              <motion.button
                type="submit"
                {...(shouldReduceMotion ? {} : pressFeedback)}
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                {isSubmitting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-5 w-5 animate-spin motion-reduce:animate-none"
                  />
                ) : (
                  <Search aria-hidden="true" className="h-5 w-5" />
                )}
                {isSubmitting ? "Saving URL..." : "Submit URL"}
              </motion.button>
            </div>

            <AnimatePresence initial={false}>
              {message && (
                <motion.div
                  key="scanner-message"
                  role="alert"
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, height: 0, marginTop: 0 }
                  }
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={
                    shouldReduceMotion
                      ? undefined
                      : { opacity: 0, height: 0, marginTop: 0 }
                  }
                  transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
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
                  <p id="website-url-message">{message}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {isSubmitting && (
                <motion.div
                  key="submission-progress"
                  role="status"
                  aria-live="polite"
                  initial={shouldReduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={
                    shouldReduceMotion ? undefined : { opacity: 0 }
                  }
                  transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
                  className="mt-4 flex items-center gap-2 text-sm text-blue-700"
                >
                  <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                  Saving your URL submission...
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        <motion.div
          variants={shouldReduceMotion ? undefined : fadeUp}
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <div className="flex items-start gap-3">
            <Info
              aria-hidden="true"
              className="mt-1 h-5 w-5 shrink-0 text-amber-700"
            />

            <div>
              <h3 className="font-medium text-amber-800">Prototype notice</h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                URL formatting checks do not determine whether a website is
                safe. The backend saves submissions, but no machine-learning
                model or security service currently classifies URLs. Do not
                rely on this prototype for a safety verdict.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

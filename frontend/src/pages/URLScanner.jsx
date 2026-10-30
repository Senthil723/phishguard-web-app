

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { fadeUp, pressFeedback, staggerContainer } from "../animations";
import {
  ShieldCheck,
  Search,
  Link as LinkIcon,
  AlertTriangle,
  Info,
  RotateCcw,
} from "lucide-react";
import { createScan } from "../services/api";

export default function URLScanner() {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [urlError, setUrlError] = useState(false);
  const [scannedUrl, setScannedUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const isSubmittingRef = useRef(false);

  async function handleScan(event) {
    event.preventDefault();

    if (isSubmittingRef.current) return;

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setMessage("Please enter a website URL.");
      setUrlError(true);
      setScannedUrl("");
      return;
    }

    if (trimmedUrl.length > 2048) {
      setMessage("The URL must be 2048 characters or fewer.");
      setUrlError(true);
      setScannedUrl("");
      return;
    }

    let normalizedUrl;

    // Step 1: Validate the URL format.
    try {
      normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;

      const parsedUrl = new URL(normalizedUrl);

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !parsedUrl.hostname.includes(".") ||
        /\s/.test(parsedUrl.hostname)
      ) {
        throw new Error("Invalid URL");
      }

      normalizedUrl = parsedUrl.href;

      if (normalizedUrl.length > 2048) {
        setScannedUrl("");
        setMessage("The URL must be 2048 characters or fewer.");
        setUrlError(true);
        return;
      }
    } catch {
      setScannedUrl("");
      setMessage("Please enter a valid URL, such as example.com.");
      setUrlError(true);
      return;
    }

    // Step 2: Save the URL through the backend API.
    isSubmittingRef.current = true;
    setIsScanning(true);
    setMessage("");
    setUrlError(false);
    setScannedUrl("");

    try {
      let savedScan;

      try {
        savedScan = await createScan(normalizedUrl);
      } catch (error) {
        console.error("Failed to save scan:", error);
        setMessage(
          "Unable to save this URL. Check that the backend is running, then try again."
        );
        setUrlError(false);
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
          "Scan was saved, but browser session history could not be updated:",
          storageError
        );
      }

      setScannedUrl(savedScan.url);

      // Open the Results page using the saved database record ID.
      navigate(`/results/${savedScan.id}`, {
        state: {
          url: savedScan.url,
          status: savedScan.status,
        },
      });
    } finally {
      isSubmittingRef.current = false;
      setIsScanning(false);
    }
  }

  function resetScanner() {
    setUrl("");
    setMessage("");
    setUrlError(false);
    setScannedUrl("");
  }

  return (
    <div className="px-0 py-2 text-slate-900">
      <motion.div
        className="mx-auto max-w-4xl"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={fadeUp}
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
          variants={fadeUp}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Scan a website</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter a URL to save it to your scan history. Currently,
              PhishGuard validates the URL format and stores your
              submission. Phishing detection is not connected yet.
            </p>
          </div>

          <form onSubmit={handleScan} aria-busy={isScanning}>
            <label
              htmlFor="website-url"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Website URL
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-500">
                <LinkIcon className="h-5 w-5 shrink-0 text-slate-500" />

                <input
                  id="website-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  maxLength={2048}
                  value={url}
                  aria-invalid={urlError}
                  aria-describedby={
                    urlError ? "website-url-message" : undefined
                  }
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMessage("");
                    setUrlError(false);
                    setScannedUrl("");
                  }}
                  placeholder="https://example.com"
                  disabled={isScanning}
                  className="min-w-0 flex-1 bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-60"
                />
              </div>

              <motion.button
                type="submit"
                {...pressFeedback}
                disabled={isScanning}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search className="h-5 w-5" />
                {isScanning ? "Saving URL..." : "Submit URL"}
              </motion.button>
            </div>
          </form>

          <AnimatePresence>
            {message && (
              <motion.div
                key="scanner-message"
                role="alert"
                className="overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p id="website-url-message">{message}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {scannedUrl && (
            <div className="mt-6 rounded-xl border border-cyan-200 bg-cyan-50/70 p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-1 h-6 w-6 shrink-0 text-cyan-700" />

                <div className="min-w-0">
                  <h3 className="font-semibold text-cyan-800">
                    URL saved successfully
                  </h3>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {scannedUrl}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Your URL was saved to the backend database. It has
                    not been analyzed for phishing or malware.
                  </p>

                  <span className="mt-4 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Detection not connected
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={resetScanner}
                className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Submit another URL
              </button>
            </div>
          )}
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="mt-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4"
        >
          <div className="flex items-start gap-3">
            <Info className="mt-1 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h3 className="font-medium text-amber-800">
                Prototype notice
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                The backend database is connected through the API,
                but no machine-learning model or security service
                currently determines whether a URL is malicious.
                Do not use this prototype to decide whether a website
                is safe.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

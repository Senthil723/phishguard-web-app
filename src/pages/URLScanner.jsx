
import { useState } from "react";
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

export default function URLScanner() {
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [scannedUrl, setScannedUrl] = useState("");

  function handleScan(event) {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setMessage("Please enter a website URL.");
      setScannedUrl("");
      return;
    }

    try {
      const normalizedUrl = /^https?:\/\//i.test(trimmedUrl)
        ? trimmedUrl
        : `https://${trimmedUrl}`;

      const parsedUrl = new URL(normalizedUrl);

      if (
        !parsedUrl.hostname.includes(".") ||
        /\s/.test(parsedUrl.hostname)
      ) {
        throw new Error("Invalid URL");
      }

      // Create a history entry for this URL.
      const historyEntry = {
        url: parsedUrl.href,
        status: "Demo: Not analyzed",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "pending",
        createdAt: new Date().toISOString(),
      };

      // Read the existing scan history.
      const existingHistory = JSON.parse(
        sessionStorage.getItem("phishguardHistory") || "[]"
      );

      // Put the newest scan first and keep up to 20 entries.
      const updatedHistory = [
        historyEntry,
        ...(Array.isArray(existingHistory) ? existingHistory : []),
      ].slice(0, 20);

      // Save the history in this browser tab's session.
      sessionStorage.setItem(
        "phishguardHistory",
        JSON.stringify(updatedHistory)
      );

      setMessage("");
      setScannedUrl(parsedUrl.href);

      // Open the Results page.
      navigate("/results", {
        state: {
          url: parsedUrl.href,
        },
      });
    } catch (error) {
      console.error("URL validation or history saving failed:", error);

      setScannedUrl("");
      setMessage(
        "Please enter a valid URL, such as example.com."
      );
    }
  }

  function resetScanner() {
    setUrl("");
    setMessage("");
    setScannedUrl("");
  }

  return (
    <div className="px-0 py-2 text-slate-900">
      {/* The three blocks of the page appear one after another. */}
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
            <h1 className="text-3xl font-bold">
              URL Scanner
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Check a website URL with PhishGuard.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              Scan a website
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter the URL you want to examine. This prototype
              validates the URL format only; it does not detect
              phishing or verify website safety.
            </p>
          </div>

          <form onSubmit={handleScan}>
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
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMessage("");
                    setScannedUrl("");
                  }}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 bg-transparent py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* pressFeedback (from animations.js) shrinks the button a
                  little while it is pressed.
                  "transition-colors" keeps the hover colour change without
                  fighting Motion over the size change. */}
              <motion.button
                type="submit"
                {...pressFeedback}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-semibold text-slate-950 transition-colors hover:bg-cyan-400"
              >
                <Search className="h-5 w-5" />
                Validate URL
              </motion.button>
            </div>
          </form>

          {/* The error message opens and closes smoothly instead of
              pushing the page down suddenly. The outer box animates its
              height; the red box inside keeps its normal spacing. */}
          <AnimatePresence>
            {message && (
              <motion.div
                key="scanner-error"
                role="alert"
                className="overflow-hidden"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <div className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p>{message}</p>
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
                    URL format is valid
                  </h3>

                  <p className="mt-2 break-all text-sm text-slate-700">
                    {scannedUrl}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    This only confirms that the URL passed basic
                    format checks. The website has not been
                    checked for phishing or malware.
                  </p>

                  <span className="mt-4 inline-block rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                    Demo — Detection not connected
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={resetScanner}
                className="mt-5 flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                <RotateCcw className="h-4 w-4" />
                Scan another URL
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
                No machine-learning model, security API, or
                backend is connected. Do not use this page to
                decide whether a website is safe.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

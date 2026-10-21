
import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  Activity,
  Globe,
  ScanSearch,
  CheckCircle2,
} from "lucide-react";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setMessage("Please enter your email and password.");
      return;
    }

    setMessage(
      "Demo mode: your form works, but real authentication is not connected yet."
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE: LOGIN FORM */}
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16">
          <div className="w-full max-w-md">

            {/* BRAND */}
            <a href="/" className="mb-10 inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/25">
                <ShieldCheck size={28} strokeWidth={2.2} />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Phish<span className="text-cyan-400">Guard</span>
                </h1>
                <p className="text-xs tracking-wider text-slate-400">
                  SMARTER WEB SECURITY
                </p>
              </div>
            </a>

            {/* WELCOME */}
            <div className="mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-300">
                <ShieldCheck size={14} />
                Your security starts here
              </div>

              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 leading-6 text-slate-400">
                Sign in to access your security dashboard and protect yourself
                from suspicious websites.
              </p>
            </div>

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-200"
                  >
                    Password
                  </label>

                  <span className="text-xs text-slate-500">
                    Demo sign-in
                  </span>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-cyan-400"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* DEMO MESSAGE */}
              {message && (
                <div
                  role="status"
                  className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm leading-6 text-cyan-200"
                >
                  {message}
                </div>
              )}

              {/* SIGN IN BUTTON */}
              <button
                type="submit"
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Sign in
                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </form>

            {/* SECURITY NOTE */}
            <div className="mt-7 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <ShieldAlert
                size={20}
                className="mt-0.5 shrink-0 text-cyan-400"
              />
              <p className="text-xs leading-5 text-slate-400">
                <span className="font-semibold text-slate-200">
                  Development preview.
                </span>{" "}
                Authentication is not connected. This form only demonstrates
                the interface and does not verify your identity.
              </p>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
              © 2026 PhishGuard · Web security awareness
            </p>
          </div>
        </section>

        {/* RIGHT SIDE: CYBERSECURITY PANEL */}
        <section className="relative hidden overflow-hidden border-l border-white/5 bg-[#080f20] lg:flex lg:items-center lg:justify-center lg:px-10 xl:px-16">

          {/* BACKGROUND DECORATION */}
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-xl">

            {/* TOP LABEL */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <Activity size={16} />
                Intelligent web protection
              </div>

              <div className="flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                UI preview
              </div>
            </div>

            {/* SHIELD VISUAL */}
            <div className="relative mb-9 flex h-64 items-center justify-center sm:h-72">

              {/* DECORATIVE RINGS */}
              <div className="absolute h-64 w-64 rounded-full border border-blue-400/10 sm:h-72 sm:w-72" />
              <div className="absolute h-52 w-52 rounded-full border border-cyan-400/15 sm:h-60 sm:w-60" />
              <div className="absolute h-40 w-40 rounded-full border border-blue-400/20 sm:h-48 sm:w-48" />

              {/* CENTRAL SHIELD */}
              <div className="relative flex h-32 w-32 items-center justify-center rounded-[2rem] border border-cyan-300/30 bg-gradient-to-br from-blue-500/25 via-blue-600/15 to-cyan-400/10 shadow-2xl shadow-blue-500/20 sm:h-36 sm:w-36">
                <div className="absolute inset-2 rounded-[1.5rem] border border-white/5" />
                <ShieldCheck
                  size={76}
                  strokeWidth={1.3}
                  className="text-cyan-300 drop-shadow-[0_0_18px_rgba(34,211,238,0.35)]"
                />
              </div>

              {/* FLOATING ICONS */}
              <div className="absolute left-[8%] top-[18%] flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-400/20 bg-slate-900 shadow-xl">
                <Globe size={23} className="text-blue-300" />
              </div>

              <div className="absolute right-[8%] top-[22%] flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-slate-900 shadow-xl">
                <ScanSearch size={23} className="text-cyan-300" />
              </div>

              <div className="absolute bottom-[8%] left-[20%] flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-slate-900 shadow-xl">
                <CheckCircle2 size={22} className="text-emerald-300" />
              </div>

              <div className="absolute bottom-[8%] right-[20%] flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-400/20 bg-slate-900 shadow-xl">
                <Activity size={22} className="text-blue-300" />
              </div>
            </div>

            {/* PANEL HEADING */}
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
                Browse smarter.
                <br />
                <span className="text-cyan-300">
                  Stay one step ahead.
                </span>
              </h2>

              <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-slate-400">
                PhishGuard is designed to help users identify suspicious URLs
                and understand common web phishing risks.
              </p>
            </div>

            {/* FEATURE CARDS */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-blue-400/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                  <ScanSearch size={21} />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">
                  URL Scanning
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  A planned interface for checking suspicious web addresses.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-cyan-400/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <ShieldCheck size={21} />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Threat Insights
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  A planned view of detection results and security indicators.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-emerald-400/30">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <Activity size={21} />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">
                  Scan History
                </h3>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  A planned area for reviewing previous URL scan records.
                </p>
              </div>
            </div>

            {/* FOOTER */}
            <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-5 text-xs text-slate-500">
              <span>Built for safer browsing awareness</span>
              <span>React · Tailwind CSS</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
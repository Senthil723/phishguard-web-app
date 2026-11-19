
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { registerUser } from "../services/api.js";

function Signup() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSignup(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const username = form.username.trim();
    const email = form.email.trim();

    if (!username || !email || !form.password) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password.length < 12) {
      setError("Your password must be at least 12 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await registerUser({
        username,
        email,
        password: form.password,
      });

      setForm({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      navigate("/", {
        replace: true,
        state: {
          registrationSuccess: true,
        },
      });
    } catch (err) {
      if (err.status === 409) {
        setError(
          "This username or email is already registered."
        );
      } else if (err.status === 422) {
        setError(
          "Please check your username, email, and password."
        );
      } else if (err.kind === "network") {
        setError(
          "Cannot connect to the PhishGuard server."
        );
      } else {
        setError(
          err.message ||
            "Account creation failed. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60";

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT CYBERSECURITY PANEL */}

        <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#07152d] p-12 text-white lg:flex">

          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(37,99,235,0.28),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(6,182,212,0.18),transparent_40%)]" />

          <Link
            to="/"
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400">
              <ShieldCheck size={25} />
            </div>

            <div>
              <div className="text-xl font-bold">
                Phish
                <span className="text-cyan-300">
                  Guard
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Web security workspace
              </p>
            </div>
          </Link>

          <motion.div
            initial={
              reduceMotion
                ? false
                : { opacity: 0, y: 24 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 mx-auto max-w-md"
          >
            <div className="mb-8 flex justify-center">
              <motion.div
                animate={
                  reduceMotion
                    ? undefined
                    : { y: [0, -10, 0] }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-40 w-40 items-center justify-center rounded-[2.5rem] border border-cyan-300/30 bg-gradient-to-br from-blue-500/30 to-cyan-400/10 shadow-[0_0_90px_rgba(34,211,238,0.15)]"
              >
                <ShieldCheck
                  size={88}
                  strokeWidth={1.2}
                  className="text-cyan-200"
                />
              </motion.div>
            </div>

            <h1 className="text-center text-4xl font-bold leading-tight tracking-tight">
              Start your
              <br />
              <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                security journey.
              </span>
            </h1>

            <p className="mt-5 text-center text-sm leading-7 text-slate-300">
              Create your workspace to investigate suspicious
              URLs, review your scan history, and develop
              safer browsing habits.
            </p>

            <div className="mt-10 space-y-4">
              {[
                "Private scan history for your account",
                "Machine-learning-assisted URL assessments",
                "Reports and security awareness insights",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-3 text-sm text-slate-200"
                >
                  <CheckCircle2
                    size={19}
                    className="shrink-0 text-cyan-300"
                  />
                  {feature}
                </div>
              ))}
            </div>
          </motion.div>

          <p className="relative z-10 text-xs text-slate-400">
            PhishGuard · Educational cybersecurity prototype
          </p>
        </section>

        {/* RIGHT REGISTRATION FORM */}

        <section className="flex min-h-screen items-center justify-center px-5 py-12 sm:px-10 lg:px-14">

          <motion.div
            initial={
              reduceMotion
                ? false
                : { opacity: 0, y: 18 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >

            {/* Mobile branding */}

            <Link
              to="/"
              className="mb-8 inline-flex items-center gap-3 lg:hidden"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <ShieldCheck size={25} />
              </span>

              <span className="text-xl font-bold">
                Phish
                <span className="text-blue-600">
                  Guard
                </span>
              </span>
            </Link>

            <div className="mb-7">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                <ShieldCheck size={14} />
                Create your secure workspace
              </div>

              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Create an account
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Join PhishGuard and start tracking your URL
                assessments.
              </p>
            </div>

            <form
              onSubmit={handleSignup}
              className="space-y-4"
            >

              {/* Username */}

              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="Choose a username"
                    value={form.username}
                    onChange={updateField}
                    disabled={isSubmitting}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Email */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={updateField}
                    disabled={isSubmitting}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="signup-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="signup-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 12 characters"
                    value={form.password}
                    onChange={updateField}
                    disabled={isSubmitting}
                    required
                    minLength={12}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={updateField}
                    disabled={isSubmitting}
                    required
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((value) => !value)
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirmation password"
                        : "Show confirmation password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Registration errors */}

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Submit */}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={
                  reduceMotion || isSubmitting
                    ? undefined
                    : { y: -1 }
                }
                whileTap={
                  reduceMotion || isSubmitting
                    ? undefined
                    : { scale: 0.99 }
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-600 hover:to-cyan-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Creating account..."
                  : "Create account"}

                <ArrowRight size={18} />
              </motion.button>
            </form>

            {/* Sign in link */}

            <p className="mt-7 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link
                to="/"
                className="font-semibold text-blue-700 hover:underline"
              >
                Sign in
              </Link>
            </p>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              PhishGuard provides ML-assisted URL assessments,
              not guaranteed detection of malicious websites.
            </p>

          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default Signup;


import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  LockKeyhole,
  Mail,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";

import { loginUser } from "./services/api.js";

const entrance = {
  hidden: {
    opacity: 0,
    y: 18,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  // ---------------------------------------
  // REAL LOGIN USING FASTAPI
  // ---------------------------------------

  async function handleLogin(event) {
    event.preventDefault();

    const username = identifier.trim();

    if (!username || !password) {
      setMessage("Enter your username and password to continue.");
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await loginUser({
        username,
        password,
        rememberMe,
      });

      setPassword("");

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
      if (error.status === 401) {
        setMessage("Invalid username or password.");
      } else if (error.status === 403) {
        setMessage(
          "Login was blocked by the server. Please check the backend configuration."
        );
      } else if (error.kind === "network") {
        setMessage(
          "Cannot connect to the PhishGuard server. Make sure the backend is running."
        );
      } else {
        setMessage(
          error.message || "Unable to sign in. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.02fr_0.98fr]">

        {/* =====================================
            LEFT CYBERSECURITY VISUAL PANEL
        ===================================== */}

        <section className="relative isolate hidden min-h-screen overflow-hidden bg-[#07152d] px-10 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-14">

          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_15%,rgba(37,99,235,0.34),transparent_42%),radial-gradient(ellipse_at_85%_80%,rgba(6,182,212,0.2),transparent_38%)]" />

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 top-16 h-80 w-80 rounded-full bg-blue-500/15 blur-3xl"
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, -18, 0],
                    y: [0, 20, 0],
                  }
            }
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
            animate={
              reduceMotion
                ? undefined
                : {
                    x: [0, 22, 0],
                    y: [0, -14, 0],
                  }
            }
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Branding */}

          <motion.div
            variants={entrance}
            initial="hidden"
            animate="show"
            className="relative z-10 flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-cyan-950/30">
              <ShieldCheck size={25} strokeWidth={2} />
            </div>

            <div>
              <div className="text-xl font-bold tracking-tight">
                Phish
                <span className="text-cyan-300">
                  Guard
                </span>
              </div>

              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                Web security workspace
              </div>
            </div>
          </motion.div>

          {/* Main security illustration */}

          <div className="relative z-10 mx-auto w-full max-w-xl py-12">

            <div className="relative mx-auto mb-12 flex h-64 max-w-md items-center justify-center sm:h-72">

              {[244, 198, 150].map((size, index) => (
                <motion.div
                  key={size}
                  aria-hidden="true"
                  className="absolute rounded-full border border-cyan-300/20"
                  style={{
                    width: size,
                    height: size,
                  }}
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          rotate: index % 2 ? -360 : 360,
                          scale: [1, 1.025, 1],
                        }
                  }
                  transition={{
                    rotate: {
                      duration: 35 + index * 12,
                      repeat: Infinity,
                      ease: "linear",
                    },
                    scale: {
                      duration: 5 + index,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                />
              ))}

              <motion.div
                className="relative flex h-32 w-32 items-center justify-center rounded-[2.25rem] border border-cyan-200/40 bg-gradient-to-br from-blue-500/35 via-blue-600/20 to-cyan-300/10 shadow-[0_0_80px_rgba(34,211,238,0.16)] sm:h-36 sm:w-36"
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        y: [0, -7, 0],
                      }
                }
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <div className="absolute inset-2 rounded-[1.8rem] border border-white/10" />

                <ShieldCheck
                  size={76}
                  strokeWidth={1.25}
                  className="text-cyan-200 drop-shadow-[0_0_20px_rgba(103,232,249,0.45)]"
                />
              </motion.div>

              {[
                {
                  Icon: Globe2,
                  position: "left-[5%] top-[16%]",
                  color: "text-blue-200",
                  delay: 0,
                },
                {
                  Icon: ScanSearch,
                  position: "right-[4%] top-[20%]",
                  color: "text-cyan-200",
                  delay: 0.5,
                },
                {
                  Icon: CheckCircle2,
                  position: "bottom-[5%] left-[18%]",
                  color: "text-emerald-300",
                  delay: 1,
                },
                {
                  Icon: Activity,
                  position: "bottom-[7%] right-[17%]",
                  color: "text-blue-200",
                  delay: 1.5,
                },
              ].map(({ Icon, position, color, delay }) => (
                <motion.div
                  key={position}
                  className={`absolute flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#10213c]/90 shadow-xl backdrop-blur ${position}`}
                  animate={
                    reduceMotion
                      ? undefined
                      : {
                          y: [0, -8, 0],
                          rotate: [0, 2, 0],
                        }
                  }
                  transition={{
                    duration: 4.5,
                    delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Icon size={22} className={color} />
                </motion.div>
              ))}
            </div>

            {/* Main heading */}

            <motion.div
              variants={entrance}
              initial="hidden"
              animate="show"
              className="text-center"
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-medium text-cyan-200">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                Security starts with awareness
              </div>

              <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl xl:text-[2.65rem]">
                Browse smarter.
                <br />
                <span className="bg-gradient-to-r from-blue-300 to-cyan-200 bg-clip-text text-transparent">
                  Stay one step ahead.
                </span>
              </h1>

            </motion.div>
          </div>
        </section>

        {/* =====================================
            RIGHT LOGIN FORM PANEL
        ===================================== */}

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-16">

          <motion.div
            variants={entrance}
            initial="hidden"
            animate="show"
            className="w-full max-w-md"
          >

            {/* Mobile branding */}

            <Link
              to="/"
              className="mb-10 inline-flex items-center gap-3 lg:hidden"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
                <ShieldCheck size={25} />
              </span>

              <span className="text-xl font-bold tracking-tight">
                Phish
                <span className="text-blue-600">
                  Guard
                </span>
              </span>
            </Link>

            {/* Login heading */}

            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Welcome back
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Sign in to continue to your PhishGuard workspace.
              </p>
            </div>

            {/* LOGIN FORM */}

            <form
              onSubmit={handleLogin}
              className="space-y-5"
            >

              {/* Username */}

              <div>
                <label
                  htmlFor="identifier"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>

                <div className="group relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                  />

                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="Enter your username"
                    value={identifier}
                    onChange={(event) => {
                      setIdentifier(event.target.value);
                      setMessage("");
                    }}
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">

                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="group relative">

                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    disabled={isSubmitting}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}

              <div className="flex flex-wrap items-center justify-between gap-2">

                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) =>
                      setRememberMe(event.target.checked)
                    }
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                  />
                  Remember me
                </label>

                <span className="text-xs text-slate-400">
                  Stay signed in for up to 30 days
                </span>
              </div>

              {/* Error messages */}

              <AnimatePresence initial={false}>
                {message && (
                  <motion.div
                    key="login-message"
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -4,
                    }}
                    animate={{
                      opacity: 1,
                      height: "auto",
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                    }}
                    role="alert"
                    className="overflow-hidden rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sign In */}

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
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:from-blue-600 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Signing in..." : "Sign in"}

                <ArrowRight
                  size={18}
                  className="transition-transform group-hover:translate-x-1"
                />
              </motion.button>
            </form>

            {/* Signup link */}

<p className="mt-7 text-center text-sm text-slate-600">
  New to PhishGuard?{" "}

  <Link
    to="/signup"
    className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
  >
    Create a new account
  </Link>
</p>


          </motion.div>
        </section>
      </div>
    </main>
  );
}

export default Login;

import { useState } from "react";
import { Link } from "react-router-dom";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";

import { confirmPasswordReset, requestPasswordReset } from "../services/api.js";

function RecoveryCard({ title, description, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-9">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-xl font-bold text-blue-700">
          <ShieldCheck size={25} aria-hidden="true" /> PhishGuard
        </Link>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children}
      </section>
    </main>
  );
}

const inputClass = "w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";
const buttonClass = "w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
    } catch (err) {
      setError(err.message || "Could not request a reset link. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <RecoveryCard title="Forgot password?" description="Enter your account email address. If it is registered, we will send you a link to reset your password.">
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <label htmlFor="recovery-email" className="block text-sm font-semibold">Email address</label>
        <div className="relative">
          <Mail aria-hidden="true" size={18} className="absolute right-4 top-3.5 text-slate-400" />
          <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} placeholder="you@example.com" />
        </div>
        <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Sending..." : "Send reset link"}</button>
      </form>
      {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-800">{message}</p>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Link to="/" className="mt-7 inline-block text-sm font-semibold text-blue-700 hover:underline">Back to sign in</Link>
    </RecoveryCard>
  );
}

export function ResetPassword() {
  const [token] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("token") || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (pending) return;
    if (password.length < 12) {
      setError("Use at least 12 characters for your new password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await confirmPasswordReset(token, password);
      window.history.replaceState(window.history.state, "", window.location.pathname);
      setPassword("");
      setConfirmPassword("");
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Could not reset your password. Request a new link.");
    } finally {
      setPending(false);
    }
  }

  return (
    <RecoveryCard title="Set a new password" description="Choose a new password for your PhishGuard account.">
      {!token ? (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">This reset link is missing a token. Request a new link.</p>
      ) : success ? (
        <p role="status" className="mt-6 rounded-xl bg-green-50 p-3 text-sm text-green-800">Password updated. Sign in with your new password.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <LockKeyhole aria-hidden="true" size={22} className="text-blue-700" />
          <label htmlFor="new-password" className="block text-sm font-semibold">New password</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} />
          <label htmlFor="confirm-new-password" className="block text-sm font-semibold">Confirm new password</label>
          <input id="confirm-new-password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className={inputClass} />
          <button type="submit" disabled={pending} className={buttonClass}>{pending ? "Updating..." : "Update password"}</button>
        </form>
      )}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="mt-7 flex gap-5 text-sm font-semibold text-blue-700">
        <Link to="/" className="hover:underline">Back to sign in</Link>
        <Link to="/forgot-password" className="hover:underline">Request a new link</Link>
      </div>
    </RecoveryCard>
  );
}

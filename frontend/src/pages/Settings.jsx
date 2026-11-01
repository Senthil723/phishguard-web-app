import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  CircleHelp,
  Info,
  Laptop,
  LockKeyhole,
  Monitor,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  Waypoints,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";
import {
  loadPreferences,
  savePreferences,
} from "../utils/preferences";

function PreferenceCard({ icon: Icon, title, description, children }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
      </div>
      <div className="shrink-0 sm:pl-4">{children}</div>
    </article>
  );
}

function SettingSection({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <Icon aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default function Settings() {
  const shouldReduceMotion = useReducedMotion();
  const [initialState] = useState(loadPreferences);
  const [preferences, setPreferences] = useState(initialState.preferences);
  const [feedback, setFeedback] = useState(
    initialState.error || "Preferences are stored on this browser only."
  );
  const [feedbackIsError, setFeedbackIsError] = useState(Boolean(initialState.error));

  function updatePreference(key, value) {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    const result = savePreferences(updated);
    setFeedback(
      result.saved
        ? "Preference saved on this browser."
        : result.error
    );
    setFeedbackIsError(!result.saved);
  }

  const containerVariants = shouldReduceMotion ? undefined : staggerContainer;
  const itemVariants = shouldReduceMotion ? undefined : fadeUp;

  return (
    <motion.main
      variants={containerVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="mx-auto max-w-5xl"
      aria-labelledby="settings-title"
    >
      <motion.header variants={itemVariants} className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Waypoints aria-hidden="true" size={17} />
          Workspace configuration
        </div>
        <h1
          id="settings-title"
          className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Settings
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Configure supported preferences for this browser and review what
          PhishGuard currently provides.
        </p>
      </motion.header>

      <motion.div
        variants={itemVariants}
        className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${
          feedbackIsError
            ? "border-amber-200 bg-amber-50 text-amber-950"
            : "border-cyan-100 bg-cyan-50 text-cyan-950"
        }`}
        role={feedbackIsError ? "alert" : "status"}
        aria-live="polite"
      >
        {feedbackIsError ? (
          <ShieldAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-amber-800" />
        ) : (
          <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-cyan-800" />
        )}
        <p>{feedback}</p>
      </motion.div>

      <div className="space-y-5">
        <motion.div variants={itemVariants}>
          <SettingSection
            icon={Monitor}
            title="Appearance"
            description="PhishGuard currently supports the light appearance throughout the application."
          >
            <PreferenceCard
              icon={Sun}
              title="Light theme"
              description="The active theme used by Settings, navigation, and the rest of the workspace."
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-900">
                <CheckCircle2 aria-hidden="true" size={15} />
                Active
              </span>
            </PreferenceCard>
            <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-600">
              <Moon aria-hidden="true" size={15} className="mt-0.5 shrink-0" />
              Dark theme is not offered because the complete application does not
              yet have a consistent dark color system.
            </p>
          </SettingSection>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SettingSection
            icon={Laptop}
            title="Interface preferences"
            description="Motion accessibility follows your operating-system or browser preference."
          >
            <PreferenceCard
              icon={CircleHelp}
              title="Reduced motion"
              description="When enabled in your OS/browser, PhishGuard reduces interface transitions and entrance animations. This follows the system setting automatically."
            >
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                System controlled
              </span>
            </PreferenceCard>
          </SettingSection>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SettingSection
            icon={Bell}
            title="Notifications"
            description="Control the local confirmation shown after a URL submission is saved."
          >
            <PreferenceCard
              icon={CheckCircle2}
              title="Submission confirmation"
              description="Show the success notice on the Results page after the backend confirms that a submission was saved. This does not indicate phishing analysis."
            >
              <label className="inline-flex cursor-pointer items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  {preferences.showSubmissionConfirmation ? "On" : "Off"}
                </span>
                <input
                  type="checkbox"
                  checked={preferences.showSubmissionConfirmation}
                  onChange={(event) =>
                    updatePreference(
                      "showSubmissionConfirmation",
                      event.target.checked
                    )
                  }
                  aria-label="Show URL submission confirmation"
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
              </label>
            </PreferenceCard>
            <p className="px-1 text-xs leading-5 text-slate-600">
              Push notifications and email alerts are not connected. Error and
              validation messages remain visible regardless of this preference.
            </p>
          </SettingSection>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SettingSection
            icon={ShieldCheck}
            title="Scanner preferences"
            description="This preference changes URL formatting only; it does not change scanning or provide a security verdict."
          >
            <PreferenceCard
              icon={Waypoints}
              title="Default protocol for URLs"
              description="Used only when a submitted URL does not already specify HTTP or HTTPS. Explicit protocols are preserved."
            >
              <label className="grid gap-1.5 text-xs font-medium text-slate-700">
                Default protocol
                <select
                  value={preferences.defaultProtocol}
                  onChange={(event) =>
                    updatePreference("defaultProtocol", event.target.value)
                  }
                  aria-label="Default URL protocol"
                  className="min-w-36 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10"
                >
                  <option value="https">HTTPS (recommended)</option>
                  <option value="http">HTTP</option>
                </select>
              </label>
            </PreferenceCard>
            <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 p-3 text-xs leading-5 text-amber-950">
              <Info aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              <p>
                PhishGuard saves submitted URL records but does not currently
                perform phishing classification or threat-intelligence checks.
                HTTPS encrypts a connection but does not prove a site is trustworthy.
              </p>
            </div>
          </SettingSection>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SettingSection
            icon={Info}
            title="Application information"
            description="Current implementation and prototype capability details."
          >
            <dl className="grid gap-3 sm:grid-cols-2">
              <InformationItem label="Application" value="PhishGuard" />
              <InformationItem
                label="Description"
                value="Web phishing detection project prototype and URL submission workspace."
              />
              <InformationItem label="Frontend" value="React with Vite" />
              <InformationItem label="Backend" value="Python with FastAPI" />
              <InformationItem label="Detection engine" value="Not connected" />
              <InformationItem
                label="Application version"
                value="Development version; release version not configured"
              />
            </dl>
            <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <LockKeyhole aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-blue-800" />
              <p className="text-sm leading-6 text-blue-950">
                Genuine phishing classification requires integration of a
                trained machine-learning model or a real detection service.
                Current statuses describe saved backend records only.
              </p>
            </div>
          </SettingSection>
        </motion.div>

        <motion.div variants={itemVariants}>
          <SettingSection
            icon={UserRound}
            title="Account management"
            description="Future capability — not available in this prototype."
          >
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm leading-6 text-slate-700">
                Secure sign-in, profile management, and account security
                controls will require a verified authentication service and
                backend support. No password or profile data is collected or
                stored by this page.
              </p>
            </div>
          </SettingSection>
        </motion.div>
      </div>
    </motion.main>
  );
}

function InformationItem({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold leading-6 text-slate-900">
        {value}
      </dd>
    </div>
  );
}

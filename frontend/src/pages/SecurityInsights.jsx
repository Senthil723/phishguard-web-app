import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Eye,
  Globe,
  Link2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Target,
  UserRound,
} from "lucide-react";
import { fadeUp, staggerContainer } from "../animations";

const navigationSections = [
  { href: "#overview", label: "Overview" },
  { href: "#methods", label: "Phishing methods" },
  { href: "#url-red-flags", label: "URL red flags" },
  { href: "#attack-techniques", label: "Attack techniques" },
  { href: "#safety", label: "Safety checklist" },
  { href: "#knowledge-check", label: "Knowledge check" },
];

const phishingMethods = [
  {
    icon: Mail,
    title: "Email phishing",
    body: "A broad message pretends to come from a familiar service and asks many recipients to click a link, open a file, or share information.",
    example: "An unexpected “mailbox full” notice links to a sign-in page.",
  },
  {
    icon: Target,
    title: "Spear phishing",
    body: "A targeted message is tailored to a particular person or team. Details about a role, project, or colleague can make it feel credible.",
    example: "A message mentions a team project and requests a document review.",
  },
  {
    icon: UserRound,
    title: "Whaling",
    body: "A targeted attempt aimed at senior leaders or other high-impact roles, often using authority, confidential requests, or time pressure.",
    example: "A purported executive asks finance to urgently change payment details.",
  },
  {
    icon: Smartphone,
    title: "Smishing",
    body: "Phishing delivered through SMS or messaging apps, often using delivery, account, or payment prompts to encourage a quick tap.",
    example: "An unexpected parcel message asks you to resolve a small delivery fee.",
  },
  {
    icon: Phone,
    title: "Vishing",
    body: "Voice-based social engineering in which a caller impersonates support, a bank, or an authority and pressures someone to disclose information.",
    example: "A caller asks you to read out a one-time sign-in code.",
  },
  {
    icon: Link2,
    title: "Clone phishing",
    body: "A copy of a legitimate-looking message is altered to replace an attachment or link. The familiar appearance may lower suspicion.",
    example: "A follow-up claims an earlier document link was broken and provides a replacement.",
  },
  {
    icon: Building2,
    title: "Business email compromise",
    body: "An attacker impersonates or compromises a business account to influence payments, payroll, or sensitive information. It may not contain an obvious link.",
    example: "A vendor email requests that future payments use a new account.",
  },
];

const urlRedFlags = [
  {
    title: "Misspellings and typosquatting",
    body: "A domain may use a small spelling change, extra letter, or substituted character to resemble a known name. Check the spelling carefully and verify through a trusted source.",
    example: "`paypaI.example.invalid` uses a capital “I” where a lowercase “l” may be expected.",
  },
  {
    title: "Misleading subdomains",
    body: "The registered domain is read from the right-hand side of the hostname. Familiar words earlier in the hostname can be subdomains and do not establish who operates the site.",
    example: "In `accounts.example.com.attacker.invalid`, the hostname ends in `attacker.invalid`; `example.com` appears only as an earlier subdomain label.",
  },
  {
    title: "Unusual paths and parameters",
    body: "Long or unexpected paths, encoded text, and parameters can obscure where a link leads or include tracking and redirect instructions. They deserve context checks, not automatic conclusions.",
    example: "`/session/continue?next=...` may send a visitor to another location.",
  },
  {
    title: "IP-address URLs",
    body: "A link using a numeric IP address instead of a recognizable domain can be unusual for a consumer sign-in page. Some legitimate systems use IPs, so investigate the context.",
    example: "`https://192.0.2.10/sign-in` uses a documentation-only example address.",
  },
  {
    title: "HTTP and HTTPS",
    body: "HTTPS encrypts data in transit between the browser and site, but it does not prove that the site is honest or belongs to the organization it resembles. Phishing sites can use HTTPS too.",
    example: "Check the actual hostname and why the message was sent; do not rely on a padlock alone.",
  },
  {
    title: "Shortened links",
    body: "A short URL hides its eventual destination until followed or safely expanded. Unexpected short links deserve verification through the sender’s known contact channel.",
    example: "If you did not expect the link, do not open it just to discover where it goes.",
  },
  {
    title: "Lookalike characters",
    body: "Some characters from different writing systems can resemble Latin letters. A hostname can look familiar while containing visually confusable characters.",
    example: "Read or copy the hostname carefully; visual appearance alone can be misleading.",
  },
];

const attackTechniques = [
  {
    title: "Fake sign-in pages",
    body: "A page imitates a service’s login flow to persuade a visitor to enter credentials. Navigate through a known bookmark or typed address instead of a message link.",
  },
  {
    title: "Credential harvesting",
    body: "Information entered into a deceptive form may be collected for account takeover. Never share passwords or one-time codes in response to an unsolicited request.",
  },
  {
    title: "Social engineering",
    body: "The message exploits trust, urgency, fear, curiosity, or authority to prompt an action before the recipient has time to verify it.",
  },
  {
    title: "Malicious attachments",
    body: "Unexpected files may contain harmful content or lead to unsafe actions. Verify the sender and context before opening an attachment, even when the display name looks familiar.",
  },
  {
    title: "Redirect abuse",
    body: "A link can pass through one or more redirects before reaching its final destination. A familiar first URL does not always tell you where the browser will end up.",
  },
  {
    title: "Impersonation",
    body: "A sender may copy a person’s name, logo, writing style, or email display name. Verify unusual requests using a separate, previously trusted channel.",
  },
];

const safetyRecommendations = [
  "Verify unexpected requests with the person or organization through a known contact method.",
  "Read the hostname carefully and confirm the registered domain before signing in.",
  "Open important services using a trusted bookmark or an address you type yourself.",
  "Treat unexpected attachments and requests for passwords or one-time codes with caution.",
  "Use multifactor authentication, preferably a phishing-resistant option when available.",
  "Use a reputable password manager; it can help identify when a login domain differs from the saved site.",
  "Report suspicious messages using your organization’s established process or the service’s official reporting channel.",
];

const quizQuestions = [
  {
    prompt: "A message says your account will be closed in ten minutes unless you sign in using its link. What is the safest next step?",
    options: [
      "Open the link quickly so the account stays active.",
      "Use a known bookmark or contact the service through an official channel.",
      "Reply with your password so support can verify you.",
    ],
    answer: 1,
    explanation:
      "Urgency is a pressure tactic, not proof by itself. Avoid the message link and verify the request through a separate route you already trust.",
  },
  {
    prompt: "In the simulated URL `https://accounts.example.com.attacker.invalid/login`, what should you inspect?",
    options: [
      "`example.com`, because it appears earliest in the hostname.",
      "The full hostname; the rightmost domain portion is `attacker.invalid`.",
      "The `/login` path, which proves the page is genuine.",
    ],
    answer: 1,
    explanation:
      "Subdomain labels can include familiar names. Read the hostname from right to left and verify the actual domain. This is a simulated example, not a live threat report.",
  },
  {
    prompt: "What does HTTPS tell you about a website?",
    options: [
      "The site is safe because it has encrypted traffic.",
      "The site is operated by the organization it names.",
      "The connection is encrypted, but HTTPS alone does not establish trust.",
    ],
    answer: 2,
    explanation:
      "HTTPS protects the connection in transit; it does not validate the site’s intent or prove who operates it. Check the domain and context too.",
  },
  {
    prompt: "An unexpected text includes a shortened link about a delivery fee. What is the best response?",
    options: [
      "Open it to reveal the destination.",
      "Verify the delivery independently through the carrier’s official app or site.",
      "Enter card details only if the page uses HTTPS.",
    ],
    answer: 1,
    explanation:
      "Short links hide their destination, and HTTPS is not a trust guarantee. Use a known official app or address and avoid entering payment details through an unexpected message.",
  },
];

function InfoCard({ icon: Icon, title, children, example }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md motion-reduce:transition-none sm:p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
        <Icon aria-hidden="true" size={21} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
      {example && (
        <p className="mt-3 break-words rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-700">
          <span className="font-semibold text-slate-800">Simulated example: </span>
          {example}
        </p>
      )}
    </article>
  );
}

function KnowledgeCheck() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [complete, setComplete] = useState(false);
  const question = quizQuestions[questionIndex];

  function checkAnswer() {
    if (selectedOption === null || checked) return;
    if (selectedOption === question.answer) {
      setScore((currentScore) => currentScore + 1);
    }
    setChecked(true);
  }

  function continueQuiz() {
    if (!checked) return;
    if (questionIndex === quizQuestions.length - 1) {
      setComplete(true);
      return;
    }
    setQuestionIndex((currentIndex) => currentIndex + 1);
    setSelectedOption(null);
    setChecked(false);
  }

  function resetQuiz() {
    setQuestionIndex(0);
    setSelectedOption(null);
    setChecked(false);
    setScore(0);
    setComplete(false);
  }

  if (complete) {
    return (
      <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-800" size={22} />
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900">Knowledge check complete</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              You selected {score} of {quizQuestions.length} answers correctly.
              Review the explanations above as practical reminders; this quiz
              does not assess or classify real websites.
            </p>
            <button
              type="button"
              onClick={resetQuiz}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-900 transition hover:bg-cyan-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <RotateCcw aria-hidden="true" size={16} />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-slate-800">
          Question {questionIndex + 1} of {quizQuestions.length}
        </span>
        <span className="text-xs text-slate-600">Educational only · No URL is analyzed</span>
      </div>
      <div
        className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-label="Knowledge check progress"
        aria-valuemin={0}
        aria-valuemax={quizQuestions.length}
        aria-valuenow={questionIndex + (checked ? 1 : 0)}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{
            width: `${((questionIndex + (checked ? 1 : 0)) / quizQuestions.length) * 100}%`,
          }}
        />
      </div>

      <fieldset>
        <legend className="max-w-3xl text-sm font-semibold leading-6 text-slate-900 sm:text-base">
          {question.prompt}
        </legend>
        <div className="mt-4 grid gap-2">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrectOption = checked && question.answer === index;
            const isWrongSelection = checked && isSelected && !isCorrectOption;
            const optionStyle = isCorrectOption
              ? "border-cyan-300 bg-cyan-50 text-cyan-950"
              : isWrongSelection
                ? "border-amber-300 bg-amber-50 text-amber-950"
                : isSelected
                  ? "border-blue-400 bg-blue-50 text-blue-950"
                  : "border-slate-200 bg-white text-slate-800 hover:border-blue-300 hover:bg-blue-50/50";

            return (
              <button
                key={option}
                type="button"
                disabled={checked}
                aria-pressed={isSelected}
                onClick={() => setSelectedOption(index)}
                className={`flex w-full min-w-0 items-start gap-3 rounded-xl border p-3 text-left text-sm leading-6 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-default motion-reduce:transition-none ${optionStyle}`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current text-[11px] font-semibold">
                  {isCorrectOption ? (
                    <Check aria-hidden="true" size={13} />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                <span className="min-w-0 break-words">{option}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {checked && (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-lg border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-700"
        >
          <p className="font-semibold text-slate-900">
            {selectedOption === question.answer ? "That’s right." : "Consider this safer approach."}
          </p>
          <p className="mt-1">{question.explanation}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {!checked ? (
          <button
            type="button"
            onClick={checkAnswer}
            disabled={selectedOption === null}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 motion-reduce:transition-none"
          >
            Check answer <ChevronRight aria-hidden="true" size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={continueQuiz}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            {questionIndex === quizQuestions.length - 1 ? "See summary" : "Next question"}
            <ChevronRight aria-hidden="true" size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SecurityInsights() {
  const shouldReduceMotion = useReducedMotion();
  const containerVariants = shouldReduceMotion ? undefined : staggerContainer;
  const itemVariants = shouldReduceMotion ? undefined : fadeUp;

  return (
    <motion.main
      variants={containerVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={shouldReduceMotion ? undefined : "show"}
      className="mx-auto max-w-7xl"
      aria-labelledby="security-insights-title"
    >
      <motion.header variants={itemVariants} className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
          <ShieldCheck aria-hidden="true" size={17} />
          Cybersecurity knowledge centre
        </div>
        <h1
          id="security-insights-title"
          className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
        >
          Security Insights
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
          Learn how common phishing approaches work, what to inspect in a link,
          and how to verify unexpected requests before acting.
        </p>
      </motion.header>

      <motion.nav
        variants={itemVariants}
        aria-label="Security Insights sections"
        className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-2"
      >
        {navigationSections.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 motion-reduce:transition-none sm:text-sm"
          >
            {label}
          </a>
        ))}
      </motion.nav>

      <motion.section
        variants={itemVariants}
        id="overview"
        aria-labelledby="overview-title"
        className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 p-5 sm:p-7"
      >
        <div className="flex items-start gap-3">
          <BookOpen aria-hidden="true" className="mt-0.5 shrink-0 text-blue-700" size={22} />
          <div className="min-w-0">
            <h2 id="overview-title" className="text-lg font-semibold text-slate-950">
              Phishing in brief
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-700">
              Phishing is a form of social engineering in which someone is
              deceived into revealing information, sending money, opening
              content, or taking another action. Messages may arrive through
              email, text, voice calls, or collaboration tools. They can lead
              to account compromise, financial loss, or exposure of sensitive
              information.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                <AlertTriangle aria-hidden="true" size={18} className="text-amber-700" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">Pressure</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">Urgency can discourage careful verification.</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                <Eye aria-hidden="true" size={18} className="text-blue-700" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">Impersonation</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">Familiar names or branding can be copied.</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/80 p-4">
                <ShieldCheck aria-hidden="true" size={18} className="text-cyan-800" />
                <h3 className="mt-2 text-sm font-semibold text-slate-900">Pause and verify</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">Use a trusted, separate route to confirm requests.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        id="methods"
        aria-labelledby="methods-title"
        className="mb-6 scroll-mt-6"
      >
        <SectionHeading
          icon={MessageCircle}
          eyebrow="Recognize the approach"
          title="Common phishing methods"
          description="The channel and level of targeting can differ; the goal is often to prompt an unsafe action."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {phishingMethods.map((method) => (
            <InfoCard
              key={method.title}
              icon={method.icon}
              title={method.title}
              example={method.example}
            >
              {method.body}
            </InfoCard>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        id="url-red-flags"
        aria-labelledby="url-red-flags-title"
        className="mb-6 scroll-mt-6"
      >
        <SectionHeading
          icon={Globe}
          eyebrow="Inspect carefully"
          title="URL and domain awareness"
          description="These characteristics are reasons to pause and verify context—not proof that a URL is malicious."
        />
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="font-semibold text-slate-900">Read the hostname, not just the first familiar word</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            A hostname can contain subdomains before the registered domain.
            The full hostname and its right-hand end matter when checking who
            controls the destination.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-white">
            <code className="whitespace-nowrap">
              https://<span className="text-cyan-300">accounts.example.com</span>
              <span className="font-bold text-amber-300">.attacker.invalid</span>
              /login
            </code>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-600">
            Simulated teaching example only. Here, `accounts.example.com` is
            part of the subdomain text; the hostname ends in `attacker.invalid`.
            The reserved `.invalid` domain is used so the example does not identify a live site.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {urlRedFlags.map((item) => (
            <InfoCard key={item.title} icon={CircleHelp} title={item.title} example={item.example}>
              {item.body}
            </InfoCard>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        id="attack-techniques"
        aria-labelledby="attack-techniques-title"
        className="mb-6 scroll-mt-6"
      >
        <SectionHeading
          icon={Target}
          eyebrow="Understand the objective"
          title="Common attack techniques"
          description="Recognizing the requested action can be as useful as inspecting a link."
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {attackTechniques.map((technique) => (
            <InfoCard key={technique.title} icon={LockKeyhole} title={technique.title}>
              {technique.body}
            </InfoCard>
          ))}
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        id="safety"
        aria-labelledby="safety-title"
        className="mb-6 scroll-mt-6"
      >
        <SectionHeading
          icon={ShieldCheck}
          eyebrow="Practical protection"
          title="A safety checklist"
          description="Small verification habits can reduce risk when a message or request is unexpected."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {safetyRecommendations.map((recommendation) => (
              <li key={recommendation} className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-800">
                  <Check aria-hidden="true" size={15} />
                </span>
                <span className="text-sm leading-6 text-slate-700">{recommendation}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.section>

      <motion.section
        variants={itemVariants}
        id="knowledge-check"
        aria-labelledby="knowledge-check-title"
        className="mb-6 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
      >
        <SectionHeading
          icon={BookOpen}
          eyebrow="Practice what you learned"
          title="Phishing awareness knowledge check"
          description="Answer four simulated questions. Explanations reinforce safe habits; this is not a phishing detection test."
          id="knowledge-check-title"
        />
        <KnowledgeCheck />
      </motion.section>

      <motion.aside
        variants={itemVariants}
        className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6"
        aria-labelledby="prototype-notice-title"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 shrink-0 text-amber-800" size={21} />
          <div className="min-w-0">
            <h2 id="prototype-notice-title" className="font-semibold text-slate-950">
              About PhishGuard’s current capabilities
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              This page provides general educational guidance. PhishGuard’s
              current prototype does not perform live phishing detection or
              query a threat-intelligence service. A suspicious-looking URL is
              a reason to investigate, not proof that a website is malicious;
              a normal-looking URL is not proof that it is safe. HTTPS alone
              does not guarantee trust.
            </p>
            <Link
              to="/scanner"
              className="mt-3 inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-blue-800 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Open URL Scanner
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
            <p className="mt-1 text-xs text-slate-600">
              The scanner saves a URL submission; it does not classify the URL.
            </p>
          </div>
        </div>
      </motion.aside>
    </motion.main>
  );
}

function SectionHeading({ icon: Icon, eyebrow, title, description, id }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
        <Icon aria-hidden="true" size={15} />
        {eyebrow}
      </div>
      <h2 id={id} className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

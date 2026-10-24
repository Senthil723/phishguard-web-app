import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity, BarChart3, ChevronDown, FileSearch, History, LayoutDashboard,
  Menu, Search, Settings, ShieldCheck, X, Lightbulb, Bell, UserRound,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "URL Scanner", to: "/scanner", icon: Search },
  { label: "Scan Results", to: "/results", icon: FileSearch },
  { label: "Scan History", to: "/history", icon: History },
  { label: "Reports & Analytics", to: "/reports", icon: BarChart3 },
  { label: "Security Insights", to: "/insights", icon: Lightbulb },
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const navItems = (mobile = false) => navigation.map(({ label, to, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) => `inline-flex shrink-0 items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] font-medium transition-all duration-200 ${isActive ? "bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"} ${mobile ? "w-full" : ""}`}
    >
      <Icon size={17} strokeWidth={1.9} />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-4 px-4 sm:px-6 xl:px-9">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 lg:hidden"
          ><Menu size={19} /></button>

          <button type="button" onClick={() => navigate("/dashboard")} className="flex shrink-0 items-center gap-3 text-left">
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20">
              <ShieldCheck size={23} strokeWidth={2.1} />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[19px] font-bold tracking-tight text-slate-900">Phish<span className="text-blue-600">Guard</span></span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Security workspace</span>
            </span>
          </button>

          <nav aria-label="Main navigation" className="ml-3 hidden min-w-0 flex-1 flex-wrap items-center gap-1 py-3 lg:flex">
            {navItems()}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 xl:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Prototype mode
            </span>
            <button type="button" aria-label="Notifications" title="Notifications are not connected yet" className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label="Open account menu" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 transition hover:bg-slate-50">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><UserRound size={17} /></span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>
              <AnimatePresence>
                {profileOpen && <motion.div initial={{ opacity: 0, y: -5, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }} className="absolute right-0 top-12 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
                  <button type="button" onClick={() => { setProfileOpen(false); navigate("/settings"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Settings size={16} /> Settings</button>
                  <button type="button" onClick={() => { setProfileOpen(false); navigate("/"); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"><Activity size={16} /> Demo sign out</button>
                  <p className="px-3 pb-1 pt-2 text-[10px] leading-4 text-slate-400">Authentication is not connected.</p>
                </motion.div>}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="hidden border-t border-slate-100 px-4 py-2 md:flex md:gap-1 lg:hidden">
          <div className="flex w-full flex-wrap gap-1">{navItems()}</div>
        </nav>
      </header>

      <AnimatePresence>
        {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden">
          <motion.button aria-label="Close navigation backdrop" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.23, ease: "easeOut" }} className="absolute inset-y-0 left-0 w-[min(88vw,340px)] overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><ShieldCheck size={22} /></span><span className="text-lg font-bold">Phish<span className="text-blue-600">Guard</span></span></div><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button></div>
            <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            <div className="space-y-1">{navItems(true)}</div>
            <div className="mt-8 rounded-xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-semibold text-blue-900">Stay alert online</p><p className="mt-1 text-xs leading-5 text-blue-800/70">Check unfamiliar links carefully before opening them.</p></div>
          </motion.aside>
        </div>}
      </AnimatePresence>

      <div className="mx-auto min-h-[calc(100vh-76px)] max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 xl:px-9">
        <Outlet />
        <footer className="mt-12 flex flex-col justify-between gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row sm:items-center">
          <span>© 2026 PhishGuard · Educational prototype</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-blue-500" /> Demo data only · No live detection</span>
        </footer>
      </div>
    </div>
  );
}

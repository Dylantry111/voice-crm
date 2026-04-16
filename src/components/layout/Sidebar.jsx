import React from "react";
import { LayoutDashboard, Mic, User, CalendarDays, Settings, Download } from "lucide-react";

const icons = {
  dashboard: LayoutDashboard,
  capture: Mic,
  contacts: User,
  calendar: CalendarDays,
  settings: Settings,
  export: Download,
};

export default function Sidebar({ view, setView, testsPass }) {
  const navItems = [
    ["dashboard", "Dashboard"],
    ["capture", "Capture"],
    ["contacts", "Contacts"],
    ["calendar", "Calendar"],
    ["settings", "Settings"],
    ["export", "Export"],
  ];

  return (
    <>
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:hidden">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-900">Workspace</div>
          <div className="text-[11px] text-slate-500">
            Self-tests{" "}
            <span className={testsPass ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
              {testsPass ? "passing" : "failing"}
            </span>
          </div>
        </div>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {navItems.map(([key, label]) => {
            const Icon = icons[key];
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  view === key ? "bg-slate-900 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:block md:p-4">
        <nav className="space-y-2">
          {navItems.map(([key, label]) => {
            const Icon = icons[key];
            return (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  view === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Core value</div>
          <div className="mt-2 text-sm text-slate-700">
            Replace scattered notes, personal contacts, and manual follow-up with one client workspace.
          </div>
        </div>

        <div className="mt-4 rounded-3xl border border-slate-200 p-4 text-xs text-slate-500">
          Self-tests{" "}
          <span className={testsPass ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
            {testsPass ? "passing" : "failing"}
          </span>
        </div>
      </aside>
    </>
  );
}

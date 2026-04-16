import React from "react";
import { Mic, User, CalendarDays, Download, Settings, LayoutDashboard } from "lucide-react";
import { classNames } from "../../lib/contactUtils";

const ICONS = {
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
    <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
      <nav className="space-y-2">
        {navItems.map(([key, label]) => {
          const Icon = ICONS[key];
          return (
            <button
              key={key}
              onClick={() => setView(key)}
              className={classNames(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition",
                view === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50"
              )}
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
  );
}

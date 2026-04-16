import React from "react";
import { Download, Mail, User, ChevronRight } from "lucide-react";

export default function ExportPage() {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Export and email</div>
        <div className="mt-2 text-sm text-slate-500">A strong trust feature: users can always take their client database with them.</div>
        <div className="mt-6 space-y-3">
          {[
            [Download, "Export CSV", "For spreadsheet or CRM import"],
            [Mail, "Email to myself", "Quick backup and handoff"],
            [User, "Export contacts card (.vcf)", "Optional handoff to phone contacts"],
          ].map(([Icon, title, desc]) => (
            <button key={title} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 p-4 text-left hover:border-slate-300">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-slate-500" />
                <div>
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-slate-500">{desc}</div>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">What makes this sellable</div>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">1. Faster than notes + contacts + calendar</div>
            <div className="mt-1">One input replaces three separate tools.</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">2. Better than phone contacts</div>
            <div className="mt-1">Each client record includes notes, status, tags, touchpoints, meetings, and bookings.</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="font-semibold text-slate-900">3. Clean work / life separation</div>
            <div className="mt-1">Users keep personal contacts private while still calling and messaging clients instantly.</div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from "react";
import { Mic, Sparkles, CheckCircle2, Save, CalendarPlus, AlertTriangle } from "lucide-react";

function DuplicateBanner({ duplicateCheck }) {
  if (!duplicateCheck?.hasDuplicate) return null;
  return (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="font-semibold">Possible duplicate detected</div>
          <div className="mt-1">
            {duplicateCheck.matches.map((item) => `${item.contact.name} (${item.reasons.join(", ")})`).join(" · ")}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CapturePage({
  voiceInput,
  setVoiceInput,
  draft,
  setDraft,
  duplicateCheck,
  onHandleFill,
  onSaveContact,
  onSaveContactAndAddBooking,
}) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">1. Capture by voice</div>
              <div className="text-sm text-slate-500">
                Speak once, then let the system structure the customer record while still keeping the full note.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Capture</div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Mic className="h-3.5 w-3.5" />
              Voice transcript
            </label>
            <textarea
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              className="min-h-[180px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={onHandleFill} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                <Sparkles className="h-4 w-4" />
                Fill structured record
              </button>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Full original note is always kept
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="text-lg font-semibold">2. Structured record</div>
          <div className="mt-1 text-sm text-slate-500">
            Save the contact first, then optionally continue straight into booking creation in a modal.
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              ["Name", "name"],
              ["Phone", "phone"],
              ["Email", "email"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</label>
                <input
                  value={draft[key] || ""}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</label>
              <input
                value={draft.address || ""}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Requirement</label>
              <input
                value={draft.requirement || ""}
                onChange={(e) => setDraft({ ...draft, requirement: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</label>
              <textarea
                value={draft.notes || ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none"
              />
            </div>
          </div>

          <DuplicateBanner duplicateCheck={duplicateCheck} />

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button onClick={onSaveContact} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800">
              <Save className="h-4 w-4" />
              Save Contact
            </button>
            <button onClick={onSaveContactAndAddBooking} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
              <CalendarPlus className="h-4 w-4" />
              Save + Add Booking
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-800">Save + Add Booking flow</div>
            <div className="mt-1">
              This action saves the contact first, then opens the booking modal so you can create the appointment without scrolling through the page.
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

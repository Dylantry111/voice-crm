import React from "react";
import { Mic, Sparkles, CheckCircle2, CalendarDays, Save } from "lucide-react";
import DayTimeline from "../components/bookings/DayTimeline";
import { formatSelectedDateLabel } from "../lib/dateUtils";
import { classNames } from "../lib/contactUtils";

export default function CapturePage({
  voiceInput,
  setVoiceInput,
  draft,
  setDraft,
  eventTypes,
  selectedEventType,
  setSelectedEventType,
  selectedDate,
  selectedSlot,
  bookings,
  contacts,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
  onHandleFill,
  onSaveLead,
}) {
  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">1. Capture by voice</div>
              <div className="text-sm text-slate-500">
                Speak once, then let the system structure the customer record while still keeping the full note.
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Demo flow</div>
          </div>

          <div className="mt-5 rounded-3xl border border-slate-200 p-4">
            <label className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Mic className="h-3.5 w-3.5" />
              Voice transcript
            </label>
            <textarea
              value={voiceInput}
              onChange={(e) => setVoiceInput(e.target.value)}
              className="min-h-[150px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none focus:border-slate-400"
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
            This input creates a searchable work contact, notes, and a booking-ready record.
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
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Requirement</label>
              <input
                value={draft.requirement}
                onChange={(e) => setDraft({ ...draft, requirement: e.target.value })}
                className="mt-1 h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="mt-1 min-h-[120px] w-full rounded-2xl border border-slate-200 p-4 text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="text-lg font-semibold">3. Booking with event type</div>
          <div className="mt-1 text-sm text-slate-500">
            Choose a job type, then pick a date and start time.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {eventTypes.map((e) => (
              <button
                key={e.id}
                onClick={() => setSelectedEventType(e)}
                className={classNames(
                  "rounded-2xl px-3 py-2 text-sm font-medium",
                  selectedEventType.name === e.name ? e.color : "border border-slate-200 bg-white text-slate-700"
                )}
              >
                {e.name} · {e.minutes}m
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-medium">Selected slot</div>
            <div className="mt-2 text-sm text-slate-600">
              {formatSelectedDateLabel(selectedDate)} · {selectedSlot} · {selectedEventType.name}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={onSaveLead} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
                <Save className="h-4 w-4" />
                Save contact + booking
              </button>
              <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium">
                <CalendarDays className="h-4 w-4" />
                Sync calendar
              </button>
            </div>
          </div>
        </div>

        <DayTimeline
          selectedEventType={selectedEventType}
          selectedDate={selectedDate}
          eventTypes={eventTypes}
          bookings={bookings}
          contacts={contacts}
          onPrevDay={onPrevDay}
          onToday={onToday}
          onNextDay={onNextDay}
          onPickSlot={onPickSlot}
        />
      </section>
    </>
  );
}

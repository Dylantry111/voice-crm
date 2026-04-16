import React from "react";
import DayTimeline from "../components/bookings/DayTimeline";

export default function CalendarPage(props) {
  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Calendar workflow</div>
            <div className="mt-1 text-sm text-slate-500">
              One day per page. Start time only. Event type decides duration.
            </div>
          </div>
          <button className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Connect Google Calendar
          </button>
        </div>
      </section>

      <DayTimeline {...props} />
    </section>
  );
}

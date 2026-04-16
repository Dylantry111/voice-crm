import React from "react";

export default function DashboardPage({ contacts, bookings, selectedDate }) {
  const todayKey = new Date(selectedDate).toDateString();
  const bookingsToday = bookings.filter((b) => new Date(b.start_time).toDateString() === todayKey);

  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">Contacts</div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">{contacts.length}</div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">Bookings on selected day</div>
        <div className="mt-2 text-3xl font-semibold text-slate-900">{bookingsToday.length}</div>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-sm text-slate-500">Recent customer</div>
        <div className="mt-2 text-lg font-semibold text-slate-900">{contacts[0]?.name || "None yet"}</div>
      </div>
    </section>
  );
}

import React from "react";

function SmallStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

export default function DashboardPage({ contacts, bookings }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SmallStat label="Total Contacts" value={contacts.length} />
      <SmallStat label="Total Bookings" value={bookings.length} />
      <SmallStat label="Open Leads" value={contacts.filter((c) => !["Won", "Lost", "Closed"].includes(c.status)).length} />
      <SmallStat label="Quoted" value={contacts.filter((c) => c.status === "Quoted").length} />
    </section>
  );
}

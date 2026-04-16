import React from "react";
import { formatSlotTimeRange } from "../lib/dateUtils";

function SmallStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function withinNext7Days(dateValue) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + 7);
  const d = new Date(dateValue);
  return d >= now && d <= future;
}

function weekdayLabel(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-NZ", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function DashboardPage({ contacts, bookings, intakeShare }) {
  const upcomingBookings = bookings
    .filter((booking) => withinNext7Days(booking.start_time))
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map((booking) => {
      const contact = contacts.find((c) => c.id === booking.contact_id);
      return {
        ...booking,
        contactName: contact?.name || "Booked Contact",
        address: contact?.address || "No address",
      };
    });

  const followUpQueue = contacts.filter((contact) => {
    const tags = Array.isArray(contact.tags) ? contact.tags : [];
    return tags.includes("Follow-up Needed");
  });

  return (
    <section className="space-y-6">
      {intakeShare?.isOpen ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-lg font-semibold">Share QR Code</div>
              <div className="mt-2 text-sm text-slate-500">
                Customers who scan this QR code will open your intake page and submit their information into your own workspace.
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 break-all">
                {intakeShare.link || "No intake link generated yet."}
              </div>
            </div>

            {intakeShare.qrImageUrl ? (
              <img
                src={intakeShare.qrImageUrl}
                alt="Customer intake QR code"
                className="h-56 w-56 rounded-2xl border border-slate-200 bg-white p-3"
              />
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                QR code unavailable.
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <button onClick={intakeShare.onClose} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Close
            </button>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SmallStat label="Total Contacts" value={contacts.length} />
        <SmallStat label="Total Bookings" value={bookings.length} />
        <SmallStat label="Next 7 Days" value={upcomingBookings.length} />
        <SmallStat label="Follow-up Queue" value={followUpQueue.length} />
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Customer Intake</div>
          <button
            onClick={intakeShare?.onOpen}
            className="mt-3 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Share QR Code
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Next 7 Days</div>
          <div className="mt-2 text-sm text-slate-500">
            Upcoming bookings shown as a to-do style list.
          </div>

          <div className="mt-5 space-y-3">
            {upcomingBookings.length ? (
              upcomingBookings.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">
                    {weekdayLabel(item.start_time)} · {formatSlotTimeRange(item.start_time, item.end_time)} · {item.event_type}
                  </div>
                  <div className="mt-1 text-sm text-slate-700">{item.contactName}</div>
                  <div className="mt-1 text-xs text-slate-500">{item.address}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No bookings scheduled in the next 7 days.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold">Follow-up Queue</div>
          <div className="mt-2 text-sm text-slate-500">
            Customers tagged as needing follow-up.
          </div>

          <div className="mt-5 space-y-3">
            {followUpQueue.length ? (
              followUpQueue.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{contact.status || "New Lead"}</div>
                  <div className="mt-1 text-xs text-slate-500">{contact.phone || contact.email || "No contact detail"}</div>
                  <div className="mt-1 text-xs text-slate-500">{contact.address || "No address"}</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No customers currently marked for follow-up.
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

import React, { useMemo, useState } from "react";
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

export default function DashboardPage({ contacts, bookings, tagOptions, intakeShare }) {
  const [dashboardTagFilter, setDashboardTagFilter] = useState("");

  const upcomingBookings = useMemo(() => {
    return bookings
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
  }, [bookings, contacts]);

  const contactsWithoutUpcomingBooking = useMemo(() => {
    return contacts.filter((contact) => {
      const hasUpcoming = bookings.some(
        (booking) =>
          booking.contact_id === contact.id &&
          new Date(booking.end_time) >= new Date()
      );
      if (hasUpcoming) return false;

      if (dashboardTagFilter) {
        return Array.isArray(contact.tags) && contact.tags.includes(dashboardTagFilter);
      }
      return true;
    });
  }, [contacts, bookings, dashboardTagFilter]);

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
            <button onClick={intakeShare.onRefresh} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800">
              Refresh QR
            </button>
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
        <SmallStat label="Unscheduled Contacts" value={contactsWithoutUpcomingBooking.length} />
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
          <div className="text-lg font-semibold">Unscheduled Contacts</div>
          <div className="mt-2 text-sm text-slate-500">
            Customers without an upcoming booking. Use the tag filter to focus your next actions.
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Tag Filter</label>
            <select
              value={dashboardTagFilter}
              onChange={(e) => setDashboardTagFilter(e.target.value)}
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            >
              <option value="">All unscheduled contacts</option>
              {tagOptions.map((tag) => (
                <option key={tag.id} value={tag.name}>{tag.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-5 space-y-3">
            {contactsWithoutUpcomingBooking.length ? (
              contactsWithoutUpcomingBooking.map((contact) => (
                <div key={contact.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{contact.phone || contact.email || "No contact detail"}</div>
                  <div className="mt-1 text-xs text-slate-500">{contact.address || "No address"}</div>
                  <div className="mt-2 text-xs text-slate-600">
                    Tags: {Array.isArray(contact.tags) && contact.tags.length ? contact.tags.join(", ") : "None"}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No matching unscheduled contacts.
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

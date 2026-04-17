import React, { useMemo, useState } from "react";
import { formatSlotTimeRange } from "../lib/dateUtils";

function SmallStat({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">{value}</div>
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

export default function DashboardPage({
  contacts,
  bookings,
  intakeShare,
  onOpenContact,
  onEditBooking,
  onDeleteBooking,
}) {
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const upcomingBookings = useMemo(() => (
    bookings
      .filter((booking) => withinNext7Days(booking.start_time))
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      .map((booking) => {
        const contact = contacts.find((c) => c.id === booking.contact_id);
        return {
          ...booking,
          contactName: contact?.name || "Booked Contact",
          address: booking.location_address || contact?.address || "No address",
        };
      })
  ), [bookings, contacts]);

  const followUpQueue = useMemo(() => (
    contacts.filter((contact) => {
      const tags = Array.isArray(contact.tags) ? contact.tags : [];
      return tags.includes("Follow-up Needed");
    })
  ), [contacts]);

  return (
    <section className="space-y-5 md:space-y-6">
      {intakeShare?.isOpen ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">Share QR Code</div>
              <div className="mt-2 text-sm text-slate-500">
                Customers who scan this QR code will open your intake page and submit their information into your workspace.
              </div>
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 break-all">
                {intakeShare.link || "No intake link generated yet."}
              </div>
            </div>

            {intakeShare.qrImageUrl ? (
              <img
                src={intakeShare.qrImageUrl}
                alt="Customer intake QR code"
                className="mx-auto h-52 w-52 rounded-2xl border border-slate-200 bg-white p-3 md:mx-0 md:h-56 md:w-56"
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

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SmallStat label="Total Contacts" value={contacts.length} />
        <SmallStat label="Total Bookings" value={bookings.length} />
        <SmallStat label="Next 7 Days" value={upcomingBookings.length} />
        <SmallStat label="Follow-up Queue" value={followUpQueue.length} />
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="text-xs uppercase tracking-wide text-slate-500">Customer Intake</div>
          <button
            onClick={intakeShare?.onOpen}
            className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
          >
            Share QR Code
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="text-lg font-semibold">Next 7 Days</div>
          <div className="mt-2 text-sm text-slate-500">
            Upcoming bookings shown as a to-do style list.
          </div>

          <div className="mt-5 space-y-3">
            {upcomingBookings.length ? (
              upcomingBookings.map((item) => {
                const active = selectedBookingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 transition ${
                      active ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white"
                    }`}
                  >
                    <button onClick={() => setSelectedBookingId(item.id)} className="w-full text-left">
                      <div className="text-sm font-semibold text-slate-900">
                        {weekdayLabel(item.start_time)} · {formatSlotTimeRange(item.start_time, item.end_time)}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">{item.event_type} · {item.contactName}</div>
                      <div className="mt-1 text-xs text-slate-500">{item.address}</div>
                    </button>
                    {active ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onEditBooking(item)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteBooking(item.id)}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                No bookings scheduled in the next 7 days.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="text-lg font-semibold">Follow-up Queue</div>
          <div className="mt-2 text-sm text-slate-500">
            Customers tagged as needing follow-up.
          </div>

          <div className="mt-5 space-y-3">
            {followUpQueue.length ? (
              followUpQueue.map((contact) => {
                const active = selectedContactId === contact.id;
                return (
                  <div
                    key={contact.id}
                    className={`rounded-2xl border p-4 transition ${
                      active ? "border-slate-900 bg-slate-100" : "border-slate-200 bg-white"
                    }`}
                  >
                    <button onClick={() => setSelectedContactId(contact.id)} className="w-full text-left">
                      <div className="text-sm font-semibold text-slate-900">{contact.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{contact.status || "New Lead"}</div>
                      <div className="mt-1 text-xs text-slate-500">{contact.phone || contact.email || "No contact detail"}</div>
                      <div className="mt-1 text-xs text-slate-500">{contact.address || "No address"}</div>
                    </button>
                    {active ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => onOpenContact(contact)}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                        >
                          Open
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
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

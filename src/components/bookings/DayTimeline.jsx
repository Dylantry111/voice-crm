import React from "react";
import { ALL_TIME_SLOTS } from "../../lib/constants";
import { formatDateKey, formatHeaderDate, formatSlotTimeRange } from "../../lib/dateUtils";

function bookingStartSlot(booking) {
  const start = new Date(booking.start_time);
  const end = new Date(start.getTime() + 30 * 60000);
  return formatSlotTimeRange(start, end);
}

function buildBookingMeta(booking, contacts) {
  const contact = contacts.find((c) => c.id === booking.contact_id);
  return {
    ...booking,
    who: contact?.name || "Booked Contact",
    where: contact?.address || "Address not provided",
    timeLabel: formatSlotTimeRange(booking.start_time, booking.end_time),
  };
}

export default function DayTimeline({
  selectedDate,
  selectedSlot,
  selectedBookingId,
  bookings,
  contacts,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
  onPickBooking,
  onCreateBooking,
  onEditBooking,
  onDeleteBooking,
}) {
  const dateKey = formatDateKey(selectedDate);

  const bookingsForDay = bookings
    .filter((b) => formatDateKey(b.start_time) === dateKey)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map((b) => buildBookingMeta(b, contacts));

  const coveredSlots = new Set();
  const bookingStartsBySlot = new Map();

  bookingsForDay.forEach((booking) => {
    const startLabel = bookingStartSlot(booking);
    const startIndex = ALL_TIME_SLOTS.indexOf(startLabel);
    if (startIndex < 0) return;

    const durationMinutes = Math.max(30, Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / 60000));
    const steps = Math.max(1, Math.ceil(durationMinutes / 30));

    bookingStartsBySlot.set(ALL_TIME_SLOTS[startIndex], { booking, steps });
    for (let i = 1; i < steps; i += 1) {
      if (ALL_TIME_SLOTS[startIndex + i]) coveredSlots.add(ALL_TIME_SLOTS[startIndex + i]);
    }
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{formatHeaderDate(selectedDate)}</div>
          <div className="text-xs text-slate-500">Browse bookings and available start times.</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onPrevDay} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Prev Day</button>
        <button onClick={onToday} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
        <button onClick={onNextDay} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Next Day</button>
      </div>

      <div className="mt-4 space-y-2">
        {ALL_TIME_SLOTS.map((slot) => {
          if (coveredSlots.has(slot)) return null;

          const bookingStart = bookingStartsBySlot.get(slot);
          if (bookingStart) {
            const isSelected = selectedBookingId === bookingStart.booking.id;
            return (
              <div
                key={bookingStart.booking.id}
                className={`grid grid-cols-[110px_1fr] gap-3 rounded-2xl p-3 ${isSelected ? "border-2 border-slate-900 bg-slate-100" : "border border-amber-200 bg-amber-50"}`}
              >
                <div className="text-sm font-medium text-slate-700">{bookingStart.booking.timeLabel}</div>
                <div>
                  <button onClick={() => onPickBooking(bookingStart.booking.id)} className="w-full text-left">
                    <div className="text-sm font-semibold text-amber-800">{bookingStart.booking.who}</div>
                    <div className="text-xs text-amber-700">{bookingStart.booking.where}</div>
                    <div className="text-xs text-amber-700">Event Type · {bookingStart.booking.event_type}</div>
                  </button>
                  {isSelected && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => onEditBooking(bookingStart.booking)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800">Edit</button>
                      <button onClick={() => onDeleteBooking(bookingStart.booking.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const isSelected = selectedSlot === slot;
          return (
            <div
              key={slot}
              className={`grid grid-cols-[110px_1fr] gap-3 rounded-2xl p-3 ${isSelected ? "border-2 border-slate-900 bg-slate-100" : "border border-slate-200 bg-white"}`}
            >
              <button onClick={() => onPickSlot(slot)} className="contents">
                <div className="text-sm font-medium text-slate-700">{slot}</div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-900">{isSelected ? "Selected" : "Available"}</div>
                  <div className="text-xs text-slate-500">{isSelected ? "Selected start time" : "Click to select this start time"}</div>
                </div>
              </button>
              {isSelected && (
                <>
                  <div />
                  <div className="mt-1">
                    <button onClick={() => onCreateBooking(slot)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800">
                      Create Booking
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

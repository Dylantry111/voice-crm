import React from "react";
import { ALL_TIME_SLOTS } from "../../lib/constants";
import { formatDateKey, formatHeaderDate, formatSlotTimeRange } from "../../lib/dateUtils";
import { EventBadge } from "../common/Badges";

export default function DayTimeline({
  selectedEventType,
  selectedDate,
  eventTypes,
  bookings,
  contacts,
  onPrevDay,
  onToday,
  onNextDay,
  onPickSlot,
}) {
  const dateKey = formatDateKey(selectedDate);

  const bookingsForDay = bookings
    .filter((booking) => formatDateKey(booking.start_time) === dateKey)
    .map((booking) => {
      const linkedContact = contacts.find((c) => c.id === booking.contact_id);
      return {
        ...booking,
        time: formatSlotTimeRange(booking.start_time, booking.end_time),
        who: linkedContact?.name || "Booked Contact",
        where: linkedContact?.address || "Address not provided",
        type: booking.event_type || "-",
        booked: true,
      };
    });

  const slots = ALL_TIME_SLOTS.map((time) => {
    const bookedMatch = bookingsForDay.find((item) => item.time === time);
    return bookedMatch || { time, booked: false };
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold">{formatHeaderDate(selectedDate)}</div>
          <div className="text-xs text-slate-500">
            Select a start time. Duration follows the event type automatically.
          </div>
        </div>
        <EventBadge type={selectedEventType.name} eventTypes={eventTypes} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onPrevDay} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Prev Day</button>
        <button onClick={onToday} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Today</button>
        <button onClick={onNextDay} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Next Day</button>
      </div>

      <div className="mt-4 space-y-2">
        {slots.map((slot) =>
          slot.booked ? (
            <div key={slot.time} className="grid grid-cols-[110px_1fr] gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-medium text-slate-700">{slot.time}</div>
              <div>
                <div className="text-sm font-semibold text-amber-800">Booked · {slot.who}</div>
                <div className="text-xs text-amber-700">{slot.where}</div>
                <div className="text-xs text-amber-700">Event Type · {slot.type || "-"}</div>
              </div>
            </div>
          ) : (
            <button
              key={slot.time}
              onClick={() => onPickSlot(slot.time)}
              className="grid w-full grid-cols-[110px_1fr] gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-700">{slot.time}</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Available</div>
                <div className="text-xs text-slate-500">Tap to use this slot · {selectedEventType.name}</div>
              </div>
            </button>
          )
        )}
      </div>
    </div>
  );
}

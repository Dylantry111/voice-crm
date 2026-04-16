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
    startDate: new Date(booking.start_time),
    endDate: new Date(booking.end_time),
  };
}

function buildClusters(bookings) {
  const clusters = [];
  bookings.forEach((booking) => {
    const current = clusters[clusters.length - 1];
    if (!current) {
      clusters.push({
        start: booking.startDate,
        end: booking.endDate,
        items: [booking],
      });
      return;
    }

    if (booking.startDate < current.end) {
      current.items.push(booking);
      if (booking.endDate > current.end) current.end = booking.endDate;
    } else {
      clusters.push({
        start: booking.startDate,
        end: booking.endDate,
        items: [booking],
      });
    }
  });
  return clusters;
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

  const clusters = buildClusters(bookingsForDay);
  const coveredSlots = new Set();
  const clusterStartsBySlot = new Map();

  clusters.forEach((cluster, index) => {
    const pseudoStart = {
      start_time: cluster.start.toISOString(),
      end_time: new Date(cluster.start.getTime() + 30 * 60000).toISOString(),
    };
    const startLabel = bookingStartSlot(pseudoStart);
    const startIndex = ALL_TIME_SLOTS.indexOf(startLabel);
    if (startIndex < 0) return;

    const durationMinutes = Math.max(30, Math.round((cluster.end - cluster.start) / 60000));
    const steps = Math.max(1, Math.ceil(durationMinutes / 30));

    clusterStartsBySlot.set(ALL_TIME_SLOTS[startIndex], { cluster, steps, clusterKey: `${cluster.start.toISOString()}-${index}` });
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

          const clusterStart = clusterStartsBySlot.get(slot);
          if (clusterStart) {
            const overlap = clusterStart.cluster.items.length > 1;
            const selectedInCluster = clusterStart.cluster.items.some((item) => item.id === selectedBookingId);

            return (
              <div
                key={clusterStart.clusterKey}
                className={`grid grid-cols-[110px_1fr] gap-3 rounded-2xl p-3 ${
                  selectedInCluster ? "border-2 border-slate-900 bg-slate-100" : overlap ? "border border-rose-200 bg-rose-50" : "border border-amber-200 bg-amber-50"
                }`}
              >
                <div className="text-sm font-medium text-slate-700">
                  {formatSlotTimeRange(clusterStart.cluster.start, clusterStart.cluster.end)}
                </div>
                <div className="space-y-3">
                  {overlap && (
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">
                      Overlap warning · {clusterStart.cluster.items.length} bookings
                    </div>
                  )}

                  {clusterStart.cluster.items.map((item) => {
                    const isSelected = selectedBookingId === item.id;
                    return (
                      <div key={item.id} className={`rounded-2xl p-3 ${isSelected ? "bg-white ring-1 ring-slate-300" : "bg-white/70"}`}>
                        <button onClick={() => onPickBooking(item.id)} className="w-full text-left">
                          <div className="text-sm font-semibold text-slate-900">{item.who}</div>
                          <div className="text-xs text-slate-600">{item.timeLabel} · {item.event_type}</div>
                          <div className="text-xs text-slate-500">{item.where}</div>
                        </button>
                        {isSelected && (
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => onEditBooking(item)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800">Edit</button>
                            <button onClick={() => onDeleteBooking(item.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">Delete</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
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

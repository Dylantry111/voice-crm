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
    where: booking.location_address || contact?.address || "Address not provided",
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
      clusters.push({ start: booking.startDate, end: booking.endDate, items: [booking] });
      return;
    }
    if (booking.startDate < current.end) {
      current.items.push(booking);
      if (booking.endDate > current.end) current.end = booking.endDate;
    } else {
      clusters.push({ start: booking.startDate, end: booking.endDate, items: [booking] });
    }
  });
  return clusters;
}

function clusterMeta(cluster, index) {
  const pseudoStart = {
    start_time: cluster.start.toISOString(),
    end_time: new Date(cluster.start.getTime() + 30 * 60000).toISOString(),
  };
  const startLabel = bookingStartSlot(pseudoStart);
  const startIndex = ALL_TIME_SLOTS.indexOf(startLabel);
  if (startIndex < 0) {
    return {
      cluster,
      clusterKey: `${cluster.start.toISOString()}-${index}`,
      startIndex: -1,
      startSlot: null,
    };
  }
  return {
    cluster,
    clusterKey: `${cluster.start.toISOString()}-${index}`,
    startIndex,
    startSlot: ALL_TIME_SLOTS[startIndex],
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
  onDateChange,
  onPickSlot,
  onPickBooking,
  onCreateBooking,
  onEditBooking,
  onDeleteBooking,
  showAvailability = true,
  createLabel = "Create Booking",
}) {
  const dateKey = formatDateKey(selectedDate);

  const bookingsForDay = bookings
    .filter((b) => formatDateKey(b.start_time) === dateKey)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map((b) => buildBookingMeta(b, contacts));

  const clusters = buildClusters(bookingsForDay).map(clusterMeta);
  const coveredSlots = new Set();

  clusters.forEach(({ cluster, startIndex }) => {
    if (startIndex < 0) return;
    const durationMinutes = Math.max(30, Math.round((cluster.end - cluster.start) / 60000));
    const steps = Math.max(1, Math.ceil(durationMinutes / 30));
    for (let i = 0; i < steps; i += 1) {
      if (ALL_TIME_SLOTS[startIndex + i]) coveredSlots.add(ALL_TIME_SLOTS[startIndex + i]);
    }
  });

  const availableSlots = showAvailability
    ? ALL_TIME_SLOTS.filter((slot) => !coveredSlots.has(slot))
    : [];

  return (
    <div className="timeline-shell">
      <div className="timeline-topbar">
        <div>
          <div className="timeline-title">{formatHeaderDate(selectedDate)}</div>
          <div className="timeline-subtitle">
            {showAvailability
              ? "Booked items first, then quick-pick open times below."
              : "Bookings scheduled for this day."}
          </div>
        </div>
        {onDateChange ? (
          <input
            type="date"
            value={formatDateKey(selectedDate)}
            onChange={(e) => onDateChange(e.target.value)}
            className="timeline-date-input"
          />
        ) : null}
      </div>

      <div className="timeline-nav">
        <button onClick={onPrevDay} className="timeline-nav-btn">Prev</button>
        <button onClick={onToday} className="timeline-nav-btn timeline-nav-btn-primary">Today</button>
        <button onClick={onNextDay} className="timeline-nav-btn">Next</button>
      </div>

      <div className="timeline-stack">
        <div className="timeline-panel">
          <div className="timeline-panel-header">
            <div className="timeline-panel-title">Scheduled</div>
            <div className="timeline-panel-hint">
              {bookingsForDay.length ? `${bookingsForDay.length} booking${bookingsForDay.length > 1 ? "s" : ""}` : "No bookings yet"}
            </div>
          </div>

          <div className="timeline-booking-list">
            {clusters.length ? (
              clusters.map(({ cluster, clusterKey }) => {
                const overlap = cluster.items.length > 1;
                const selectedInCluster = cluster.items.some((item) => item.id === selectedBookingId);

                return (
                  <div
                    key={clusterKey}
                    className={`timeline-booking-group ${selectedInCluster ? "is-selected" : ""} ${overlap ? "is-overlap" : ""}`}
                  >
                    <div className="timeline-booking-range">
                      {formatSlotTimeRange(cluster.start, cluster.end)}
                    </div>

                    <div className="timeline-booking-cards">
                      {overlap ? (
                        <div className="timeline-overlap-badge">
                          Overlap warning · {cluster.items.length} bookings
                        </div>
                      ) : null}

                      {cluster.items.map((item) => {
                        const isSelected = selectedBookingId === item.id;
                        return (
                          <div
                            key={item.id}
                            className={`timeline-booking-card ${isSelected ? "is-active" : ""}`}
                          >
                            <button onClick={() => onPickBooking?.(item.id)} className="timeline-booking-main">
                              <div className="timeline-booking-row">
                                <div className="timeline-booking-name">{item.who}</div>
                                <div className="timeline-booking-time">{item.timeLabel}</div>
                              </div>
                              <div className="timeline-booking-meta">{item.event_type}</div>
                              <div className="timeline-booking-address">{item.where}</div>
                            </button>

                            {isSelected && (onEditBooking || onDeleteBooking) ? (
                              <div className="timeline-booking-actions">
                                {onEditBooking ? (
                                  <button onClick={() => onEditBooking(item)} className="timeline-inline-btn">Edit</button>
                                ) : null}
                                {onDeleteBooking ? (
                                  <button onClick={() => onDeleteBooking(item.id)} className="timeline-inline-btn danger">Delete</button>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="timeline-empty">No bookings scheduled for this day.</div>
            )}
          </div>
        </div>

        {showAvailability ? (
          <div className="timeline-panel">
            <div className="timeline-panel-header">
              <div className="timeline-panel-title">Available Start Times</div>
              <div className="timeline-panel-hint">
                {availableSlots.length ? "Tap a time to prepare a booking." : "No open slot left today"}
              </div>
            </div>

            {availableSlots.length ? (
              <>
                <div className="timeline-slot-grid">
                  {availableSlots.map((slot) => {
                    const isSelected = selectedSlot === slot;
                    return (
                      <button
                        key={slot}
                        onClick={() => onPickSlot?.(slot)}
                        className={`timeline-slot-chip ${isSelected ? "is-selected" : ""}`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>

                {selectedSlot ? (
                  <div className="timeline-selected-bar">
                    <div>
                      <div className="timeline-selected-label">Selected time</div>
                      <div className="timeline-selected-value">{selectedSlot}</div>
                    </div>
                    {onCreateBooking ? (
                      <button onClick={() => onCreateBooking(selectedSlot)} className="timeline-create-btn">
                        {createLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="timeline-empty">No available start times for this day.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

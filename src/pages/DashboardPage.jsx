import React, { useMemo, useState } from "react";
import { formatSlotTimeRange } from "../lib/dateUtils";

function SmallStat({ label, value, hint, action }) {
  return (
    <div className="dashboard-stat-card">
      <div className="dashboard-stat-label">{label}</div>
      <div className="dashboard-stat-value">{value}</div>
      {hint ? <div className="dashboard-stat-hint">{hint}</div> : null}
      {action ? <div className="dashboard-stat-action">{action}</div> : null}
    </div>
  );
}

function withinNext7Days(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  return d >= start && d <= end;
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
    <section className="dashboard-page-shell">
      {intakeShare?.isOpen ? (
        <div className="dashboard-hero-card">
          <div className="dashboard-hero-layout">
            <div className="dashboard-hero-copy">
              <div className="dashboard-hero-kicker">Customer Intake</div>
              <div className="dashboard-hero-title">Share one intake link or QR code</div>
              <div className="dashboard-hero-description">
                Customers who scan this code can open your intake page and submit their details directly into your workspace.
              </div>
              <div className="intake-link-card" style={{ marginTop: 16 }}>
                <div className="intake-link-label">Public intake URL</div>
                <div className="intake-link-value">{intakeShare.link || "No intake link generated yet."}</div>
              </div>
              <div className="dashboard-action-row" style={{ marginTop: 14 }}>
                <button onClick={intakeShare.onClose} className="settings-secondary-btn">
                  Close
                </button>
              </div>
            </div>

            {intakeShare.qrImageUrl ? (
              <img
                src={intakeShare.qrImageUrl}
                alt="Customer intake QR code"
                className="dashboard-qr-card"
              />
            ) : (
              <div className="dashboard-empty-card">
                QR code unavailable.
              </div>
            )}
          </div>
        </div>
      ) : null}

      <section className="dashboard-stat-grid">
        <SmallStat label="Total Contacts" value={contacts.length} hint="Your active customer base" />
        <SmallStat label="Total Bookings" value={bookings.length} hint="All saved appointments" />
        <SmallStat label="Next 7 Days" value={upcomingBookings.length} hint="Upcoming work to handle" />
        <SmallStat label="Follow-up Queue" value={followUpQueue.length} hint="Customers needing action" />
        <SmallStat
          label="Customer Intake"
          value={intakeShare?.link ? "Ready" : "Off"}
          hint={intakeShare?.link ? "Share via link or QR" : "Enable intake to share publicly"}
          action={
            <button onClick={intakeShare?.onOpen} className="dashboard-primary-btn">
              Share QR Code
            </button>
          }
        />
      </section>

      <section className="dashboard-main-grid">
        <div className="dashboard-panel-card">
          <div className="dashboard-panel-header">
            <div>
              <div className="dashboard-panel-kicker">Schedule</div>
              <div className="dashboard-panel-title">Next 7 Days</div>
              <div className="dashboard-panel-description">
                Upcoming bookings in a clean task-style list.
              </div>
            </div>
          </div>

          <div className="dashboard-list-stack">
            {upcomingBookings.length ? (
              upcomingBookings.map((item) => {
                const active = selectedBookingId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`dashboard-list-card ${active ? "is-active" : ""}`}
                  >
                    <button onClick={() => setSelectedBookingId(item.id)} className="dashboard-list-button">
                      <div className="dashboard-list-row">
                        <div className="dashboard-list-title">
                          {weekdayLabel(item.start_time)} · {formatSlotTimeRange(item.start_time, item.end_time)}
                        </div>
                        <div className="dashboard-list-chip">{item.event_type}</div>
                      </div>
                      <div className="dashboard-list-subtitle">{item.contactName}</div>
                      <div className="dashboard-list-meta">{item.address}</div>
                    </button>
                    {active ? (
                      <div className="dashboard-inline-actions">
                        <button
                          onClick={() => onEditBooking(item)}
                          className="settings-secondary-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteBooking(item.id)}
                          className="settings-danger-btn"
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty-card">
                No bookings scheduled in the next 7 days.
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-panel-card">
          <div className="dashboard-panel-header">
            <div>
              <div className="dashboard-panel-kicker">Follow-up</div>
              <div className="dashboard-panel-title">Follow-up Queue</div>
              <div className="dashboard-panel-description">
                Customers tagged as needing follow-up.
              </div>
            </div>
          </div>

          <div className="dashboard-list-stack">
            {followUpQueue.length ? (
              followUpQueue.map((contact) => {
                const active = selectedContactId === contact.id;
                return (
                  <div
                    key={contact.id}
                    className={`dashboard-list-card ${active ? "is-active" : ""}`}
                  >
                    <button onClick={() => setSelectedContactId(contact.id)} className="dashboard-list-button">
                      <div className="dashboard-list-row">
                        <div className="dashboard-list-title">{contact.name}</div>
                        <div className="dashboard-list-chip dashboard-list-chip-muted">{contact.status || "New Lead"}</div>
                      </div>
                      <div className="dashboard-list-meta">{contact.phone || contact.email || "No contact detail"}</div>
                      <div className="dashboard-list-meta">{contact.address || "No address"}</div>
                    </button>
                    {active ? (
                      <div className="dashboard-inline-actions">
                        <button
                          onClick={() => onOpenContact(contact)}
                          className="settings-secondary-btn"
                        >
                          Open Contact
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="dashboard-empty-card">
                No customers currently marked for follow-up.
              </div>
            )}
          </div>
        </div>
      </section>
    </section>
  );
}

import React, { useState } from "react";
import { DURATION_OPTIONS, FIELD_LIMITS } from "../lib/constants";

function SettingsCard({ title, description, accent, children }) {
  return (
    <div className="settings-card">
      <div className="settings-card-header">
        <div>
          <div className="settings-card-accent">{accent}</div>
          <div className="settings-card-title">{title}</div>
          <div className="settings-card-description">{description}</div>
        </div>
      </div>
      <div className="settings-card-body">{children}</div>
    </div>
  );
}

function StatusList({ options, onAdd, onEdit }) {
  const [value, setValue] = useState("");
  return (
    <SettingsCard
      title="Status Options"
      description="Use clear workflow stages so each contact moves through the pipeline cleanly."
      accent="Workflow"
    >
      <div className="settings-input-row">
        <input
          value={value}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a new status"
          className="settings-input"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="settings-primary-btn"
        >
          Add
        </button>
      </div>

      <div className="settings-list">
        {options.map((item) => (
          <div key={item.id} className="settings-row">
            <div className="settings-row-main">
              <div className="settings-row-title">{item.name}</div>
              <div className="settings-row-meta">Contact stage in your workflow</div>
            </div>
            <button onClick={() => onEdit(item.id)} className="settings-secondary-btn">
              Edit
            </button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function TagList({ options, onAdd, onRemove }) {
  const [value, setValue] = useState("");
  return (
    <SettingsCard
      title="Tag Options"
      description="Keep short labels ready for segmentation, filtering, and follow-up."
      accent="Labels"
    >
      <div className="settings-input-row">
        <input
          value={value}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add a new tag"
          className="settings-input"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="settings-primary-btn"
        >
          Add
        </button>
      </div>

      <div className="settings-list">
        {options.map((item) => (
          <div key={item.id} className="settings-row">
            <div className="settings-row-main">
              <div className="settings-row-title">{item.name}</div>
              <div className="settings-row-meta">Reusable contact tag</div>
            </div>
            <button onClick={() => onRemove(item.id)} className="settings-danger-btn">
              Remove
            </button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function EventTypesList({ options, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("60");

  const labelFor = (mins) => DURATION_OPTIONS.find((x) => x.value === mins)?.label || `${mins} min`;

  return (
    <SettingsCard
      title="Event Types"
      description="Define what can be booked and how long each appointment should last by default."
      accent="Scheduling"
    >
      <div className="settings-event-create">
        <input
          value={name}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a new event type"
          className="settings-input"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="settings-select"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd(name.trim(), Number(minutes));
            setName("");
            setMinutes("60");
          }}
          className="settings-primary-btn"
        >
          Add
        </button>
      </div>

      <div className="settings-list">
        {options.map((item) => (
          <div key={item.id} className="settings-row settings-row-split">
            <div className="settings-row-main">
              <div className="settings-row-title">{item.name}</div>
              <div className="settings-row-meta">Default duration: {labelFor(item.minutes)}</div>
            </div>
            <div className="settings-row-actions">
              <span className="settings-pill">{labelFor(item.minutes)}</span>
              <button onClick={() => onEdit(item.id)} className="settings-secondary-btn">Edit</button>
              <button onClick={() => onRemove(item.id)} className="settings-danger-btn">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function SavedLocationsList({ locations, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <SettingsCard
      title="Saved Locations"
      description="Store common visit or meeting addresses so bookings can be created faster."
      accent="Locations"
    >
      <div className="settings-form-stack">
        <input
          value={name}
          maxLength={FIELD_LIMITS.locationName}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name"
          className="settings-input"
        />
        <input
          value={address}
          maxLength={FIELD_LIMITS.address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address"
          className="settings-input"
        />
        <button
          onClick={() => {
            if (!name.trim() || !address.trim()) return;
            onAdd({ name: name.trim(), address: address.trim() });
            setName("");
            setAddress("");
          }}
          className="settings-primary-btn settings-primary-btn-full"
        >
          Add Location
        </button>
      </div>

      <div className="settings-list">
        {locations.map((item) => (
          <div key={item.id} className="settings-row settings-row-split">
            <div className="settings-row-main">
              <div className="settings-row-title">{item.name}</div>
              <div className="settings-row-meta">{item.address}</div>
            </div>
            <button onClick={() => onRemove(item.id)} className="settings-danger-btn">
              Remove
            </button>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}

function EditDialog({ isOpen, title, initialName, initialMinutes, showDuration, onClose, onSave }) {
  const [name, setName] = useState(initialName || "");
  const [minutes, setMinutes] = useState(String(initialMinutes || 60));

  React.useEffect(() => {
    setName(initialName || "");
    setMinutes(String(initialMinutes || 60));
  }, [initialName, initialMinutes]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-0 md:items-center md:p-4">
      <div className="settings-sheet">
        <div className="settings-sheet-header">
          <div className="settings-sheet-title">{title}</div>
          <button onClick={onClose} className="settings-secondary-btn">Close</button>
        </div>
        <div className="settings-sheet-body">
          <div className="settings-form-stack">
            <input
              value={name}
              maxLength={FIELD_LIMITS.shortName}
              onChange={(e) => setName(e.target.value)}
              className="settings-input"
            />
            {showDuration ? (
              <select
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="settings-select"
              >
                {DURATION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="settings-sheet-actions">
            <button onClick={() => onSave(name.trim(), Number(minutes))} className="settings-primary-btn">
              Save
            </button>
            <button onClick={onClose} className="settings-secondary-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage({
  statusOptions,
  tagOptions,
  eventTypes,
  settingsMode,
  savedLocations,
  onAddStatus,
  onEditStatus,
  onAddTag,
  onRemoveTag,
  onAddEventType,
  onEditEventType,
  onRemoveEventType,
  onAddSavedLocation,
  onRemoveSavedLocation,
  onSaveSettings,
  onResetDefaults,
}) {
  const [statusEdit, setStatusEdit] = useState(null);
  const [eventEdit, setEventEdit] = useState(null);

  return (
    <section className="space-y-6">
      <div className="settings-hero">
        <div>
          <div className="settings-hero-kicker">Workspace Setup</div>
          <div className="settings-hero-title">Settings that match your daily flow</div>
          <div className="settings-hero-description">
            Keep workflow stages, booking types, and saved locations clean so capture and scheduling stay fast on mobile.
          </div>
          <div className="settings-hero-meta">
            Current save mode: <span>{settingsMode}</span>
          </div>
        </div>
        <div className="settings-hero-actions">
          <button onClick={onSaveSettings} className="settings-primary-btn">Save Settings</button>
          <button onClick={onResetDefaults} className="settings-secondary-btn">Reset to Defaults</button>
        </div>
      </div>

      <div className="settings-grid">
        <StatusList options={statusOptions} onAdd={onAddStatus} onEdit={setStatusEdit} />
        <TagList options={tagOptions} onAdd={onAddTag} onRemove={onRemoveTag} />
        <EventTypesList options={eventTypes} onAdd={onAddEventType} onEdit={setEventEdit} onRemove={onRemoveEventType} />
        <SavedLocationsList locations={savedLocations} onAdd={onAddSavedLocation} onRemove={onRemoveSavedLocation} />
      </div>

      <EditDialog
        isOpen={Boolean(statusEdit)}
        title="Edit Status"
        initialName={statusOptions.find((x) => x.id === statusEdit)?.name || ""}
        showDuration={false}
        onClose={() => setStatusEdit(null)}
        onSave={(name) => {
          if (!statusEdit || !name) return;
          onEditStatus(statusEdit, name);
          setStatusEdit(null);
        }}
      />

      <EditDialog
        isOpen={Boolean(eventEdit)}
        title="Edit Event Type"
        initialName={eventTypes.find((x) => x.id === eventEdit)?.name || ""}
        initialMinutes={eventTypes.find((x) => x.id === eventEdit)?.minutes || 60}
        showDuration={true}
        onClose={() => setEventEdit(null)}
        onSave={(name, minutes) => {
          if (!eventEdit || !name) return;
          onEditEventType(eventEdit, name, minutes);
          setEventEdit(null);
        }}
      />
    </section>
  );
}

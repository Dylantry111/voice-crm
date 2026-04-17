import React, { useState } from "react";
import { DURATION_OPTIONS, FIELD_LIMITS } from "../lib/constants";

function StatusList({ options, onAdd, onEdit }) {
  const [value, setValue] = useState("");
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Status Options</div>
      <div className="mt-1 text-sm text-slate-500">Used to track where each client is in your workflow.</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={value}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New status..."
          className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-[140px] flex-1 text-sm font-medium text-slate-800">{item.name}</div>
            <button onClick={() => onEdit(item.id)} className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TagList({ options, onAdd, onRemove }) {
  const [value, setValue] = useState("");
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Tag Options</div>
      <div className="mt-1 text-sm text-slate-500">Used to label and filter clients.</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={value}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setValue(e.target.value)}
          placeholder="New tag..."
          className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-[140px] flex-1 text-sm font-medium text-slate-800">{item.name}</div>
            <button onClick={() => onRemove(item.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EventTypesList({ options, onAdd, onEdit, onRemove }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("60");

  const labelFor = (mins) => DURATION_OPTIONS.find((x) => x.value === mins)?.label || `${mins} min`;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Event Types</div>
      <div className="mt-1 text-sm text-slate-500">Defines booking types and default durations.</div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={name}
          maxLength={FIELD_LIMITS.shortName}
          onChange={(e) => setName(e.target.value)}
          placeholder="New event type..."
          className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="h-11 w-[132px] shrink-0 rounded-2xl border border-slate-200 px-3 text-sm outline-none"
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
          className="h-11 shrink-0 rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-[160px] flex-1 truncate text-sm font-medium text-slate-800">{item.name}</div>
            <div className="w-[132px] shrink-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {labelFor(item.minutes)}
            </div>
            <button onClick={() => onEdit(item.id)} className="h-10 shrink-0 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800">
              Edit
            </button>
            <button onClick={() => onRemove(item.id)} className="h-10 shrink-0 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-medium text-rose-700">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SavedLocationsList({ locations, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Saved Locations</div>
      <div className="mt-1 text-sm text-slate-500">Reusable meeting or service locations.</div>

      <div className="mt-4 space-y-2">
        <input
          value={name}
          maxLength={FIELD_LIMITS.locationName}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name"
          className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <input
          value={address}
          maxLength={FIELD_LIMITS.address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Full address"
          className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <button
          onClick={() => {
            if (!name.trim() || !address.trim()) return;
            onAdd({ name: name.trim(), address: address.trim() });
            setName("");
            setAddress("");
          }}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add Location
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {locations.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-[140px] flex-1">
              <div className="text-sm font-medium text-slate-800">{item.name}</div>
              <div className="text-xs text-slate-500">{item.address}</div>
            </div>
            <button onClick={() => onRemove(item.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="text-lg font-semibold">{title}</div>
        <div className="mt-4 space-y-3">
          <input
            value={name}
            maxLength={FIELD_LIMITS.shortName}
            onChange={(e) => setName(e.target.value)}
            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
          />
          {showDuration ? (
            <select
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ) : null}
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => onSave(name.trim(), Number(minutes))} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Save
          </button>
          <button onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-800">
            Cancel
          </button>
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Settings</div>
        <div className="mt-2 text-sm text-slate-500">
          Manage your workflow defaults and reusable booking data here.
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Current save mode: <span className="font-medium text-slate-900">{settingsMode}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={onSaveSettings} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Save Settings</button>
          <button onClick={onResetDefaults} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800">Reset to Defaults</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
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

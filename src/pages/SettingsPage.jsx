import React, { useState } from "react";

const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

function SimpleOptionList({ title, description, options, placeholder, onAdd, onRemove, onSave }) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-[160px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <button
          onClick={() => {
            if (!value.trim()) return;
            onAdd(value.trim());
            setValue("");
          }}
          className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-0 text-sm font-medium text-slate-800">{item.name}</div>
            <button
              onClick={() => {
                const ok = window.confirm(`Remove ${item.name}?`);
                if (ok) onRemove(item.id);
              }}
              className="shrink-0 text-sm font-medium text-rose-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button onClick={onSave} className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Save {title}
      </button>
    </div>
  );
}

function EventTypeList({ options, onAdd, onRemove, onUpdateMinutes, onSave }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("60");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Event Types</div>
      <div className="mt-1 text-sm text-slate-500">Defines booking types and their default durations.</div>

      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_160px_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New event type..."
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        >
          {DURATION_OPTIONS.map((option) => (
            <option key={option} value={option}>{option} min</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd(name.trim(), Number(minutes));
            setName("");
            setMinutes("60");
          }}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="grid items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 md:grid-cols-[1fr_160px_auto]">
            <div className="min-w-0 text-sm font-medium text-slate-800">{item.name}</div>
            <select
              value={String(item.minutes || 60)}
              onChange={(e) => onUpdateMinutes(item.id, Number(e.target.value))}
              className="h-10 rounded-2xl border border-slate-200 px-3 text-sm outline-none"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} min</option>
              ))}
            </select>
            <button
              onClick={() => {
                const ok = window.confirm(`Remove ${item.name}?`);
                if (ok) onRemove(item.id);
              }}
              className="text-sm font-medium text-rose-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button onClick={onSave} className="mt-4 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        Save Event Types
      </button>
    </div>
  );
}

function SavedLocationsList({ locations, onAdd, onRemove }) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
      <div className="text-lg font-semibold">Saved Locations</div>
      <div className="mt-1 text-sm text-slate-500">
        Use named addresses like Office, Cafe, or Meeting Room as quick booking locations.
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-[220px_1fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Location name"
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Detailed address"
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
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
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {locations.length ? locations.map((item) => (
          <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900">{item.name}</div>
              <div className="text-xs text-slate-500">{item.address}</div>
            </div>
            <button
              onClick={() => {
                const ok = window.confirm(`Remove saved location "${item.name}"?`);
                if (ok) onRemove(item.id);
              }}
              className="shrink-0 text-sm font-medium text-rose-600"
            >
              Remove
            </button>
          </div>
        )) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
            No saved locations yet.
          </div>
        )}
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
  onRemoveStatus,
  onAddTag,
  onRemoveTag,
  onAddEventType,
  onRemoveEventType,
  onUpdateEventTypeMinutes,
  onAddSavedLocation,
  onRemoveSavedLocation,
  onSaveSettings,
  onResetDefaults,
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Settings</div>
        <div className="mt-2 text-sm text-slate-500">
          Manage statuses, tags, event types, and reusable booking locations.
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Current save mode: <span className="font-medium text-slate-900">{settingsMode}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={onSaveSettings} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Save Settings</button>
          <button onClick={onResetDefaults} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800">Reset to Defaults</button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SimpleOptionList
          title="Status Options"
          description="Used to track where each client is in your workflow."
          options={statusOptions}
          placeholder="New status..."
          onAdd={onAddStatus}
          onRemove={onRemoveStatus}
          onSave={onSaveSettings}
        />

        <SimpleOptionList
          title="Tag Options"
          description="Used to label and filter clients."
          options={tagOptions}
          placeholder="New tag..."
          onAdd={onAddTag}
          onRemove={onRemoveTag}
          onSave={onSaveSettings}
        />

        <EventTypeList
          options={eventTypes}
          onAdd={onAddEventType}
          onRemove={onRemoveEventType}
          onUpdateMinutes={onUpdateEventTypeMinutes}
          onSave={onSaveSettings}
        />

        <SavedLocationsList
          locations={savedLocations}
          onAdd={onAddSavedLocation}
          onRemove={onRemoveSavedLocation}
        />
      </div>
    </section>
  );
}

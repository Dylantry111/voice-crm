import React, { useState } from "react";

const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

function InfoText({ children }) {
  return <div className="mt-1 text-sm text-slate-500">{children}</div>;
}

function SimpleOptionList({ title, options, placeholder, helper, onAdd, onRemove, onSave, onReset }) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <InfoText>{helper}</InfoText>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
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
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">{item.name}</div>
            <button
              onClick={() => {
                const ok = window.confirm(`Remove "${item.name}"?`);
                if (ok) onRemove(item.id);
              }}
              className="text-sm font-medium text-rose-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onSave} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Save {title}
        </button>
        <button onClick={onReset} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800">
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function EventTypeList({ options, helper, onAdd, onRemove, onUpdateMinutes, onSave, onReset }) {
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState("60");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">Event Types</div>
      <InfoText>{helper}</InfoText>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New event type..."
          className="h-11 min-w-[180px] flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
        />
        <select
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="h-11 w-[140px] rounded-2xl border border-slate-200 px-4 text-sm outline-none"
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
          className="shrink-0 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {options.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <div className="min-w-[140px] flex-1 text-sm font-medium text-slate-800">{item.name}</div>
            <select
              value={String(item.minutes || 60)}
              onChange={(e) => onUpdateMinutes(item.id, Number(e.target.value))}
              className="h-10 w-[140px] rounded-2xl border border-slate-200 px-3 text-sm outline-none"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} min</option>
              ))}
            </select>
            <button
              onClick={() => {
                const ok = window.confirm(`Remove "${item.name}"?`);
                if (ok) onRemove(item.id);
              }}
              className="shrink-0 text-sm font-medium text-rose-600"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onSave} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Save Event Types
        </button>
        <button onClick={onReset} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800">
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage({
  statusOptions,
  tagOptions,
  eventTypes,
  settingsMode,
  onAddStatus,
  onRemoveStatus,
  onAddTag,
  onRemoveTag,
  onAddEventType,
  onRemoveEventType,
  onUpdateEventTypeMinutes,
  onSaveSettings,
  onResetStatuses,
  onResetTags,
  onResetEventTypes,
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Settings</div>
        <div className="mt-2 text-sm text-slate-500">
          Manage your workflow defaults. Status tracks progress, Tags describe attributes, and Event Types define booking types and durations.
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Current save mode: <span className="font-medium text-slate-900">{settingsMode}</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SimpleOptionList
          title="Status Options"
          options={statusOptions}
          placeholder="New status..."
          helper="Used to track where each client is in your workflow."
          onAdd={onAddStatus}
          onRemove={onRemoveStatus}
          onSave={onSaveSettings}
          onReset={onResetStatuses}
        />

        <SimpleOptionList
          title="Tag Options"
          options={tagOptions}
          placeholder="New tag..."
          helper="Used to label, filter, and prioritize clients."
          onAdd={onAddTag}
          onRemove={onRemoveTag}
          onSave={onSaveSettings}
          onReset={onResetTags}
        />

        <EventTypeList
          options={eventTypes}
          helper="Defines the default duration for each kind of booking."
          onAdd={onAddEventType}
          onRemove={onRemoveEventType}
          onUpdateMinutes={onUpdateEventTypeMinutes}
          onSave={onSaveSettings}
          onReset={onResetEventTypes}
        />
      </div>
    </section>
  );
}

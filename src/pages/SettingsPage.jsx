import React, { useState } from "react";

const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 30);

function SimpleOptionList({ title, options, placeholder, onAdd, onRemove, onSave }) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>

      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="h-11 flex-1 rounded-2xl border border-slate-200 px-4 text-sm outline-none"
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
          <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">{item.name}</div>
            <button onClick={() => onRemove(item.id)} className="text-sm font-medium text-rose-600">
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

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_160px_auto]">
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
          <div key={item.id} className="grid items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 sm:grid-cols-[1fr_160px_auto]">
            <div className="text-sm font-medium text-slate-800">{item.name}</div>
            <select
              value={String(item.minutes || 60)}
              onChange={(e) => onUpdateMinutes(item.id, Number(e.target.value))}
              className="h-10 rounded-2xl border border-slate-200 px-3 text-sm outline-none"
            >
              {DURATION_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} min</option>
              ))}
            </select>
            <button onClick={() => onRemove(item.id)} className="text-sm font-medium text-rose-600">
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
}) {
  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Settings</div>
        <div className="mt-2 text-sm text-slate-500">
          Manage your Status options, Tags, and Event Types here.
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
          onAdd={onAddStatus}
          onRemove={onRemoveStatus}
          onSave={onSaveSettings}
        />

        <SimpleOptionList
          title="Tag Options"
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
      </div>
    </section>
  );
}

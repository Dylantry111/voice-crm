import React, { useState } from "react";

function OptionList({ title, options, onAdd, onRemove }) {
  const [value, setValue] = useState("");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-4 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`New ${title}...`}
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
            <div className="text-sm font-medium text-slate-800">
              {item.name} {"minutes" in item ? `· ${item.minutes}m` : ""}
            </div>
            <button onClick={() => onRemove(item.id)} className="text-sm font-medium text-rose-600">
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage({
  statusOptions,
  tagOptions,
  eventTypes,
  onAddStatus,
  onRemoveStatus,
  onAddTag,
  onRemoveTag,
  onAddEventType,
  onRemoveEventType,
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-3">
      <OptionList title="Status Options" options={statusOptions} onAdd={onAddStatus} onRemove={onRemoveStatus} />
      <OptionList title="Tag Options" options={tagOptions} onAdd={onAddTag} onRemove={onRemoveTag} />
      <OptionList title="Event Types" options={eventTypes} onAdd={onAddEventType} onRemove={onRemoveEventType} />
    </section>
  );
}

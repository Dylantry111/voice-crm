import React from "react";
import { classNames } from "../../lib/contactUtils";

export function EventBadge({ type, eventTypes }) {
  const item = eventTypes.find((e) => e.name === type) || eventTypes[0] || {
    name: type || "Event",
    color: "bg-slate-900 text-white",
  };
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

export function StatusBadge({ value, statusOptions }) {
  const item = statusOptions.find((s) => s.name === value) || statusOptions[0] || {
    name: value || "New",
    color: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

export function TagChip({ value, tagOptions }) {
  const item = tagOptions.find((t) => t.name === value) || {
    name: value,
    color: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={classNames("rounded-full px-2.5 py-1 text-xs font-medium", item.color)}>
      {item.name}
    </span>
  );
}

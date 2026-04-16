import React from "react";

export function StatusBadge({ value, statusOptions }) {
  const item = statusOptions.find((s) => s.name === value) || { name: value || "New", color: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.color}`}>{item.name}</span>;
}

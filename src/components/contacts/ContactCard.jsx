import React from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "../common/Badges";

export default function ContactCard({ contact, onOpen, statusOptions }) {
  return (
    <button
      onClick={() => onOpen(contact)}
      className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{contact.name}</div>
          <div className="mt-1 text-sm text-slate-500">{contact.phone}</div>
        </div>
        <StatusBadge value={contact.status} statusOptions={statusOptions} />
      </div>

      <div className="mt-3 line-clamp-2 text-sm text-slate-600">{contact.address}</div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Open contact workspace</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

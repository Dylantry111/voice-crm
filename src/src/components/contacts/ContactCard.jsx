import React from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge, TagChip } from "../common/Badges";

export default function ContactCard({ contact, onOpen, statusOptions, tagOptions }) {
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

      <div className="mt-3 flex flex-wrap gap-2">
        {(contact.tags || []).map((t) => (
          <TagChip key={t} value={t} tagOptions={tagOptions} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
        <div>
          <div className="text-xs text-slate-500">Touch</div>
          <div className="text-sm font-semibold">{contact.touchpoints}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Meet</div>
          <div className="text-sm font-semibold">{contact.meetings}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Next</div>
          <div className="line-clamp-2 text-xs font-semibold">{contact.nextBooking}</div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <span>Open contact workspace</span>
        <ChevronRight className="h-4 w-4" />
      </div>
    </button>
  );
}

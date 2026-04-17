import React, { useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

function formatExportDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-NZ");
}

function escapeCell(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function buildCsv(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\n");
}

function downloadCsv(filename, rows) {
  const csv = buildCsv(rows);
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExportPage({ contacts, tagOptions }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [suburb, setSuburb] = useState("");
  const [sending, setSending] = useState(false);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const createdAt = contact.created_at ? new Date(contact.created_at) : null;
      if (fromDate && createdAt) {
        const from = new Date(fromDate + "T00:00:00");
        if (createdAt < from) return false;
      }
      if (toDate && createdAt) {
        const to = new Date(toDate + "T23:59:59");
        if (createdAt > to) return false;
      }
      if (selectedTags.length) {
        const tags = Array.isArray(contact.tags) ? contact.tags : [];
        const hasAny = selectedTags.some((tag) => tags.includes(tag));
        if (!hasAny) return false;
      }
      if (suburb.trim()) {
        const address = (contact.address || "").toLowerCase();
        if (!address.includes(suburb.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [contacts, fromDate, toDate, selectedTags, suburb]);

  function toggleTag(tagName) {
    setSelectedTags((prev) =>
      prev.includes(tagName) ? prev.filter((x) => x !== tagName) : [...prev, tagName]
    );
  }

  function buildRows() {
    return [
      ["Name", "Phone", "Email", "Address", "Requirement", "Status", "Tags", "Notes", "Created At"],
      ...filteredContacts.map((contact) => [
        contact.name || "",
        contact.phone || "",
        contact.email || "",
        contact.address || "",
        contact.requirement || "",
        contact.status || "",
        Array.isArray(contact.tags) ? contact.tags.join(", ") : "",
        contact.notes || "",
        formatExportDate(contact.created_at),
      ]),
    ];
  }

  function handleExport() {
    const rows = buildRows();
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`contacts_export_${today}.csv`, rows);
  }

async function handleSendToEmail() {
  const rows = buildRows();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!session?.access_token || !user?.email) {
    alert("Please log in first.");
    return;
  }

  setSending(true);
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          rows,
          filename: `contacts_export_${new Date().toISOString().slice(0, 10)}.xlsx`,
          toEmail: user.email,
        }),
      }
    );

const json = await res.json().catch(() => ({}));

if (!res.ok) {
  throw new Error(json.error || `Failed to send email (${res.status})`);
}

alert("Export sent to your email.");
} catch (error) {
  console.error(error);
  alert(error instanceof Error ? error.message : "Failed to send email. Please try again.");
}finally {
    setSending(false);
  }
}

  return (
    <section className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold">Export Contacts</div>
        <div className="mt-2 text-sm text-slate-500">
          Export customers only. Bookings are excluded.
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-base font-semibold">Filters</div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Created From</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Created To</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Suburb</label>
            <input value={suburb} onChange={(e) => setSuburb(e.target.value)} placeholder="e.g. Mount Albert" className="mt-1 h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Tags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const active = selectedTags.includes(tag.name);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${active ? tag.color : "border border-slate-200 bg-white text-slate-600"}`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          {filteredContacts.length} contact(s) match the current filters.
        </div>

        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-slate-900">Preview</div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[420px] overflow-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-medium text-slate-600">Name</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Phone</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Email</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Address</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Tags</th>
                    <th className="px-4 py-3 font-medium text-slate-600">Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.length ? (
                    filteredContacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-3 text-slate-900">{contact.name || ""}</td>
                        <td className="px-4 py-3 text-slate-700">{contact.phone || ""}</td>
                        <td className="px-4 py-3 text-slate-700">{contact.email || ""}</td>
                        <td className="px-4 py-3 text-slate-700">{contact.address || ""}</td>
                        <td className="px-4 py-3 text-slate-700">{contact.status || ""}</td>
                        <td className="px-4 py-3 text-slate-700">{Array.isArray(contact.tags) ? contact.tags.join(", ") : ""}</td>
                        <td className="px-4 py-3 text-slate-700">{formatExportDate(contact.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">No contacts match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={handleExport} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
            Download
          </button>
          <button onClick={handleSendToEmail} disabled={sending} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 disabled:opacity-60">
            {sending ? "Sending..." : "Send to Email"}
          </button>
        </div>
      </section>
    </section>
  );
}

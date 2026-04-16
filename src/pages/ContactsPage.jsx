import React from "react";
import { Search } from "lucide-react";
import ContactCard from "../components/contacts/ContactCard";

export default function ContactsPage({
  query,
  setQuery,
  filteredContacts,
  loadingContacts,
  onOpenContact,
  statusOptions,
}) {
  return (
    <>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold">Contacts workspace</div>
            <div className="mt-1 text-sm text-slate-500">Manage all customers here.</div>
          </div>
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, phone, email, address..."
              className="h-12 w-full rounded-2xl border border-slate-200 pl-10 pr-4 text-sm outline-none"
            />
          </div>
        </div>
      </section>

      {loadingContacts ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading contacts...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">No contacts yet.</div>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onOpen={onOpenContact} statusOptions={statusOptions} />
          ))}
        </section>
      )}
    </>
  );
}

import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createContact, fetchContacts, updateContact } from "./services/contactsService";
import { createBooking, deleteBooking, fetchBookings, updateBooking } from "./services/bookingsService";
import { fetchSavedLocations } from "./services/savedLocationsService";
import {
  fetchOrCreateMyIntakeProfile,
  updateMyIntakeProfile,
} from "./services/publicIntakeService";
import { loadSettings, saveSettings } from "./services/settingsService";
import { supabase } from "./lib/supabase";
import { smartFill } from "./lib/parsers/contactParser";
import { findDuplicateContacts, buildDuplicateMessage } from "./lib/parsers/duplicateChecker";
import { formatDateInputValue } from "./lib/dateUtils";

const PublicIntakeScreen = lazy(() => import("./pages/PublicIntakeScreen.jsx"));

const ui = {
  page: { minHeight: "100vh", background: "#f8fafc", color: "#0f172a" },
  shell: { maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gap: 16 },
  section: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.06)" },
  sectionMuted: { background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0", borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(15,23,42,0.05)" },
  input: { width: "100%", height: 42, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 12px", background: "#fff", color: "#0f172a" },
  textarea: { width: "100%", borderRadius: 12, border: "1px solid #cbd5e1", padding: 12, background: "#fff", color: "#0f172a", resize: "vertical" },
  select: { width: "100%", height: 42, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 12px", background: "#fff", color: "#0f172a" },
  primaryBtn: { background: "#0f172a", color: "#fff", border: "1px solid #0f172a", borderRadius: 12, padding: "10px 14px", fontWeight: 600 },
  secondaryBtn: { background: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 12, padding: "10px 14px", fontWeight: 600 },
  dangerBtn: { background: "#fff", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 12, padding: "10px 14px", fontWeight: 600 },
  badge: { display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 },
};

function statusBadgeStyle(status) {
  const map = {
    "New Lead": { background: "#dbeafe", color: "#1d4ed8" },
    Contacted: { background: "#fef3c7", color: "#b45309" },
    Quoted: { background: "#ede9fe", color: "#6d28d9" },
    Won: { background: "#dcfce7", color: "#15803d" },
    Lost: { background: "#fee2e2", color: "#b91c1c" },
  };
  return { ...ui.badge, ...(map[status] || { background: "#e2e8f0", color: "#334155" }) };
}

function Section({ title, children, right, muted = false }) {
  return (
    <section style={muted ? ui.sectionMuted : ui.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18, letterSpacing: "-0.01em" }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const STATUS_OPTIONS = ["New Lead", "Contacted", "Quoted", "Won", "Lost"];

function downloadCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function MetricCard({ title, value, hint }) {
  return (
    <div style={{ ...ui.sectionMuted, padding: 16 }}>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em" }}>{value}</div>
      {hint ? <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>{hint}</div> : null}
    </div>
  );
}

export default function App() {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "/";
  const publicToken = pathname.startsWith("/intake/") ? pathname.replace("/intake/", "").trim() : "";
  const isPublicIntakeMode = Boolean(publicToken);

  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [intakeProfile, setIntakeProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedContactId, setSelectedContactId] = useState("");
  const [editingBookingId, setEditingBookingId] = useState("");
  const [voiceInput, setVoiceInput] = useState("Tom phone 021 123 4567 email tom@test.com address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters.");
  const [draft, setDraft] = useState(() => smartFill(voiceInput));
  const [intakeDraft, setIntakeDraft] = useState({ form_title: "", intro_text: "", is_enabled: true });
  const [settingsDraft, setSettingsDraft] = useState({ statusOptions: [], tagOptions: [], eventTypes: [] });
  const [bookingForm, setBookingForm] = useState({
    contact_id: "",
    event_type: "Measure",
    date: formatDateInputValue(new Date()),
    start_time: "09:00",
    end_time: "10:00",
    location_name: "Customer Address",
    location_address: "",
    location_type: "customer",
  });

  useEffect(() => {
    if (!isPublicIntakeMode) loadInitialData();
  }, [isPublicIntakeMode]);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setLoading(false);
      const [contactRows, bookingRows, savedLocationRows, intake, settingsData] = await Promise.all([
        fetchContacts(), fetchBookings(), fetchSavedLocations(), fetchOrCreateMyIntakeProfile(), loadSettings(),
      ]);
      setContacts(contactRows);
      setBookings(bookingRows);
      setSavedLocations(savedLocationRows);
      setIntakeProfile(intake);
      setSettings(settingsData);
      setIntakeDraft({ form_title: intake?.form_title || "", intro_text: intake?.intro_text || "", is_enabled: Boolean(intake?.is_enabled) });
      setSettingsDraft({
        statusOptions: settingsData?.statusOptions || [],
        tagOptions: settingsData?.tagOptions || [],
        eventTypes: settingsData?.eventTypes || [],
      });
      if (!selectedContactId && contactRows[0]?.id) setSelectedContactId(contactRows[0].id);
    } catch (error) {
      console.error(error);
      setMessage(`加载失败：${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => [c.name, c.phone, c.email, c.address, c.requirement, c.status, ...(c.tags || [])].join(" ").toLowerCase().includes(q));
  }, [contacts, query]);

  const selectedContact = useMemo(() => contacts.find((item) => item.id === selectedContactId) || filteredContacts[0] || contacts[0] || null, [contacts, filteredContacts, selectedContactId]);
  const duplicateResult = useMemo(() => findDuplicateContacts(draft, contacts), [draft, contacts]);
  const contactBookings = useMemo(() => !selectedContact?.id ? [] : bookings.filter((item) => item.contact_id === selectedContact.id).sort((a, b) => new Date(a.start_time) - new Date(b.start_time)), [bookings, selectedContact]);

  function fillFromVoice() { setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) })); }
  function resetBookingForm(contact = null) {
    setEditingBookingId("");
    setBookingForm({ contact_id: contact?.id || "", event_type: settings?.eventTypes?.[0]?.name || "Measure", date: formatDateInputValue(new Date()), start_time: "09:00", end_time: "10:00", location_name: "Customer Address", location_address: contact?.address || "", location_type: "customer" });
  }

  async function handleCreateContact() {
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");
      if (duplicateResult.hasDuplicate && !window.confirm(buildDuplicateMessage(duplicateResult))) return;
      const newContact = await createContact({ user_id: user.id, name: draft.name || "New Contact", phone: draft.phone || "", email: draft.email || "", address: draft.address || "", requirement: draft.requirement || "General enquiry", notes: draft.notes || voiceInput, status: draft.status || "New Lead", tags: draft.tags || [], source: "manual" });
      setContacts((prev) => [newContact, ...prev]);
      setSelectedContactId(newContact.id); resetBookingForm(newContact); setActiveTab("contacts"); setMessage(`已创建联系人：${newContact.name}`);
    } catch (error) { console.error(error); setMessage(`创建联系人失败：${error.message}`); }
  }

  async function handleSaveContactDetails() {
    if (!selectedContact) return;
    setMessage("");
    try {
      const updated = await updateContact(selectedContact.id, { name: selectedContact.name || "", phone: selectedContact.phone || "", email: selectedContact.email || "", address: selectedContact.address || "", requirement: selectedContact.requirement || "", notes: selectedContact.notes || "", status: selectedContact.status || "New Lead", tags: selectedContact.tags || [] });
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`联系人已保存：${updated.name}`);
    } catch (error) { console.error(error); setMessage(`保存联系人失败：${error.message}`); }
  }

  async function handleSaveBooking() {
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");
      if (!bookingForm.contact_id) throw new Error("请先选择联系人");
      const start = new Date(`${bookingForm.date}T${bookingForm.start_time}:00`);
      const end = new Date(`${bookingForm.date}T${bookingForm.end_time}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("预约时间无效");
      if (end <= start) throw new Error("结束时间必须晚于开始时间");
      const payload = { user_id: user.id, contact_id: bookingForm.contact_id, event_type: bookingForm.event_type, start_time: start.toISOString(), end_time: end.toISOString(), location_type: bookingForm.location_type, location_name: bookingForm.location_name, location_address: bookingForm.location_address };
      if (editingBookingId) {
        const updated = await updateBooking(editingBookingId, payload);
        setBookings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("预约已更新");
      } else {
        const created = await createBooking(payload);
        setBookings((prev) => [created, ...prev]);
        setMessage("预约已创建");
      }
      resetBookingForm(selectedContact); setActiveTab("calendar");
    } catch (error) { console.error(error); setMessage(`保存预约失败：${error.message}`); }
  }

  async function handleDeleteBooking(bookingId) {
    if (!window.confirm("确认删除这个预约？")) return;
    setMessage("");
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
      if (editingBookingId === bookingId) resetBookingForm(selectedContact);
      setMessage("预约已删除");
    } catch (error) { console.error(error); setMessage(`删除预约失败：${error.message}`); }
  }

  function startEditBooking(booking) {
    setEditingBookingId(booking.id); setActiveTab("calendar");
    setBookingForm({ contact_id: booking.contact_id || "", event_type: booking.event_type || "Measure", date: formatDateInputValue(booking.start_time), start_time: new Date(booking.start_time).toISOString().slice(11, 16), end_time: new Date(booking.end_time).toISOString().slice(11, 16), location_name: booking.location_name || "Customer Address", location_address: booking.location_address || "", location_type: booking.location_type || "customer" });
  }

  async function handleMarkContact(contact, nextStatus) {
    setMessage("");
    try {
      const updated = await updateContact(contact.id, { status: nextStatus });
      setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
      if (selectedContactId === contact.id) setSelectedContactId(updated.id);
      setMessage(`已更新 ${contact.name} 状态为 ${nextStatus}`);
    } catch (error) { console.error(error); setMessage(`更新联系人失败：${error.message}`); }
  }

  async function handleSaveSettings() {
    setMessage("");
    try {
      const next = await saveSettings({
        mode: "browser_local_storage",
        statusOptions: settingsDraft.statusOptions,
        tagOptions: settingsDraft.tagOptions,
        eventTypes: settingsDraft.eventTypes,
      });
      setSettings(next);
      setSettingsDraft({
        statusOptions: next.statusOptions,
        tagOptions: next.tagOptions,
        eventTypes: next.eventTypes,
      });
      setMessage("Settings 已持久保存到浏览器本地");
    } catch (error) {
      console.error(error);
      setMessage(`保存 Settings 失败：${error.message}`);
    }
  }

  function updateSettingsList(field, value) {
    const items = value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    setSettingsDraft((prev) => ({
      ...prev,
      [field]: field === "eventTypes" ? items.map((name) => ({ name })) : items,
    }));
  }

  async function handleSaveIntakeProfile() {
    setMessage("");
    try {
      const updated = await updateMyIntakeProfile(intakeDraft);
      setIntakeProfile(updated);
      setIntakeDraft({ form_title: updated.form_title || "", intro_text: updated.intro_text || "", is_enabled: Boolean(updated.is_enabled) });
      setMessage("Intake 配置已保存");
    } catch (error) { console.error(error); setMessage(`保存 Intake 配置失败：${error.message}`); }
  }

  function handleExportContacts() {
    const rows = [["name", "phone", "email", "address", "requirement", "status", "created_at"], ...filteredContacts.map((contact) => [contact.name, contact.phone, contact.email, contact.address, contact.requirement, contact.status, contact.created_at])];
    downloadCsv("voice-crm-contacts.csv", rows); setMessage("联系人 CSV 已导出");
  }

  function handleExportBookings() {
    const rows = [["event_type", "contact_name", "start_time", "end_time", "location_name", "location_address"], ...bookings.map((booking) => { const contact = contacts.find((item) => item.id === booking.contact_id); return [booking.event_type, contact?.name || booking.contact_id, booking.start_time, booking.end_time, booking.location_name, booking.location_address]; })];
    downloadCsv("voice-crm-bookings.csv", rows); setMessage("预约 CSV 已导出");
  }

  function updateSelectedContactField(field, value) {
    if (!selectedContact) return;
    setContacts((prev) => prev.map((item) => (item.id === selectedContact.id ? { ...item, [field]: value } : item)));
  }

  const tabButtons = [["dashboard", "总览"], ["contacts", "联系人"], ["calendar", "预约"], ["capture", "录入"], ["intake", "Intake"], ["settings", "系统"]];
  const intakeUrl = intakeProfile ? `${window.location.origin}/intake/${intakeProfile.intake_token}` : "";

  if (isPublicIntakeMode) return <Suspense fallback={<div style={{ padding: 24 }}>加载中...</div>}><PublicIntakeScreen token={publicToken} /></Suspense>;
  if (loading) return <div style={{ padding: 24 }}>加载中...</div>;

  return (
    <div style={ui.page}>
      <div style={ui.shell}>
        <div style={{ ...ui.sectionMuted, padding: 20, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.04em" }}>Voice CRM</div>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 14 }}>Lead capture · bookings · public intake</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabButtons.map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} style={activeTab === key ? ui.primaryBtn : ui.secondaryBtn}>{label}</button>
            ))}
          </div>
        </div>

        {message ? <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: 14, padding: 12 }}>{message}</div> : null}

        {(activeTab === "dashboard" || activeTab === "contacts" || activeTab === "calendar") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <MetricCard title="联系人" value={contacts.length} hint="可搜索、可编辑、可导出" />
            <MetricCard title="预约" value={bookings.length} hint="支持创建 / 编辑 / 删除" />
            <MetricCard title="常用地址" value={savedLocations.length} hint="用于预约快速选址" />
            <MetricCard title="公开 Intake" value={intakeProfile?.is_enabled ? "ON" : "OFF"} hint={intakeProfile?.intake_token || "未配置"} />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section title="快捷动作" muted>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={ui.primaryBtn} onClick={() => setActiveTab("capture")}>录入新联系人</button>
                <button style={ui.secondaryBtn} onClick={() => setActiveTab("calendar")}>创建预约</button>
                <button style={ui.secondaryBtn} onClick={handleExportContacts}>导出联系人</button>
                <button style={ui.secondaryBtn} onClick={handleExportBookings}>导出预约</button>
              </div>
            </Section>
            <Section title="最近联系人">
              <div style={{ display: "grid", gap: 10 }}>
                {contacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid #eef2f7", borderRadius: 12, padding: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{contact.name}</div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>{contact.requirement || "No requirement"}</div>
                    </div>
                    <span style={statusBadgeStyle(contact.status)}>{contact.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "capture" && (
          <Section title="语音转联系人草稿" right={<button style={ui.secondaryBtn} onClick={fillFromVoice}>智能填充</button>}>
            <div style={{ display: "grid", gap: 12 }}>
              <textarea style={ui.textarea} value={voiceInput} onChange={(e) => setVoiceInput(e.target.value)} rows={5} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <input style={ui.input} placeholder="姓名" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
                <input style={ui.input} placeholder="电话" value={draft.phone || ""} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} />
                <input style={ui.input} placeholder="邮箱" value={draft.email || ""} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} />
                <input style={ui.input} placeholder="地址" value={draft.address || ""} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} />
                <input style={ui.input} placeholder="需求" value={draft.requirement || ""} onChange={(e) => setDraft((prev) => ({ ...prev, requirement: e.target.value }))} />
              </div>
              {duplicateResult.hasDuplicate ? <div style={{ fontSize: 13, color: "#92400e", background: "#fef3c7", borderRadius: 10, padding: 10 }}>发现疑似重复：{duplicateResult.matches.map((m) => m.contact.name).join("，")}</div> : null}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button style={ui.primaryBtn} onClick={handleCreateContact}>保存联系人</button>
                <button style={ui.secondaryBtn} onClick={() => setActiveTab("contacts")}>去联系人页</button>
              </div>
            </div>
          </Section>
        )}

        {activeTab === "contacts" && (
          <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 16, alignItems: "start" }}>
            <Section title="联系人列表" right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input style={ui.input} placeholder="搜索联系人" value={query} onChange={(e) => setQuery(e.target.value)} /><button style={ui.secondaryBtn} onClick={handleExportContacts}>导出 CSV</button></div>}>
              <div style={{ display: "grid", gap: 12 }}>
                {filteredContacts.length === 0 ? <div style={{ color: "#64748b" }}>暂无联系人</div> : filteredContacts.map((contact) => (
                  <button key={contact.id} onClick={() => { setSelectedContactId(contact.id); resetBookingForm(contact); }} style={{ textAlign: "left", border: selectedContact?.id === contact.id ? "1px solid #0f172a" : "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: selectedContact?.id === contact.id ? "#f8fafc" : "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                      <strong style={{ fontSize: 15 }}>{contact.name || "Unnamed"}</strong>
                      <span style={statusBadgeStyle(contact.status)}>{contact.status || "Unknown"}</span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>{contact.phone || "无电话"} {contact.email ? `· ${contact.email}` : ""}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{contact.address || "无地址"}</div>
                    <div style={{ color: "#334155", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{contact.requirement || "无需求描述"}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title={selectedContact ? `联系人详情 · ${selectedContact.name}` : "联系人详情"}>
              {!selectedContact ? <div style={{ color: "#64748b" }}>请选择联系人</div> : (
                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <input style={ui.input} value={selectedContact.name || ""} onChange={(e) => updateSelectedContactField("name", e.target.value)} placeholder="姓名" />
                    <input style={ui.input} value={selectedContact.phone || ""} onChange={(e) => updateSelectedContactField("phone", e.target.value)} placeholder="电话" />
                    <input style={ui.input} value={selectedContact.email || ""} onChange={(e) => updateSelectedContactField("email", e.target.value)} placeholder="邮箱" />
                    <select style={ui.select} value={selectedContact.status || "New Lead"} onChange={(e) => updateSelectedContactField("status", e.target.value)}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}</select>
                  </div>
                  <textarea style={ui.textarea} value={selectedContact.address || ""} onChange={(e) => updateSelectedContactField("address", e.target.value)} placeholder="地址" rows={2} />
                  <textarea style={ui.textarea} value={selectedContact.requirement || ""} onChange={(e) => updateSelectedContactField("requirement", e.target.value)} placeholder="需求" rows={2} />
                  <textarea style={ui.textarea} value={selectedContact.notes || ""} onChange={(e) => updateSelectedContactField("notes", e.target.value)} placeholder="备注" rows={4} />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button style={ui.primaryBtn} onClick={handleSaveContactDetails}>保存联系人</button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Contacted")}>标记 Contacted</button>
                    <button style={ui.secondaryBtn} onClick={() => handleMarkContact(selectedContact, "Quoted")}>标记 Quoted</button>
                    <button style={ui.secondaryBtn} onClick={() => { resetBookingForm(selectedContact); setActiveTab("calendar"); }}>为此联系人建预约</button>
                  </div>
                  <div>
                    <strong style={{ display: "block", marginBottom: 10 }}>该联系人预约</strong>
                    <div style={{ display: "grid", gap: 10 }}>
                      {contactBookings.length === 0 ? <div style={{ color: "#64748b" }}>暂无预约</div> : contactBookings.map((booking) => (
                        <div key={booking.id} style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fcfdff" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                            <strong>{booking.event_type}</strong>
                            <span style={{ color: "#64748b", fontSize: 13 }}>{booking.location_type}</span>
                          </div>
                          <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>{new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button style={ui.secondaryBtn} onClick={() => startEditBooking(booking)}>编辑预约</button>
                            <button style={ui.dangerBtn} onClick={() => handleDeleteBooking(booking.id)}>删除预约</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Section>
          </div>
        )}

        {activeTab === "calendar" && (
          <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 16, alignItems: "start" }}>
            <Section title={editingBookingId ? "编辑预约" : "创建预约"} right={<div style={{ display: "flex", gap: 8 }}><button style={ui.secondaryBtn} onClick={() => resetBookingForm(selectedContact)}>重置</button><button style={ui.secondaryBtn} onClick={handleExportBookings}>导出 CSV</button></div>}>
              <div style={{ display: "grid", gap: 10 }}>
                <select style={ui.select} value={bookingForm.contact_id} onChange={(e) => { const contact = contacts.find((item) => item.id === e.target.value); setBookingForm((prev) => ({ ...prev, contact_id: e.target.value, location_address: contact?.address || prev.location_address })); }}>
                  <option value="">选择联系人</option>
                  {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name} {contact.phone ? `- ${contact.phone}` : ""}</option>)}
                </select>
                <input style={ui.input} placeholder="事件类型" value={bookingForm.event_type} onChange={(e) => setBookingForm((prev) => ({ ...prev, event_type: e.target.value }))} />
                <input style={ui.input} type="date" value={bookingForm.date} onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input style={ui.input} type="time" value={bookingForm.start_time} onChange={(e) => setBookingForm((prev) => ({ ...prev, start_time: e.target.value }))} />
                  <input style={ui.input} type="time" value={bookingForm.end_time} onChange={(e) => setBookingForm((prev) => ({ ...prev, end_time: e.target.value }))} />
                </div>
                <select style={ui.select} value={bookingForm.location_type} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_type: e.target.value }))}>
                  <option value="customer">客户地址</option>
                  <option value="saved">常用地址</option>
                </select>
                {bookingForm.location_type === "saved" ? <select style={ui.select} onChange={(e) => { const loc = savedLocations.find((item) => item.id === e.target.value); if (!loc) return; setBookingForm((prev) => ({ ...prev, location_name: loc.name, location_address: loc.address })); }} defaultValue=""><option value="">选择常用地址</option>{savedLocations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}</select> : null}
                <input style={ui.input} placeholder="地点名称" value={bookingForm.location_name} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_name: e.target.value }))} />
                <textarea style={ui.textarea} placeholder="地点地址" value={bookingForm.location_address} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_address: e.target.value }))} rows={3} />
                <button style={ui.primaryBtn} onClick={handleSaveBooking}>{editingBookingId ? "保存修改" : "保存预约"}</button>
              </div>
            </Section>

            <Section title="预约列表">
              <div style={{ display: "grid", gap: 12 }}>
                {bookings.length === 0 ? <div style={{ color: "#64748b" }}>暂无预约</div> : bookings.slice().sort((a, b) => new Date(a.start_time) - new Date(b.start_time)).map((booking) => {
                  const contact = contacts.find((item) => item.id === booking.contact_id);
                  return (
                    <div key={booking.id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#fff" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                        <div><strong>{booking.event_type}</strong> · {contact?.name || booking.contact_id}</div>
                        <span style={{ ...ui.badge, background: "#eef2ff", color: "#3730a3" }}>{booking.location_type}</span>
                      </div>
                      <div style={{ color: "#475569", fontSize: 14, marginTop: 8 }}>{new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}</div>
                      <div style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>{booking.location_name} · {booking.location_address}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                        <button style={ui.secondaryBtn} onClick={() => startEditBooking(booking)}>编辑</button>
                        <button style={ui.dangerBtn} onClick={() => handleDeleteBooking(booking.id)}>删除</button>
                        <button style={ui.secondaryBtn} onClick={() => { setSelectedContactId(booking.contact_id); setActiveTab("contacts"); }}>看联系人</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "intake" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <Section title="公开 Intake 配置" muted>
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#334155", fontWeight: 600 }}>
                  <input type="checkbox" checked={intakeDraft.is_enabled} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, is_enabled: e.target.checked }))} /> 启用公开 Intake 页面
                </label>
                <input style={ui.input} value={intakeDraft.form_title} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, form_title: e.target.value }))} placeholder="表单标题" />
                <textarea style={ui.textarea} value={intakeDraft.intro_text} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, intro_text: e.target.value }))} rows={5} placeholder="介绍文案" />
                <button style={ui.primaryBtn} onClick={handleSaveIntakeProfile}>保存 Intake 配置</button>
              </div>
            </Section>
            <Section title="Intake 链接与说明">
              <div style={{ display: "grid", gap: 10 }}>
                <div><strong>Token</strong><div style={{ color: "#475569", marginTop: 4 }}>{intakeProfile?.intake_token || "未生成"}</div></div>
                <div><strong>Public URL</strong><div style={{ color: "#475569", marginTop: 4, wordBreak: "break-all" }}>{intakeUrl || "当前不可用"}</div></div>
                <div><button style={ui.secondaryBtn} onClick={() => { if (!intakeUrl) return; navigator.clipboard.writeText(intakeUrl); setMessage("Intake 链接已复制"); }}>复制链接</button></div>
                <div style={{ color: "#64748b", fontSize: 14 }}>已完成首屏拆包，接下来最后一块是 settings 持久化。</div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
            <Section title="Settings 持久化（本地浏览器）" muted>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>状态列表（每行一个）</div>
                  <textarea style={ui.textarea} rows={6} value={(settingsDraft.statusOptions || []).join("\n")} onChange={(e) => updateSettingsList("statusOptions", e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>标签列表（每行一个）</div>
                  <textarea style={ui.textarea} rows={5} value={(settingsDraft.tagOptions || []).join("\n")} onChange={(e) => updateSettingsList("tagOptions", e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 6 }}>预约类型（每行一个）</div>
                  <textarea style={ui.textarea} rows={5} value={(settingsDraft.eventTypes || []).map((item) => item.name || item).join("\n")} onChange={(e) => updateSettingsList("eventTypes", e.target.value)} />
                </div>
                <button style={ui.primaryBtn} onClick={handleSaveSettings}>保存 Settings</button>
              </div>
            </Section>
            <Section title="当前系统状态">
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, color: "#334155" }}>{JSON.stringify({ settingsMode: settings?.mode || "fallback_local", eventTypes: settings?.eventTypes?.map((item) => item.name || item) || ["Measure", "Install", "Call"], tagOptions: settings?.tagOptions || [], statusOptions: settings?.statusOptions || [], savedLocations: savedLocations.map((item) => ({ id: item.id, name: item.name })), intakeProfile, note: "当前先落浏览器本地持久化，不依赖新增数据库表。后续如需要可升级到 Supabase settings 表。", }, null, 2)}</pre>
            </Section>
          </div>
        )}
      </div>
    </div>
  );
}

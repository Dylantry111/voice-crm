import React, { useEffect, useMemo, useState } from "react";
import { createContact, fetchContacts, updateContact } from "./services/contactsService";
import { createBooking, deleteBooking, fetchBookings, updateBooking } from "./services/bookingsService";
import { fetchSavedLocations } from "./services/savedLocationsService";
import {
  fetchOrCreateMyIntakeProfile,
  fetchPublicIntakeProfileByToken,
  submitPublicIntake,
  updateMyIntakeProfile,
} from "./services/publicIntakeService";
import { loadSettings } from "./services/settingsService";
import { supabase } from "./lib/supabase";
import { smartFill } from "./lib/parsers/contactParser";
import { findDuplicateContacts, buildDuplicateMessage } from "./lib/parsers/duplicateChecker";
import { formatDateInputValue } from "./lib/dateUtils";

function Section({ title, children, right }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, boxShadow: "0 1px 2px rgba(15,23,42,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

const STATUS_OPTIONS = ["New Lead", "Contacted", "Quoted", "Won", "Lost"];

function downloadCsv(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
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

function PublicIntakeScreen({ token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    requirement: "",
    notes: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPublicIntakeProfileByToken(token);
        if (!active) return;
        setProfile(data);
      } catch (error) {
        if (!active) return;
        setMessage(`加载失败：${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await submitPublicIntake({ token, form });
      setSubmitted(true);
      setMessage("提交成功，我们会尽快联系你。");
      setForm({ name: "", phone: "", email: "", address: "", requirement: "", notes: "" });
    } catch (error) {
      console.error(error);
      setMessage(`提交失败：${error.message}`);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>链接不可用</h1>
          <p style={{ color: "#475569" }}>这个 intake 页面不存在，或者已经被停用。</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 }}>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <h1 style={{ marginBottom: 8 }}>{profile.form_title || "Customer Information"}</h1>
          <p style={{ color: "#475569", margin: 0 }}>{profile.intro_text || "Please tell us what you need."}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, display: "grid", gap: 12 }}>
          <input required placeholder="Your name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <textarea placeholder="Address" rows={2} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          <textarea required placeholder="What do you need help with?" rows={4} value={form.requirement} onChange={(e) => setForm((prev) => ({ ...prev, requirement: e.target.value }))} />
          <textarea placeholder="Extra notes" rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          <button type="submit">Submit</button>
          {message ? <div style={{ color: submitted ? "#166534" : "#b45309", fontSize: 14 }}>{message}</div> : null}
        </form>
      </div>
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
  const [voiceInput, setVoiceInput] = useState(
    "Tom phone 021 123 4567 email tom@test.com address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters."
  );
  const [draft, setDraft] = useState(() => smartFill(voiceInput));
  const [intakeDraft, setIntakeDraft] = useState({ form_title: "", intro_text: "", is_enabled: true });
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
    if (!isPublicIntakeMode) {
      loadInitialData();
    }
  }, [isPublicIntakeMode]);

  async function loadInitialData() {
    setLoading(true);
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [contactRows, bookingRows, savedLocationRows, intake, settingsData] = await Promise.all([
        fetchContacts(),
        fetchBookings(),
        fetchSavedLocations(),
        fetchOrCreateMyIntakeProfile(),
        loadSettings(),
      ]);

      setContacts(contactRows);
      setBookings(bookingRows);
      setSavedLocations(savedLocationRows);
      setIntakeProfile(intake);
      setSettings(settingsData);
      setIntakeDraft({
        form_title: intake?.form_title || "",
        intro_text: intake?.intro_text || "",
        is_enabled: Boolean(intake?.is_enabled),
      });
      if (!selectedContactId && contactRows[0]?.id) {
        setSelectedContactId(contactRows[0].id);
      }
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
    return contacts.filter((c) =>
      [c.name, c.phone, c.email, c.address, c.requirement, c.status, ...(c.tags || [])]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [contacts, query]);

  const selectedContact = useMemo(() => {
    return contacts.find((item) => item.id === selectedContactId) || filteredContacts[0] || contacts[0] || null;
  }, [contacts, filteredContacts, selectedContactId]);

  const duplicateResult = useMemo(() => findDuplicateContacts(draft, contacts), [draft, contacts]);

  const contactBookings = useMemo(() => {
    if (!selectedContact?.id) return [];
    return bookings
      .filter((item) => item.contact_id === selectedContact.id)
      .sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  }, [bookings, selectedContact]);

  function fillFromVoice() {
    setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) }));
  }

  function resetBookingForm(contact = null) {
    setEditingBookingId("");
    setBookingForm({
      contact_id: contact?.id || "",
      event_type: settings?.eventTypes?.[0]?.name || "Measure",
      date: formatDateInputValue(new Date()),
      start_time: "09:00",
      end_time: "10:00",
      location_name: "Customer Address",
      location_address: contact?.address || "",
      location_type: "customer",
    });
  }

  async function handleCreateContact() {
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");

      if (duplicateResult.hasDuplicate) {
        const proceed = window.confirm(buildDuplicateMessage(duplicateResult));
        if (!proceed) return;
      }

      const newContact = await createContact({
        user_id: user.id,
        name: draft.name || "New Contact",
        phone: draft.phone || "",
        email: draft.email || "",
        address: draft.address || "",
        requirement: draft.requirement || "General enquiry",
        notes: draft.notes || voiceInput,
        status: draft.status || "New Lead",
        tags: draft.tags || [],
        source: "manual",
      });
      setContacts((prev) => [newContact, ...prev]);
      setSelectedContactId(newContact.id);
      resetBookingForm(newContact);
      setActiveTab("contacts");
      setMessage(`已创建联系人：${newContact.name}`);
    } catch (error) {
      console.error(error);
      setMessage(`创建联系人失败：${error.message}`);
    }
  }

  async function handleSaveContactDetails() {
    if (!selectedContact) return;
    setMessage("");
    try {
      const updated = await updateContact(selectedContact.id, {
        name: selectedContact.name || "",
        phone: selectedContact.phone || "",
        email: selectedContact.email || "",
        address: selectedContact.address || "",
        requirement: selectedContact.requirement || "",
        notes: selectedContact.notes || "",
        status: selectedContact.status || "New Lead",
        tags: selectedContact.tags || [],
      });
      setContacts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`联系人已保存：${updated.name}`);
    } catch (error) {
      console.error(error);
      setMessage(`保存联系人失败：${error.message}`);
    }
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

      const payload = {
        user_id: user.id,
        contact_id: bookingForm.contact_id,
        event_type: bookingForm.event_type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location_type: bookingForm.location_type,
        location_name: bookingForm.location_name,
        location_address: bookingForm.location_address,
      };

      if (editingBookingId) {
        const updated = await updateBooking(editingBookingId, payload);
        setBookings((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setMessage("预约已更新");
      } else {
        const created = await createBooking(payload);
        setBookings((prev) => [created, ...prev]);
        setMessage("预约已创建");
      }
      resetBookingForm(selectedContact);
      setActiveTab("calendar");
    } catch (error) {
      console.error(error);
      setMessage(`保存预约失败：${error.message}`);
    }
  }

  async function handleDeleteBooking(bookingId) {
    const ok = window.confirm("确认删除这个预约？");
    if (!ok) return;
    setMessage("");
    try {
      await deleteBooking(bookingId);
      setBookings((prev) => prev.filter((item) => item.id !== bookingId));
      if (editingBookingId === bookingId) {
        resetBookingForm(selectedContact);
      }
      setMessage("预约已删除");
    } catch (error) {
      console.error(error);
      setMessage(`删除预约失败：${error.message}`);
    }
  }

  function startEditBooking(booking) {
    setEditingBookingId(booking.id);
    setActiveTab("calendar");
    setBookingForm({
      contact_id: booking.contact_id || "",
      event_type: booking.event_type || "Measure",
      date: formatDateInputValue(booking.start_time),
      start_time: new Date(booking.start_time).toISOString().slice(11, 16),
      end_time: new Date(booking.end_time).toISOString().slice(11, 16),
      location_name: booking.location_name || "Customer Address",
      location_address: booking.location_address || "",
      location_type: booking.location_type || "customer",
    });
  }

  async function handleMarkContact(contact, nextStatus) {
    setMessage("");
    try {
      const updated = await updateContact(contact.id, { status: nextStatus });
      setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
      if (selectedContactId === contact.id) {
        setSelectedContactId(updated.id);
      }
      setMessage(`已更新 ${contact.name} 状态为 ${nextStatus}`);
    } catch (error) {
      console.error(error);
      setMessage(`更新联系人失败：${error.message}`);
    }
  }

  async function handleSaveIntakeProfile() {
    setMessage("");
    try {
      const updated = await updateMyIntakeProfile(intakeDraft);
      setIntakeProfile(updated);
      setIntakeDraft({
        form_title: updated.form_title || "",
        intro_text: updated.intro_text || "",
        is_enabled: Boolean(updated.is_enabled),
      });
      setMessage("Intake 配置已保存");
    } catch (error) {
      console.error(error);
      setMessage(`保存 Intake 配置失败：${error.message}`);
    }
  }

  function handleExportContacts() {
    const rows = [
      ["name", "phone", "email", "address", "requirement", "status", "created_at"],
      ...filteredContacts.map((contact) => [
        contact.name,
        contact.phone,
        contact.email,
        contact.address,
        contact.requirement,
        contact.status,
        contact.created_at,
      ]),
    ];
    downloadCsv("voice-crm-contacts.csv", rows);
    setMessage("联系人 CSV 已导出");
  }

  function handleExportBookings() {
    const rows = [
      ["event_type", "contact_name", "start_time", "end_time", "location_name", "location_address"],
      ...bookings.map((booking) => {
        const contact = contacts.find((item) => item.id === booking.contact_id);
        return [
          booking.event_type,
          contact?.name || booking.contact_id,
          booking.start_time,
          booking.end_time,
          booking.location_name,
          booking.location_address,
        ];
      }),
    ];
    downloadCsv("voice-crm-bookings.csv", rows);
    setMessage("预约 CSV 已导出");
  }

  function updateSelectedContactField(field, value) {
    if (!selectedContact) return;
    setContacts((prev) => prev.map((item) => (item.id === selectedContact.id ? { ...item, [field]: value } : item)));
  }

  const tabButtons = [
    ["dashboard", "总览"],
    ["contacts", "联系人"],
    ["calendar", "预约"],
    ["capture", "录入"],
    ["intake", "Intake"],
    ["settings", "系统"],
  ];

  const intakeUrl = intakeProfile ? `${window.location.origin}/intake/${intakeProfile.intake_token}` : "";

  if (isPublicIntakeMode) {
    return <PublicIntakeScreen token={publicToken} />;
  }

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: 24, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>Voice CRM</h1>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              旧仓库修复第四阶段：补公开 intake 页面，让线索公开提交链路真正跑通。
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tabButtons.map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  background: activeTab === key ? "#0f172a" : "#fff",
                  color: activeTab === key ? "#fff" : "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  padding: "8px 12px",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", borderRadius: 12, padding: 12 }}>
            {message}
          </div>
        ) : null}

        {(activeTab === "dashboard" || activeTab === "contacts" || activeTab === "calendar") && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Section title="联系人"><div style={{ fontSize: 28, fontWeight: 700 }}>{contacts.length}</div></Section>
            <Section title="预约"><div style={{ fontSize: 28, fontWeight: 700 }}>{bookings.length}</div></Section>
            <Section title="常用地址"><div style={{ fontSize: 28, fontWeight: 700 }}>{savedLocations.length}</div></Section>
            <Section title="公开 Intake">
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                {intakeProfile ? (
                  <>
                    <div>状态：{intakeProfile.is_enabled ? "已启用" : "未启用"}</div>
                    <div>Token：{intakeProfile.intake_token}</div>
                  </>
                ) : "未配置"}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section title="快捷动作">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setActiveTab("capture")}>录入新联系人</button>
                <button onClick={() => setActiveTab("calendar")}>创建预约</button>
                <button onClick={handleExportContacts}>导出联系人</button>
                <button onClick={handleExportBookings}>导出预约</button>
              </div>
            </Section>
            <Section title="最近联系人">
              <div style={{ display: "grid", gap: 8 }}>
                {contacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span>{contact.name}</span>
                    <span style={{ color: "#64748b", fontSize: 13 }}>{contact.status}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {activeTab === "capture" && (
          <Section title="语音转联系人草稿" right={<button onClick={fillFromVoice}>智能填充</button>}>
            <div style={{ display: "grid", gap: 10 }}>
              <textarea value={voiceInput} onChange={(e) => setVoiceInput(e.target.value)} rows={5} style={{ width: "100%", padding: 12 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <input placeholder="姓名" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
                <input placeholder="电话" value={draft.phone || ""} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} />
                <input placeholder="邮箱" value={draft.email || ""} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} />
                <input placeholder="地址" value={draft.address || ""} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} />
                <input placeholder="需求" value={draft.requirement || ""} onChange={(e) => setDraft((prev) => ({ ...prev, requirement: e.target.value }))} />
              </div>
              {duplicateResult.hasDuplicate ? (
                <div style={{ fontSize: 13, color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: 8 }}>
                  发现疑似重复：{duplicateResult.matches.map((m) => m.contact.name).join("，")}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleCreateContact}>保存联系人</button>
                <button onClick={() => { setActiveTab("contacts"); }}>去联系人页</button>
              </div>
            </div>
          </Section>
        )}

        {activeTab === "contacts" && (
          <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 16, alignItems: "start" }}>
            <Section title="联系人列表" right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input placeholder="搜索联系人" value={query} onChange={(e) => setQuery(e.target.value)} /><button onClick={handleExportContacts}>导出 CSV</button></div>}>
              <div style={{ display: "grid", gap: 10 }}>
                {filteredContacts.length === 0 ? (
                  <div style={{ color: "#64748b" }}>暂无联系人</div>
                ) : filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => { setSelectedContactId(contact.id); resetBookingForm(contact); }}
                    style={{
                      textAlign: "left",
                      border: selectedContact?.id === contact.id ? "1px solid #0f172a" : "1px solid #e5e7eb",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <strong>{contact.name || "Unnamed"}</strong>
                      <span style={{ fontSize: 13, color: "#334155" }}>{contact.status || "Unknown"}</span>
                    </div>
                    <div style={{ color: "#475569", fontSize: 14 }}>{contact.phone || "无电话"} {contact.email ? `· ${contact.email}` : ""}</div>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{contact.requirement || "无需求描述"}</div>
                  </button>
                ))}
              </div>
            </Section>

            <Section title={selectedContact ? `联系人详情 · ${selectedContact.name}` : "联系人详情"}>
              {!selectedContact ? (
                <div style={{ color: "#64748b" }}>请选择联系人</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  <input value={selectedContact.name || ""} onChange={(e) => updateSelectedContactField("name", e.target.value)} placeholder="姓名" />
                  <input value={selectedContact.phone || ""} onChange={(e) => updateSelectedContactField("phone", e.target.value)} placeholder="电话" />
                  <input value={selectedContact.email || ""} onChange={(e) => updateSelectedContactField("email", e.target.value)} placeholder="邮箱" />
                  <textarea value={selectedContact.address || ""} onChange={(e) => updateSelectedContactField("address", e.target.value)} placeholder="地址" rows={2} />
                  <textarea value={selectedContact.requirement || ""} onChange={(e) => updateSelectedContactField("requirement", e.target.value)} placeholder="需求" rows={2} />
                  <textarea value={selectedContact.notes || ""} onChange={(e) => updateSelectedContactField("notes", e.target.value)} placeholder="备注" rows={4} />
                  <select value={selectedContact.status || "New Lead"} onChange={(e) => updateSelectedContactField("status", e.target.value)}>
                    {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={handleSaveContactDetails}>保存联系人</button>
                    <button onClick={() => handleMarkContact(selectedContact, "Contacted")}>标记 Contacted</button>
                    <button onClick={() => handleMarkContact(selectedContact, "Quoted")}>标记 Quoted</button>
                    <button onClick={() => { resetBookingForm(selectedContact); setActiveTab("calendar"); }}>为此联系人建预约</button>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <strong style={{ display: "block", marginBottom: 8 }}>该联系人预约</strong>
                    <div style={{ display: "grid", gap: 8 }}>
                      {contactBookings.length === 0 ? (
                        <div style={{ color: "#64748b" }}>暂无预约</div>
                      ) : contactBookings.map((booking) => (
                        <div key={booking.id} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 10 }}>
                          <div><strong>{booking.event_type}</strong></div>
                          <div style={{ color: "#475569", fontSize: 14 }}>
                            {new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}
                          </div>
                          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                            <button onClick={() => startEditBooking(booking)}>编辑预约</button>
                            <button onClick={() => handleDeleteBooking(booking.id)}>删除预约</button>
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
            <Section title={editingBookingId ? "编辑预约" : "创建预约"} right={<div style={{ display: "flex", gap: 8 }}><button onClick={() => resetBookingForm(selectedContact)}>重置</button><button onClick={handleExportBookings}>导出 CSV</button></div>}>
              <div style={{ display: "grid", gap: 10 }}>
                <select value={bookingForm.contact_id} onChange={(e) => {
                  const contact = contacts.find((item) => item.id === e.target.value);
                  setBookingForm((prev) => ({
                    ...prev,
                    contact_id: e.target.value,
                    location_address: contact?.address || prev.location_address,
                  }));
                }}>
                  <option value="">选择联系人</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>{contact.name} {contact.phone ? `- ${contact.phone}` : ""}</option>
                  ))}
                </select>
                <input placeholder="事件类型" value={bookingForm.event_type} onChange={(e) => setBookingForm((prev) => ({ ...prev, event_type: e.target.value }))} />
                <input type="date" value={bookingForm.date} onChange={(e) => setBookingForm((prev) => ({ ...prev, date: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="time" value={bookingForm.start_time} onChange={(e) => setBookingForm((prev) => ({ ...prev, start_time: e.target.value }))} />
                  <input type="time" value={bookingForm.end_time} onChange={(e) => setBookingForm((prev) => ({ ...prev, end_time: e.target.value }))} />
                </div>
                <select value={bookingForm.location_type} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_type: e.target.value }))}>
                  <option value="customer">客户地址</option>
                  <option value="saved">常用地址</option>
                </select>
                {bookingForm.location_type === "saved" ? (
                  <select onChange={(e) => {
                    const loc = savedLocations.find((item) => item.id === e.target.value);
                    if (!loc) return;
                    setBookingForm((prev) => ({
                      ...prev,
                      location_name: loc.name,
                      location_address: loc.address,
                    }));
                  }} defaultValue="">
                    <option value="">选择常用地址</option>
                    {savedLocations.map((loc) => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                ) : null}
                <input placeholder="地点名称" value={bookingForm.location_name} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_name: e.target.value }))} />
                <textarea placeholder="地点地址" value={bookingForm.location_address} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_address: e.target.value }))} rows={3} />
                <button onClick={handleSaveBooking}>{editingBookingId ? "保存修改" : "保存预约"}</button>
              </div>
            </Section>

            <Section title="预约列表">
              <div style={{ display: "grid", gap: 10 }}>
                {bookings.length === 0 ? (
                  <div style={{ color: "#64748b" }}>暂无预约</div>
                ) : bookings
                  .slice()
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .map((booking) => {
                    const contact = contacts.find((item) => item.id === booking.contact_id);
                    return (
                      <div key={booking.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                          <div><strong>{booking.event_type}</strong> · {contact?.name || booking.contact_id}</div>
                          <div style={{ color: "#64748b", fontSize: 13 }}>{booking.location_type}</div>
                        </div>
                        <div style={{ color: "#475569", fontSize: 14 }}>
                          {new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}
                        </div>
                        <div style={{ color: "#475569", fontSize: 14 }}>{booking.location_name} · {booking.location_address}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <button onClick={() => startEditBooking(booking)}>编辑</button>
                          <button onClick={() => handleDeleteBooking(booking.id)}>删除</button>
                          <button onClick={() => { setSelectedContactId(booking.contact_id); setActiveTab("contacts"); }}>看联系人</button>
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
            <Section title="公开 Intake 配置">
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={intakeDraft.is_enabled} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, is_enabled: e.target.checked }))} />
                  启用公开 Intake 页面
                </label>
                <input value={intakeDraft.form_title} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, form_title: e.target.value }))} placeholder="表单标题" />
                <textarea value={intakeDraft.intro_text} onChange={(e) => setIntakeDraft((prev) => ({ ...prev, intro_text: e.target.value }))} rows={5} placeholder="介绍文案" />
                <button onClick={handleSaveIntakeProfile}>保存 Intake 配置</button>
              </div>
            </Section>
            <Section title="Intake 链接与说明">
              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <strong>Token</strong>
                  <div style={{ color: "#475569", marginTop: 4 }}>{intakeProfile?.intake_token || "未生成"}</div>
                </div>
                <div>
                  <strong>Public URL</strong>
                  <div style={{ color: "#475569", marginTop: 4, wordBreak: "break-all" }}>{intakeUrl || "当前不可用"}</div>
                </div>
                <div>
                  <button onClick={() => {
                    if (!intakeUrl) return;
                    navigator.clipboard.writeText(intakeUrl);
                    setMessage("Intake 链接已复制");
                  }}>复制链接</button>
                </div>
                <div style={{ color: "#64748b", fontSize: 14 }}>
                  现在 `/intake/:token` 页面已经补上，可直接对外收集线索并写入 contacts。
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "settings" && (
          <Section title="系统状态 / 当前接管情况">
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>
{JSON.stringify({
  settingsMode: settings?.mode || "fallback_local",
  eventTypes: settings?.eventTypes?.map((item) => item.name || item) || ["Measure", "Install", "Call"],
  savedLocations: savedLocations.map((item) => ({ id: item.id, name: item.name })),
  intakeProfile,
  note: "settings 表当前不存在，因此这里仍是 fallback 模式。",
  deploymentTodo: "下一步建议核对 Vercel 项目、环境变量和线上分支。",
}, null, 2)}
            </pre>
          </Section>
        )}
      </div>
    </div>
  );
}

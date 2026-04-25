import React, { useEffect, useMemo, useState } from "react";
import { createContact, fetchContacts, updateContact } from "./services/contactsService";
import { createBooking, fetchBookings } from "./services/bookingsService";
import { fetchSavedLocations } from "./services/savedLocationsService";
import { fetchOrCreateMyIntakeProfile } from "./services/publicIntakeService";
import { loadSettings } from "./services/settingsService";
import { supabase } from "./lib/supabase";
import { smartFill } from "./lib/parsers/contactParser";
import { findDuplicateContacts, buildDuplicateMessage } from "./lib/parsers/duplicateChecker";
import { formatDateInputValue } from "./lib/dateUtils";

function Section({ title, children, right }) {
  return (
    <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [contacts, setContacts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [intakeProfile, setIntakeProfile] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [voiceInput, setVoiceInput] = useState(
    "Tom phone 021 123 4567 email tom@test.com address 13 Preston Avenue, Mount Albert, Auckland wants living room shutters."
  );
  const [draft, setDraft] = useState(() => smartFill(voiceInput));
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
    loadInitialData();
  }, []);

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

  const duplicateResult = useMemo(() => findDuplicateContacts(draft, contacts), [draft, contacts]);

  function fillFromVoice() {
    setDraft((prev) => ({ ...prev, ...smartFill(voiceInput) }));
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
      setBookingForm((curr) => ({ ...curr, contact_id: newContact.id, location_address: newContact.address || "" }));
      setMessage(`已创建联系人：${newContact.name}`);
    } catch (error) {
      console.error(error);
      setMessage(`创建联系人失败：${error.message}`);
    }
  }

  async function handleCreateBooking() {
    setMessage("");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("请先登录");
      if (!bookingForm.contact_id) throw new Error("请先选择联系人");

      const start = new Date(`${bookingForm.date}T${bookingForm.start_time}:00`);
      const end = new Date(`${bookingForm.date}T${bookingForm.end_time}:00`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("预约时间无效");
      if (end <= start) throw new Error("结束时间必须晚于开始时间");

      const booking = await createBooking({
        user_id: user.id,
        contact_id: bookingForm.contact_id,
        event_type: bookingForm.event_type,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        location_type: bookingForm.location_type,
        location_name: bookingForm.location_name,
        location_address: bookingForm.location_address,
      });
      setBookings((prev) => [booking, ...prev]);
      setMessage("预约已创建");
    } catch (error) {
      console.error(error);
      setMessage(`创建预约失败：${error.message}`);
    }
  }

  async function handleMarkContact(contact, nextStatus) {
    setMessage("");
    try {
      const updated = await updateContact(contact.id, { status: nextStatus });
      setContacts((prev) => prev.map((item) => (item.id === contact.id ? updated : item)));
      setMessage(`已更新 ${contact.name} 状态为 ${nextStatus}`);
    } catch (error) {
      console.error(error);
      setMessage(`更新联系人失败：${error.message}`);
    }
  }

  if (loading) {
    return <div style={{ padding: 24 }}>加载中...</div>;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, display: "grid", gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Voice CRM</h1>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>
            旧仓库修复中的最小可运行版本。已接通 Supabase 联系人、预约、地址与 intake profile。
          </p>
        </div>

        {message ? (
          <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", color: "#155e75", borderRadius: 12, padding: 12 }}>
            {message}
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Section title="联系人">
            <div style={{ fontSize: 28, fontWeight: 700 }}>{contacts.length}</div>
          </Section>
          <Section title="预约">
            <div style={{ fontSize: 28, fontWeight: 700 }}>{bookings.length}</div>
          </Section>
          <Section title="常用地址">
            <div style={{ fontSize: 28, fontWeight: 700 }}>{savedLocations.length}</div>
          </Section>
          <Section title="公开 Intake">
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              {intakeProfile ? (
                <>
                  <div>状态：{intakeProfile.is_enabled ? "已启用" : "未启用"}</div>
                  <div>Token：{intakeProfile.intake_token}</div>
                </>
              ) : (
                "未配置"
              )}
            </div>
          </Section>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, alignItems: "start" }}>
          <Section title="语音转联系人草稿" right={<button onClick={fillFromVoice}>智能填充</button>}>
            <div style={{ display: "grid", gap: 10 }}>
              <textarea value={voiceInput} onChange={(e) => setVoiceInput(e.target.value)} rows={5} style={{ width: "100%", padding: 12 }} />
              <input placeholder="姓名" value={draft.name || ""} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} />
              <input placeholder="电话" value={draft.phone || ""} onChange={(e) => setDraft((prev) => ({ ...prev, phone: e.target.value }))} />
              <input placeholder="邮箱" value={draft.email || ""} onChange={(e) => setDraft((prev) => ({ ...prev, email: e.target.value }))} />
              <input placeholder="地址" value={draft.address || ""} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} />
              <input placeholder="需求" value={draft.requirement || ""} onChange={(e) => setDraft((prev) => ({ ...prev, requirement: e.target.value }))} />
              {duplicateResult.hasDuplicate ? (
                <div style={{ fontSize: 13, color: "#92400e", background: "#fef3c7", borderRadius: 8, padding: 8 }}>
                  发现疑似重复：{duplicateResult.matches.map((m) => m.contact.name).join("，")}
                </div>
              ) : null}
              <button onClick={handleCreateContact}>保存联系人</button>
            </div>
          </Section>

          <Section title="创建预约">
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
              <input placeholder="地点名称" value={bookingForm.location_name} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_name: e.target.value }))} />
              <textarea placeholder="地点地址" value={bookingForm.location_address} onChange={(e) => setBookingForm((prev) => ({ ...prev, location_address: e.target.value }))} rows={3} />
              <button onClick={handleCreateBooking}>保存预约</button>
            </div>
          </Section>
        </div>

        <Section title="联系人列表" right={<input placeholder="搜索联系人" value={query} onChange={(e) => setQuery(e.target.value)} />}>
          <div style={{ display: "grid", gap: 10 }}>
            {filteredContacts.length === 0 ? (
              <div style={{ color: "#64748b" }}>暂无联系人</div>
            ) : filteredContacts.map((contact) => (
              <div key={contact.id} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, display: "grid", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{contact.name || "Unnamed"}</strong>
                    <div style={{ color: "#475569", fontSize: 14 }}>{contact.phone || "无电话"} {contact.email ? `· ${contact.email}` : ""}</div>
                  </div>
                  <div style={{ fontSize: 13, color: "#334155" }}>{contact.status || "Unknown"}</div>
                </div>
                <div style={{ fontSize: 14, color: "#475569" }}>{contact.address || "无地址"}</div>
                <div style={{ fontSize: 14 }}>{contact.requirement || "无需求描述"}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => handleMarkContact(contact, "Contacted")}>标记 Contacted</button>
                  <button onClick={() => handleMarkContact(contact, "Quoted")}>标记 Quoted</button>
                  <button onClick={() => setBookingForm((prev) => ({
                    ...prev,
                    contact_id: contact.id,
                    location_address: contact.address || "",
                  }))}>带入预约</button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="最近预约">
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
                    <div><strong>{booking.event_type}</strong> · {contact?.name || booking.contact_id}</div>
                    <div style={{ color: "#475569", fontSize: 14 }}>
                      {new Date(booking.start_time).toLocaleString("en-NZ")} → {new Date(booking.end_time).toLocaleString("en-NZ")}
                    </div>
                    <div style={{ color: "#475569", fontSize: 14 }}>{booking.location_name} · {booking.location_address}</div>
                  </div>
                );
              })}
          </div>
        </Section>

        <Section title="系统状态">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13 }}>
{JSON.stringify({
  settingsMode: settings?.mode || "fallback_local",
  eventTypes: settings?.eventTypes?.map((item) => item.name || item) || ["Measure", "Install", "Call"],
  savedLocations: savedLocations.map((item) => item.name),
}, null, 2)}
          </pre>
        </Section>
      </div>
    </div>
  );
}

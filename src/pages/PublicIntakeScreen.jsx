import React, { useEffect, useState } from "react";
import { fetchPublicIntakeProfileByToken, submitPublicIntake } from "../services/publicIntakeService";

export default function PublicIntakeScreen({ token }) {
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

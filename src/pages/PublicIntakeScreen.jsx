import React, { useEffect, useState } from "react";
import { fetchPublicIntakeProfileByToken, submitPublicIntake } from "../services/publicIntakeService";

const styles = {
  shell: { minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)", padding: 24 },
  wrap: { maxWidth: 720, margin: "0 auto", display: "grid", gap: 16 },
  hero: { textAlign: "center", marginTop: 24 },
  brand: { fontSize: 14, color: "#2563eb", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20, padding: 22, display: "grid", gap: 14, boxShadow: "0 18px 40px rgba(15,23,42,0.08)" },
  input: { width: "100%", height: 44, borderRadius: 12, border: "1px solid #cbd5e1", padding: "0 12px", background: "#fff", color: "#0f172a" },
  textarea: { width: "100%", borderRadius: 12, border: "1px solid #cbd5e1", padding: 12, background: "#fff", color: "#0f172a", resize: "vertical" },
  primaryBtn: { background: "#0f172a", color: "#fff", border: "1px solid #0f172a", borderRadius: 12, padding: "11px 14px", fontWeight: 700 },
  muted: { color: "#64748b", fontSize: 14 },
};

export default function PublicIntakeScreen({ token }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", requirement: "", preferred_booking_notes: "", notes: "" });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchPublicIntakeProfileByToken(token);
        if (!active) return;
        setProfile(data);
      } catch (error) {
        if (!active) return;
        setMessage(`Load failed: ${error.message}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    try {
      await submitPublicIntake({ token, form });
      setSubmitted(true);
      setMessage("Submitted successfully. We’ll contact you soon and arrange the next booking step.");
      setForm({ name: "", phone: "", email: "", address: "", requirement: "", preferred_booking_notes: "", notes: "" });
    } catch (error) {
      console.error(error);
      setMessage(`Submission failed: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div style={styles.shell}>
        <div style={styles.wrap}>
          <div className="skeleton" style={{ height: 48, borderRadius: 14 }} />
          <div className="skeleton" style={{ height: 360, borderRadius: 20 }} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ maxWidth: 560, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Link unavailable</h1>
          <p style={styles.muted}>This intake page does not exist or has been disabled.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <div style={styles.wrap}>
        <div style={styles.hero}>
          <div style={styles.brand}>Voice CRM Intake</div>
          <h1 style={{ marginBottom: 8, fontSize: 34, letterSpacing: "-0.04em" }}>{profile.form_title || "Customer Information"}</h1>
          <p style={{ color: "#475569", margin: 0, fontSize: 16 }}>{profile.intro_text || "Please tell us what you need."}</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.card}>
          <div className="field-grid-2">
            <input style={styles.input} required placeholder="Your name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            <input style={styles.input} placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          </div>
          <input style={styles.input} type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <textarea style={styles.textarea} placeholder="Address" rows={2} value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
          <textarea style={styles.textarea} required placeholder="What do you need help with?" rows={4} value={form.requirement} onChange={(e) => setForm((prev) => ({ ...prev, requirement: e.target.value }))} />
          <textarea style={styles.textarea} placeholder="Preferred time for booking (e.g. Friday afternoon / tomorrow morning)" rows={2} value={form.preferred_booking_notes} onChange={(e) => setForm((prev) => ({ ...prev, preferred_booking_notes: e.target.value }))} />
          <textarea style={styles.textarea} placeholder="Extra notes" rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
          <button style={styles.primaryBtn} type="submit">Submit</button>
          {message ? <div style={{ color: submitted ? "#166534" : "#b45309", fontSize: 14, background: submitted ? "#dcfce7" : "#fef3c7", borderRadius: 12, padding: 10 }}>{message}</div> : null}
        </form>
      </div>
    </div>
  );
}

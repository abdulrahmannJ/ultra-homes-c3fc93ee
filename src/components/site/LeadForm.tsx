import { useState } from "react";

import { submitLead } from "@/lib/mutations.functions";

export function LeadForm({
  source,
  propertyId,
  title = "Send an Inquiry",
  dark = false,
}: {
  source: string;
  propertyId?: string;
  title?: string;
  dark?: boolean;
}) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      await submitLead({
        data: { ...form, source, property_id: propertyId },
      });
      setStatus("done");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  const inputCls = dark
    ? "w-full rounded-sm border border-ivory/15 bg-ivory/5 px-4 py-3 text-sm text-ivory placeholder:text-ivory/40 focus:border-gold focus:outline-none"
    : "w-full rounded-sm border border-input bg-card px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h3 className={`font-display text-xl font-semibold ${dark ? "text-ivory" : "text-foreground"}`}>
        {title}
      </h3>
      <input
        required
        placeholder="Full name"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={inputCls}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={inputCls}
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className={inputCls}
        />
      </div>
      <textarea
        rows={4}
        placeholder="Your message"
        value={form.message}
        onChange={(e) => setForm({ ...form, message: e.target.value })}
        className={inputCls}
      />
      <button
        disabled={status === "sending"}
        className="w-full rounded-sm bg-gradient-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-navy-deep transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Submit"}
      </button>
      {status === "done" && (
        <p className="text-sm text-gold">Thank you. Our team will reach out shortly.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-destructive">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}

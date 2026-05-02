"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { applications, type Application, ApiError } from "@/lib/api";

const STATUSES = [
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
] as const;

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  screening: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  interviewing: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  offer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  withdrawn: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export default function DashboardPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    try {
      const { applications: list } = await applications.list();
      setApps(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="text-sm text-slate-400 mt-1">
            {apps.length} total · click to analyze with the LangGraph agent
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-violet-500 hover:bg-violet-400 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {showForm ? "Cancel" : "+ New application"}
        </button>
      </div>

      {showForm && (
        <CreateForm
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg animate-shimmer" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
          <p className="text-slate-400 mb-4">No applications yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-violet-400 hover:text-violet-300"
          >
            Add your first one →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/dashboard/${app.id}`}
              className="block rounded-lg border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 px-4 py-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium text-slate-100 truncate">
                    {app.position_title}
                  </h3>
                  <p className="text-sm text-slate-400 truncate">
                    {app.company_name}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[app.status] ?? STATUS_COLORS.applied
                  }`}
                >
                  {app.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateForm({ onCreated }: { onCreated: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("applied");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await applications.create({
        company_name: companyName,
        position_title: positionTitle,
        status,
        job_url: jobUrl || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/50 p-6"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Company" value={companyName} onChange={setCompanyName} required />
        <Field label="Position" value={positionTitle} onChange={setPositionTitle} required />
      </div>
      <Field
        label="Job URL (optional)"
        type="url"
        value={jobUrl}
        onChange={setJobUrl}
        placeholder="https://..."
      />
      <label className="block">
        <span className="text-xs font-medium text-slate-300 mb-1.5 block">
          Notes (optional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How you applied, referrals, anything notable..."
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 resize-none"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-300 mb-1.5 block">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
      >
        {submitting ? "Creating..." : "Create application"}
      </button>
    </form>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-300 mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
      />
    </label>
  );
}

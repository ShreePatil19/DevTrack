"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import {
  agents,
  ApiError,
  applications,
  type AgentAnalyzeResponse,
  type Application,
} from "@/lib/api";

const FIT_COLORS = {
  Low: "bg-red-500/20 text-red-300 border-red-500/30",
  Medium: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  High: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AgentAnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    applications
      .get(id)
      .then(({ application }) => setApp(application))
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleAnalyze = async () => {
    setError(null);
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const result = await agents.analyze(id);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Agent failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this application?")) return;
    try {
      await applications.delete(id);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 rounded animate-shimmer" />
        <div className="h-32 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Application not found.</p>
        <Link href="/dashboard" className="text-violet-400 hover:text-violet-300 text-sm mt-2 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← All applications
      </Link>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {app.position_title}
            </h1>
            <p className="text-slate-400 mt-1">{app.company_name}</p>
          </div>
          <button
            onClick={handleDelete}
            className="text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2 text-sm">
          <DetailField label="Status" value={app.status} mono />
          <DetailField
            label="Applied"
            value={new Date(app.applied_date).toLocaleDateString()}
          />
          {app.job_url && (
            <DetailField
              label="Job URL"
              value={
                <a
                  href={app.job_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline truncate inline-block max-w-full"
                >
                  {app.job_url}
                </a>
              }
            />
          )}
        </div>

        {app.notes && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-1">Notes</p>
            <p className="text-sm text-slate-200 whitespace-pre-wrap">
              {app.notes}
            </p>
          </div>
        )}
      </div>

      {/* AI Agent section */}
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <svg
                className="h-4 w-4 text-violet-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              LangGraph Job Intelligence Agent
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              4-node workflow: profile → JD synthesis → gap analysis → talking points
            </p>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="rounded-lg bg-violet-500 hover:bg-violet-400 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors animate-pulse-glow disabled:animate-none whitespace-nowrap"
          >
            {analyzing ? "Running agent..." : "Analyze with AI"}
          </button>
        </div>

        {analyzing && (
          <div className="rounded-lg bg-slate-900/50 p-4 space-y-2 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
              Calling Groq Llama 3.3 70B...
            </div>
            <p className="text-xs text-slate-500">
              Typical run: 5-15 seconds depending on cold start.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        {analysis && <AnalysisResult analysis={analysis} />}
      </div>
    </div>
  );
}

function AnalysisResult({ analysis }: { analysis: AgentAnalyzeResponse }) {
  const { data, execution_metadata: meta } = analysis;
  const fit = data.gap_analysis?.fit_score ?? "Medium";

  return (
    <div className="space-y-4">
      {/* Metadata bar */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full border px-2 py-0.5 font-medium ${
            FIT_COLORS[fit as keyof typeof FIT_COLORS] ?? FIT_COLORS.Medium
          }`}
        >
          Fit: {fit}
        </span>
        <Badge label={`${meta.duration_ms}ms`} />
        <Badge label={`$${meta.token_cost_usd.toFixed(6)}`} />
        <Badge label={`${meta.nodes_executed.length} nodes`} />
        {meta.circuit_breaker_triggered && (
          <Badge label="circuit breaker" variant="warn" />
        )}
        <Link
          href={`/dashboard/runs/${meta.run_id}`}
          className="ml-auto text-violet-400 hover:text-violet-300 text-xs underline"
        >
          View full trace →
        </Link>
      </div>

      {data.gap_analysis && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Section title="Strengths" items={data.gap_analysis.strengths} accent="emerald" />
          <Section title="Gaps" items={data.gap_analysis.gaps} accent="amber" />
        </div>
      )}

      {data.gap_analysis?.fit_rationale && (
        <p className="text-sm text-slate-300 italic">
          &ldquo;{data.gap_analysis.fit_rationale}&rdquo;
        </p>
      )}

      {data.talking_points.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            Talking points
          </h3>
          <ul className="space-y-2">
            {data.talking_points.map((point, i) => (
              <li
                key={i}
                className="text-sm text-slate-300 pl-4 border-l-2 border-violet-500/40"
              >
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-300">
          Agent error: {data.error}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: "emerald" | "amber";
}) {
  const colors = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-200",
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[accent]}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">
        {title}
      </h3>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Badge({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "warn";
}) {
  const cls =
    variant === "warn"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-slate-800 text-slate-300 border-slate-700";
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-mono ${cls}`}
    >
      {label}
    </span>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-1">{label}</p>
      <p className={`text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </p>
    </div>
  );
}

"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { agents, ApiError, type AgentRunTrace } from "@/lib/api";

const NODE_LABELS: Record<string, string> = {
  fetch_profile: "Fetch Profile",
  fetch_job_description: "Fetch Job Description",
  analyze_gap: "Gap Analysis",
  generate_talking_points: "Talking Points",
  handle_error: "Error Handler",
};

const NODE_DESCRIPTIONS: Record<string, string> = {
  fetch_profile: "Synthesises candidate context from the application record.",
  fetch_job_description: "LLM call — synthesises a JD summary from URL/title/company.",
  analyze_gap:
    "LLM call with structured output. Circuit breaker: retries on unparseable JSON, max 2x.",
  generate_talking_points: "LLM call — actionable talking points from the gap analysis.",
  handle_error: "Reached when circuit breaker exhausts. Returns empty result + error.",
};

export default function RunTracePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const [trace, setTrace] = useState<AgentRunTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    agents
      .getRun(runId)
      .then(setTrace)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load run trace"
        )
      )
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-6 w-1/3 rounded animate-shimmer" />
        <div className="h-32 rounded-xl animate-shimmer" />
        <div className="h-32 rounded-xl animate-shimmer" />
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-slate-400">{error ?? "Run not found"}</p>
        <Link
          href="/dashboard"
          className="text-violet-400 hover:text-violet-300 text-sm"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const totalDuration = trace.node_trace.reduce(
    (sum, n) => sum + n.duration_ms,
    0
  );
  const meta = trace.execution_metadata;

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/${trace.application_id}`}
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Back to application
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Agent Run Trace
        </h1>
        <p className="text-sm text-slate-500 font-mono mt-1">{runId}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Total duration" value={`${totalDuration}ms`} />
        <Stat label="Nodes executed" value={meta.nodes_executed.length.toString()} />
        <Stat
          label="Token cost"
          value={`$${meta.token_cost_usd.toFixed(6)}`}
        />
        <Stat
          label="Circuit breaker"
          value={meta.circuit_breaker_triggered ? "TRIGGERED" : "OK"}
          warn={meta.circuit_breaker_triggered}
        />
      </div>

      {/* Graph visualization */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">
          Execution graph
        </h2>
        <NodeFlow nodes={trace.node_trace.map((n) => n.node)} />
      </div>

      {/* Node-by-node trace */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-300">
          Node-by-node trace
        </h2>
        {trace.node_trace.map((node, i) => (
          <NodeCard key={i} index={i} node={node} totalDuration={totalDuration} />
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p
        className={`text-lg font-mono font-semibold ${
          warn ? "text-amber-300" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function NodeFlow({ nodes }: { nodes: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {nodes.map((node, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 font-mono">
            {NODE_LABELS[node] ?? node}
          </div>
          {i < nodes.length - 1 && (
            <svg
              className="h-3 w-3 text-slate-600"
              viewBox="0 0 12 12"
              fill="currentColor"
            >
              <path d="M4 2l4 4-4 4V2z" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

function NodeCard({
  index,
  node,
  totalDuration,
}: {
  index: number;
  node: { node: string; input_snapshot: unknown; output_snapshot: unknown; duration_ms: number };
  totalDuration: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = totalDuration > 0 ? (node.duration_ms / totalDuration) * 100 : 0;

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 hover:bg-slate-900 transition-colors text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="shrink-0 h-6 w-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-mono flex items-center justify-center">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 font-mono text-sm">
                {node.node}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {NODE_DESCRIPTIONS[node.node] ?? "Node execution"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-mono text-slate-300">
              {node.duration_ms}ms
            </span>
            <svg
              className={`h-4 w-4 text-slate-500 transition-transform ${
                expanded ? "rotate-90" : ""
              }`}
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M5 3l5 5-5 5V3z" />
            </svg>
          </div>
        </div>

        {/* Duration bar */}
        <div className="mt-2 h-1 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-violet-500/60 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-3">
          <Snapshot label="Input" data={node.input_snapshot} />
          <Snapshot label="Output" data={node.output_snapshot} />
        </div>
      )}
    </div>
  );
}

function Snapshot({ label, data }: { label: string; data: unknown }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
        {label}
      </p>
      <pre className="rounded-md bg-slate-950 border border-slate-800 p-3 text-xs text-slate-300 font-mono overflow-x-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

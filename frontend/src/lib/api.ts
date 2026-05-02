/**
 * Thin client for the DevTrack Node.js API.
 * The Node API proxies agent calls to the Python LangGraph service,
 * so the frontend talks only to one base URL.
 */

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const TOKEN_KEY = "devtrack_token";

// ─── Token helpers ──────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

// ─── Core fetch wrapper ─────────────────────────────────────────

interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let payload: { error?: string; details?: unknown } = {};
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    throw new ApiError(
      res.status,
      payload.error || `HTTP ${res.status}`,
      payload.details
    );
  }

  return res.json();
}

// ─── Domain types ───────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface Application {
  id: string;
  user_id: string;
  company_name: string;
  position_title: string;
  status: string;
  job_url: string | null;
  notes: string | null;
  applied_date: string;
  created_at: string;
  updated_at: string;
}

export interface AgentAnalyzeResponse {
  data: {
    gap_analysis: {
      strengths: string[];
      gaps: string[];
      fit_score: "Low" | "Medium" | "High";
      fit_rationale: string;
    } | null;
    talking_points: string[];
    error: string | null;
  };
  execution_metadata: {
    run_id: string;
    token_cost_usd: number;
    duration_ms: number;
    circuit_breaker_triggered: boolean;
    nodes_executed: string[];
  };
}

export interface NodeTraceEntry {
  node: string;
  input_snapshot: Record<string, unknown>;
  output_snapshot: Record<string, unknown>;
  duration_ms: number;
}

export interface AgentRunTrace {
  run_id: string;
  application_id: string;
  node_trace: NodeTraceEntry[];
  final_state_summary: Record<string, unknown>;
  execution_metadata: AgentAnalyzeResponse["execution_metadata"];
}

// ─── Auth ───────────────────────────────────────────────────────

export const auth = {
  register: (email: string, password: string) =>
    request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  me: () => request<{ user: User }>("/api/auth/me"),
};

// ─── Applications ───────────────────────────────────────────────

export const applications = {
  list: () =>
    request<{ applications: Application[]; source?: string }>(
      "/api/applications"
    ),

  get: (id: string) =>
    request<{ application: Application }>(`/api/applications/${id}`),

  create: (data: {
    company_name: string;
    position_title: string;
    status?: string;
    job_url?: string;
    notes?: string;
  }) =>
    request<{ application: Application }>("/api/applications", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Partial<Application>) =>
    request<{ application: Application }>(`/api/applications/${id}`, {
      method: "PUT",
      body: data,
    }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/applications/${id}`, {
      method: "DELETE",
    }),
};

// ─── Agents ─────────────────────────────────────────────────────

export const agents = {
  analyze: (application_id: string) =>
    request<AgentAnalyzeResponse>("/api/agents/analyze", {
      method: "POST",
      body: { application_id },
    }),

  getRun: (run_id: string) =>
    request<AgentRunTrace>(`/api/agents/runs/${run_id}`),
};

export { ApiError };

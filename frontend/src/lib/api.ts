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

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string | null;
  location: string | null;
  job_url: string | null;
  source: string;
  is_active: boolean;
  posted_at: string;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  version: string;
  is_default: boolean;
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

// ─── Jobs ────────────────────────────────────────────────────────

export const jobs = {
  list: (params?: { search?: string; location?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.location) qs.set("location", params.location);
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return request<{ jobs: Job[]; total: number; source?: string }>(`/api/jobs${query}`);
  },

  get: (id: string) => request<{ job: Job }>(`/api/jobs/${id}`),

  create: (data: {
    title: string;
    company: string;
    description?: string;
    location?: string;
    job_url?: string;
    source?: string;
  }) =>
    request<{ job: Job }>("/api/jobs", { method: "POST", body: data }),

  update: (id: string, data: Partial<Omit<Job, "id" | "created_at" | "posted_at">>) =>
    request<{ job: Job }>(`/api/jobs/${id}`, { method: "PUT", body: data }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/jobs/${id}`, { method: "DELETE" }),
};

// ─── Resumes ─────────────────────────────────────────────────────

export const resumes = {
  list: () => request<{ resumes: Resume[]; source?: string }>("/api/resumes"),

  get: (id: string) => request<{ resume: Resume }>(`/api/resumes/${id}`),

  create: (data: { name: string; file_url: string; version?: string; is_default?: boolean }) =>
    request<{ resume: Resume }>("/api/resumes", { method: "POST", body: data }),

  update: (id: string, data: Partial<Pick<Resume, "name" | "file_url" | "version" | "is_default">>) =>
    request<{ resume: Resume }>(`/api/resumes/${id}`, { method: "PUT", body: data }),

  setDefault: (id: string) =>
    request<{ resume: Resume }>(`/api/resumes/${id}/default`, { method: "PATCH" }),

  delete: (id: string) =>
    request<{ message: string }>(`/api/resumes/${id}`, { method: "DELETE" }),
};

export { ApiError };

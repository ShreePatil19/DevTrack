import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-3xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
          <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          LangGraph + Groq · $0 inference cost
        </div>

        <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight bg-gradient-to-br from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          DevTrack
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Agentic job intelligence. A 4-node LangGraph workflow analyzes every application —
          gap analysis, talking points, full execution trace, circuit breaker on failure.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-violet-500 hover:bg-violet-400 px-6 py-3 text-sm font-medium text-white transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 hover:border-slate-500 hover:bg-slate-800 px-6 py-3 text-sm font-medium text-slate-200 transition-colors"
          >
            Sign in
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 pt-12 text-left">
          <FeatureCard
            title="Stateful agent"
            body="LangGraph StateGraph with TypedDict state and conditional edges."
          />
          <FeatureCard
            title="Circuit breaker"
            body="Retries unparseable LLM output up to 2× before routing to error state."
          />
          <FeatureCard
            title="Inspectable trace"
            body="Every node's input, output, duration, and token cost surfaced via /runs/{id}."
          />
        </div>

        <p className="text-xs text-slate-600 pt-12">
          Open source ·{" "}
          <a
            href="https://github.com/ShreePatil19/DevTrack"
            className="underline hover:text-slate-400"
          >
            github.com/ShreePatil19/DevTrack
          </a>
        </p>
      </div>
    </main>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

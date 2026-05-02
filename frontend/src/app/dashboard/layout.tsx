"use client";

import Link from "next/link";
import { useAuth } from "@/lib/use-auth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-violet-500 animate-spin" />
      </main>
    );
  }

  if (!user) return null; // useAuth already redirects

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="font-semibold tracking-tight flex items-center gap-2"
          >
            <span className="h-2 w-2 rounded-full bg-violet-400" />
            DevTrack
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">
              {user.email}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </>
  );
}

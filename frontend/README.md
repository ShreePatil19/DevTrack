# DevTrack Frontend

Next.js 16 + React 19 + Tailwind v4. The dashboard for the DevTrack agentic API.

## What it shows

- Auth (register / login / logout) — JWT stored in `localStorage`
- Applications dashboard — list, create, view detail
- **Agent run trace viewer** — visualizes every LangGraph node's input, output, duration, and token cost. This is the demo piece.

## Local dev

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_URL to your local Node API (default http://localhost:3000)
npm run dev
```

Open http://localhost:3001 (or whichever port Next picks).

You also need:
- `devtrack-api` running on `localhost:3000` (the Node.js API)
- `devtrack-agents` running on `localhost:8000` (the Python LangGraph service)

Or point `NEXT_PUBLIC_API_URL` at the live Render `devtrack-api` URL.

## Deploy to Vercel

1. Push the repo to GitHub (already done if you cloned this).
2. Go to https://vercel.com/new
3. **Import Git Repository** → select your `DevTrack` repo
4. **Root Directory:** click "Edit" and set it to `frontend` ⚠️ critical
5. **Framework Preset:** Next.js (auto-detected)
6. **Environment Variables:** add one:
   - `NEXT_PUBLIC_API_URL` = `https://devtrack-api-XXXX.onrender.com` (your live Render API URL)
7. Click **Deploy**. ~2 min build.

Vercel auto-deploys on every push to `main` after this is set up.

## Structure

```
src/
├── app/
│   ├── layout.tsx              ← Root layout, dark theme
│   ├── page.tsx                ← Landing page
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx          ← Auth-gated, shows navbar
│   │   ├── page.tsx            ← List + create
│   │   ├── [id]/page.tsx       ← Application detail + Analyze button
│   │   └── runs/[runId]/page.tsx  ← The killer feature: agent trace viewer
│   └── globals.css             ← Dark theme + animations
└── lib/
    ├── api.ts                  ← Typed client for the Node.js API
    └── use-auth.ts             ← Auth hook with redirect logic
```

## Tech notes

- Pages that need state / browser APIs use `"use client"`. Dashboard pages are all client components because they need `localStorage` for the JWT.
- Server components only used for the static landing page.
- `params` are Promises in Next 15+ — unwrapped with `use(params)`.

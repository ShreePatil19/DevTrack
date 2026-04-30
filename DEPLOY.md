# Free deployment guide

Total cost: **$0**. Total time: ~30 minutes.

You need accounts on: GitHub (you have), Groq, Neon, Upstash, Render. All free, no credit cards.

---

## 1. Get the LLM key (Groq, 2 min)

1. Go to https://console.groq.com
2. Sign in with Google/GitHub
3. Click **API Keys** → **Create API Key**
4. Copy the key (starts with `gsk_...`) — you'll need it later

## 2. Get the database (Neon.tech, 3 min)

1. Go to https://neon.tech
2. Sign in with GitHub
3. Create a project named `devtrack`
4. On the project dashboard, copy the **connection string** (starts with `postgresql://...`)

## 3. Get Redis (Upstash, 3 min)

1. Go to https://upstash.com
2. Sign in with GitHub
3. **Create database** → name it `devtrack-cache`, pick the region closest to where you'll deploy
4. On the database page, copy the **Redis URL** (starts with `redis://...` or `rediss://...`)

## 4. Push to GitHub (2 min)

```bash
cd "path\to\devtrack-api"
git add .
git commit -m "Add LangGraph agent microservice with multi-provider LLM support"
git push origin main
```

(If prompted to set upstream: `git push -u origin main`)

## 5. Deploy the Node.js API on Render (10 min)

1. Go to https://render.com → sign in with GitHub
2. **New +** → **Web Service**
3. **Connect** your `DevTrack` repository
4. Configure:
   - **Name:** `devtrack-api`
   - **Region:** Singapore (closest to Sydney)
   - **Branch:** `main`
   - **Runtime:** Docker
   - **Dockerfile path:** `./Dockerfile`
   - **Plan:** Free
5. Scroll to **Environment Variables** and add:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<Neon connection string from step 2>
   REDIS_URL=<Upstash URL from step 3>
   JWT_SECRET=<generate a 32+ char random string>
   JWT_EXPIRES_IN=1h
   AGENTS_SERVICE_URL=https://devtrack-agents.onrender.com
   ```
   *(We'll create `devtrack-agents` next — keep this URL even though it doesn't exist yet.)*
6. Click **Create Web Service**. First build takes ~5 min.

## 6. Deploy the Python agents service on Render (10 min)

1. Render dashboard → **New +** → **Web Service**
2. Same repo
3. Configure:
   - **Name:** `devtrack-agents`
   - **Region:** Singapore
   - **Branch:** `main`
   - **Runtime:** Docker
   - **Dockerfile path:** `./agents/Dockerfile`
   - **Docker context:** `./agents`
   - **Plan:** Free
4. Environment variables:
   ```
   LLM_PROVIDER=groq
   GROQ_API_KEY=<your Groq key from step 1>
   GROQ_MODEL=llama-3.3-70b-versatile
   LOG_LEVEL=INFO
   ```
5. Click **Create Web Service**. First build takes ~3-5 min.

## 7. Wire the API to the agents service

Render auto-assigns URLs like `https://devtrack-agents-xxxx.onrender.com`. After step 6 completes:

1. Copy the actual URL of `devtrack-agents`
2. Go to `devtrack-api` → Environment → update `AGENTS_SERVICE_URL` to the real URL
3. Click **Save Changes** — Render redeploys automatically

## 8. Set up CI deploy hook (optional but cool)

To make `git push origin main` trigger an auto-deploy:

1. In each Render service → **Settings** → scroll to **Deploy Hook** → copy the URL
2. In GitHub: repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
3. Add `RENDER_DEPLOY_HOOK_URL` = the deploy hook URL (use the api one — agents has its own auto-deploy from Render)
4. Push any change to `main` — GitHub Actions will run tests, then trigger Render

## 9. Test the live deployment

```bash
# Replace with your actual Render URL
API=https://devtrack-api-xxxx.onrender.com

# Wake up the free tier (first request after sleep takes ~30s)
curl $API/health

# Register
curl -X POST $API/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"password123"}'

# ... same demo flow as in README.md
```

---

## Render free tier gotchas

- **Sleeps after 15 min of inactivity.** First request after sleep takes 30-60 seconds (cold start). Subsequent requests are fast.
- **750 hours/month per service.** With 2 services that's enough for one always-warm or both occasionally-used.
- **Mitigation:** Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 5 min if you want to keep the API warm for an interview demo.

## Custom domain (optional)

Render supports free custom domains with auto-SSL. If you have a domain (Namecheap, Cloudflare), point a CNAME at your Render URL and it just works.

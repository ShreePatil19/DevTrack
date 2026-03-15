# DevTrack API

A production-grade RESTful API in Node.js/Express featuring JWT-based authentication, role-based access control, PostgreSQL data persistence, Redis caching, and Swagger OpenAPI documentation.

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start PostgreSQL to match your `.env` settings.
3. Start Redis Server.

4. Start the application:
   ```bash
   npm run dev
   ```

## Deploying for Free

This API is designed to be deployed entirely on free tiers across these excellent services:

### 1. Database (PostgreSQL) - Neon.tech or Supabase
- Create a free Postgres database on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/).
- Get your connection URI (starting with `postgresql://`).
- Set it as your `DATABASE_URL` environment variable. The app is configured with `rejectUnauthorized: false` to connect seamlessly.

### 2. Caching (Redis) - Upstash
- Create a free Redis database on [Upstash](https://upstash.com/).
- Get the Redis URL.
- Set it as your `REDIS_URL` environment variable.

### 3. Application Hosting - Render
- Create a new "Web Service" on [Render.com](https://render.com/).
- Connect this GitHub repository.
- Use `npm install` as the build command.
- Use `npm start` as the start command.
- In the Render Dashboard, add the following Environment Variables:
  - `DATABASE_URL` = your database URI
  - `REDIS_URL` = your redis URI
  - `JWT_SECRET` = your secret key for signing tokens
  - `NODE_ENV` = production

That's it! Render will deploy your Node.js application, connect it to your managed data stores, and it will be available with free HTTPS routing.

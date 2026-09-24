# Stavarkling Admin Panel

Operations console for the Stavarkling site — review access applications, update status, and advance journey stages.

## Setup

1. Copy env and fill in values (including the same `DATABASE_URL` as Stavarkling):

```bash
cp .env.example .env.local
```

Required keys:

- `DATABASE_URL` — same Supabase Postgres URI as the Stavarkling app
- `ADMIN_SESSION_SECRET` — long random string (min 16 chars)
- `ADMIN_BOOTSTRAP_PASSWORD` — used once to create the first admin row

2. Run the admin auth migration in Supabase:

`db/migrations/006_admin_auth.sql`
(also mirrored under `stavarkling/db/migrations/006_admin_auth.sql`)

3. Create / rotate the admin password (optional if using bootstrap):

```bash
npm run admin:set-password -- "your-secure-password"
```

4. Start:

```bash
npm run dev
```

## Security

- Password is stored hashed (scrypt) in `admin_accounts` — not in env after bootstrap
- Sessions are stored hashed in `admin_sessions`; cookie is signed
- API routes re-check a live DB session (proxy alone is not enough)
- Login lockout after 5 failed attempts
- Applicant updates use optimistic concurrency (`expectedUpdatedAt`)
- Mutations accept `Idempotency-Key` to make retries safe

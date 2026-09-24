# Stavarkling Admin Panel

Operations console for the Stavarkling site — review access applications, update status, and advance journey stages.

## Setup

1. Ensure `stavarkling/.env` (or `.env.local`) has a working `DATABASE_URL`.
   The admin panel loads it automatically via `next.config.ts`.

2. Copy admin secrets:

```bash
cp .env.example .env.local
```

Set:

- `ADMIN_SESSION_SECRET` — long random string (min 16 chars)
- `ADMIN_BOOTSTRAP_PASSWORD` — used once to create the first admin row

3. Run the admin auth migration in Supabase:

`db/migrations/006_admin_auth.sql`
(also mirrored under `stavarkling/db/migrations/006_admin_auth.sql`)

4. Create / rotate the admin password (optional if using bootstrap):

```bash
npm run admin:set-password -- "your-secure-password"
```

5. Start:

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

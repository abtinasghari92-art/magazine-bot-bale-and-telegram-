# magazine-platform

Phase 1 storefront for magazine sales on **Telegram Mini App**, **Bale bot**, and a **web admin**, in a single Next.js application.

Contract docs live in `docs/` (`SCOPE.md`, `ACCEPTANCE.md`, `SPRINTS.md`, `DECISIONS_REQUIRED.md`).

## Stack

- Next.js App Router (TypeScript strict)
- PostgreSQL + Prisma
- Tailwind CSS
- npm
- Deploy target: [Liara](https://liara.ir)

Day 1 is foundation only: RTL staging page, health check, env/secrets, Prisma identity/attribution schema. No Telegram auth, catalog, cart, or payments yet.

## Local setup

Requirements: Node.js 20.19+ (22.13+ recommended) and a PostgreSQL instance when you are ready to migrate.

```bash
npm install
cp .env.example .env
```

Set at least:

- `DATABASE_URL` — PostgreSQL connection string
- `APP_URL` — e.g. `http://localhost:3000`
- `APP_ENV` — `development` locally; `production` on Liara

Leave Telegram, Bale, object storage, payment, SMS, and CRM values empty until those days.

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

- App: `http://localhost:3000`
- Health: `http://localhost:3000/api/health`

## Database

```bash
npx prisma validate
npx prisma generate
npx prisma migrate dev          # local / first migration
npx prisma migrate deploy       # production (Liara)
```

If `DATABASE_URL` is missing, generate/validate can still run with the variable set only for that command. Do not commit `.env`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run lint` | ESLint |
| `npm run build` | `prisma generate` + Next.js production build |
| `npm start` | Production server (`next start`) |
| `npm run prisma:validate` | Validate Prisma schema |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (production) |

## Liara

1. Create a **Next.js** app and a **PostgreSQL** database in Liara.
2. Attach the database so `DATABASE_URL` is injected (or paste it in the app env).
3. Set `APP_ENV=production` and `APP_URL` to the public HTTPS origin.
4. Copy the remaining keys from `.env.example` as those features are built. Never put secrets in git.
5. Build command: `npm run build`. Start command: `npm start`.
6. Object Storage (covers/PDFs) is not wired on Day 1; create a bucket later and fill `OBJECT_STORAGE_*`.

`liara.json` marks the platform as Next.js. Adjust the Liara app name in the dashboard; do not store API tokens in this repo.

## Security notes

- No `NEXT_PUBLIC_*` secrets.
- Production start (`APP_ENV=production`) fails if `DATABASE_URL` or `APP_URL` is missing.
- Logs redact token/secret-like keys.
- Prisma parameterized queries; no messenger bot tokens on `User` rows.

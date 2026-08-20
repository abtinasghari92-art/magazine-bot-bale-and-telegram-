# magazine-platform

Phase 1 storefront for magazine sales on **Telegram Mini App**, **Bale bot**, and a **web admin**, in a single Next.js application.

Contract docs live in `docs/` (`SCOPE.md`, `ACCEPTANCE.md`, `SPRINTS.md`, `DECISIONS_REQUIRED.md`).

## Stack

- Next.js App Router (TypeScript strict)
- PostgreSQL + Prisma
- Tailwind CSS
- npm
- Deploy target: [Liara](https://liara.ir)

Day 1 is foundation: RTL staging page, health check, env/secrets, Prisma identity/attribution schema.

Day 2 adds the Telegram Mini App shell at `/miniapp`, server-side `initData` verification, user identity, profile, mobile-verification foundation, and addresses. No catalog, cart, orders, payments, bot commands, Bale, or admin panel yet — those are Day 3+.

## Telegram Mini App (Day 2)

- Mini App URL: `https://<host>/miniapp` (set this as the Web App URL in BotFather).
- Every user-scoped API call carries `Authorization: tma <initData>`; the server re-verifies the HMAC on each request. A user id sent from the browser is never trusted.
- `TELEGRAM_BOT_TOKEN` is required for real authentication. Without it the API returns 401 unless `TELEGRAM_DEV_AUTH_ENABLED=true` **and** `APP_ENV` is `development` or `test`.
- Locally you can pass init data with `?initData=...` on `/miniapp`; it is still verified server-side.

| Route | Purpose |
| --- | --- |
| `POST /api/miniapp/session` | Verify init data, create/reuse the user, record entry source |
| `GET \| PATCH /api/miniapp/profile` | Read / update first name, last name, mobile |
| `POST /api/miniapp/profile/phone/request` | Send a verification code |
| `POST /api/miniapp/profile/phone/confirm` | Confirm a verification code |
| `GET \| POST /api/miniapp/addresses` | List / create addresses |
| `GET \| PATCH \| DELETE /api/miniapp/addresses/:id` | Read / edit / deactivate one address |
| `POST /api/miniapp/addresses/:id/default` | Make one address the default |

## Mobile verification (REQ-018)

No SMS vendor is selected yet (DEC-003) and the OTP policy is unsigned (DEC-011), so:

- `OTP_REQUIRED=false` — checkout is never blocked by verification.
- `PHONE_VERIFICATION_PROVIDER` defaults to `log` in development/test and `none` everywhere else. `none` refuses to send; `log` is rejected outright in production.
- Codes are stored salted-hashed, never in clear text, and never returned by the API.

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
| `npm test` | Vitest suite (DB-backed tests run only with `TEST_DATABASE_URL`) |

## Liara

Production app: **https://magazinebot.liara.run**  
Telegram bot: **@testaraaye1bot**  
Mini App URL (BotFather → Web App): **https://magazinebot.liara.run/miniapp**

1. Create a **Next.js** app and a **PostgreSQL** database in Liara.
2. Attach the database so `DATABASE_URL` is injected (use the **public** host, e.g. `*.liara.cloud`, not the internal `*-db` hostname).
3. In the Liara app **Environment** panel, set at least:

| Variable | Example / notes |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_URL` | `https://magazinebot.liara.run` |
| `DATABASE_URL` | Public PostgreSQL URI from the Liara DB page |
| `TELEGRAM_BOT_TOKEN` | From @BotFather — **server-side only** |
| `TELEGRAM_DEV_AUTH_ENABLED` | `false` |
| `OTP_REQUIRED` | `false` until DEC-011 is signed |

4. Build command: `npm run build`. Start command: `npm start`.
5. After deploy, run migrations once (Liara shell or local with public `DATABASE_URL`): `npx prisma migrate deploy`.
6. Object Storage (covers/PDFs) is not wired yet; create a bucket later and fill `OBJECT_STORAGE_*`.

`TELEGRAM_WEBAPP_SECRET` is unused — Mini App init data is verified with the bot token (HMAC `WebAppData`).  
`liara.json` marks the platform as Next.js. Never store tokens in git.

## Security notes

- No `NEXT_PUBLIC_*` secrets.
- Production start (`APP_ENV=production`) fails if `DATABASE_URL` or `APP_URL` is missing.
- Logs redact token/secret-like keys.
- Prisma parameterized queries; no messenger bot tokens on `User` rows.
- Telegram `initData` is verified server-side (HMAC-SHA256 over the data-check-string with `HMAC("WebAppData", botToken)` as the key) and `auth_date` freshness is enforced. Client-supplied Telegram user data is never trusted.
- Every profile/address operation is scoped to the authenticated user; another user's address reports as "not found" rather than "forbidden".

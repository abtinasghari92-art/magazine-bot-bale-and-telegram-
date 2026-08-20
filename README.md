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

## Admin panel (Day 3)

Catalog management lives at `/admin`, behind a server-checked session cookie.

| Route | Purpose |
| --- | --- |
| `/admin/login` | Sign in. No self-registration exists. |
| `/admin` | Current issue and recent activity |
| `/admin/issues` | List, search, publish/unpublish, set current, archive |
| `/admin/issues/new` | Create an issue |
| `/admin/issues/[id]` | Edit an issue; upload cover and preview PDF |

### Creating the first admin

Accounts are created only from a shell on the server — there is no HTTP route
that can create one:

```bash
npm run admin:create -- --email you@example.com
```

The command prompts for the password with echo off, so it never reaches shell
history or a log. For an unattended first deploy, set `ADMIN_PASSWORD` for that
single run from the host's secret store. **Never put an admin password in git.**

To rotate a password (this also revokes every active session for that admin):

```bash
npm run admin:create -- --email you@example.com --reset-password
```

## Magazine catalog (Day 3)

Public Mini App routes:

| Route | Purpose |
| --- | --- |
| `/miniapp` | Current/latest published issue with a quick-purchase entry |
| `/miniapp/archive` | Grid, search and year/season/topic filters, cursor paging |
| `/miniapp/issues/[slug]` | Issue detail and the PDF preview entry |
| `/miniapp/purchase/[slug]` | Purchase entry point — Cart and checkout are Day 4 |

Only **published** issues are reachable publicly. A draft or archived slug
answers 404 with the same body a missing slug gets, so guessing a URL cannot
confirm that unpublished content exists.

### PDF preview — unresolved product decisions

`DEC-006` (preview page count) and `DEC-007` (watermark format) are **not
signed by the client**. The values in `.env.example` are contractor development
defaults so the feature could be built and tested:

- `PREVIEW_PAGE_LIMIT=3`
- watermark text `پیش‌نمایش` plus the issue number

These are **temporary** and must not appear in handover as something the client
ordered. A per-issue override (`previewPageLimit`) exists so a decision can be
applied globally or per issue without a code change.

The preview is built server-side: the allowed pages are copied into a brand-new
document, each one watermarked, and only that document is sent. The stored file
has no public URL at any point, so hiding pages in the viewer is never what
enforces the limit. Signed, expiring URLs (`REQ-071`) harden the transport on
Day 6; they do not replace this limit.

### Object Storage

Covers and preview PDFs are stored as objects; PostgreSQL holds only metadata
and the object key. Provider selection (`OBJECT_STORAGE_PROVIDER=auto`):

| Environment | Credentials present | Adapter |
| --- | --- | --- |
| any | yes | S3-compatible (Liara Object Storage) |
| development / test | no | local folder under `.data/` (git-ignored) |
| staging / production | no | **refuses uploads** |

The last row is deliberate: a production upload fails loudly rather than
landing on a container disk that the next deploy erases.

## Local setup

Requirements: Node.js **20.x** (Liara: set `next.nodeVersion` to `"20"` in `liara.json` or pick Node 20 in the console). Node 22 on Liara has known `npm ci` crashes.

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
| `npm run admin:create` | Create or re-password the first admin (see above) |

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
5. `next.config.ts` must include `output: "standalone"` (Liara runtime copies `.next/standalone`).
6. After deploy, run migrations once (Liara shell or local with public `DATABASE_URL`): `npx prisma migrate deploy`.
7. Object Storage (covers/PDFs) is not wired yet; create a bucket later and fill `OBJECT_STORAGE_*`.

`TELEGRAM_WEBAPP_SECRET` is unused — Mini App init data is verified with the bot token (HMAC `WebAppData`).  
`liara.json` marks the platform as Next.js. Never store tokens in git.

### package-lock.json must stay multi-platform

Liara builds on **linux-x64 (glibc)** with `npm ci`, so the lockfile has to contain the Linux
native binaries (`lightningcss-linux-x64-gnu`, `@tailwindcss/oxide-linux-x64-gnu`,
`@next/swc-linux-x64-gnu`, …), not only the macOS ones. A lockfile rebuilt from an existing
macOS `node_modules` keeps just `*-darwin-arm64` and drops every `resolved`/`integrity` field;
the build then dies with `Cannot find module '../lightningcss.linux-x64-gnu.node'`.

Regenerate it from the registry, never from `node_modules`:

```bash
rm -rf node_modules package-lock.json && npm install
```

Sanity check before pushing — both must be non-zero:

```bash
grep -c '"resolved"' package-lock.json && grep -c 'linux-x64-gnu' package-lock.json
```

## Security notes

- No `NEXT_PUBLIC_*` secrets.
- Production start (`APP_ENV=production`) fails if `DATABASE_URL` or `APP_URL` is missing.
- Logs redact token/secret-like keys.
- Prisma parameterized queries; no messenger bot tokens on `User` rows.
- Telegram `initData` is verified server-side (HMAC-SHA256 over the data-check-string with `HMAC("WebAppData", botToken)` as the key) and `auth_date` freshness is enforced. Client-supplied Telegram user data is never trusted.
- Every profile/address operation is scoped to the authenticated user; another user's address reports as "not found" rather than "forbidden".
- No internal error ever reaches the browser. Every thrown value passes through `src/server/error-mapping.ts`, which returns a Persian sentence and a stable code; Prisma messages, SQL, connection details and stack traces stay in the server log, correlated by a short `errorId`. `tests/error-disclosure.test.ts` guards this.
- Admin sessions: the cookie carries 32 random bytes and the database stores only its SHA-256, so a database dump yields nothing usable. Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` on staging and production.
- Admin login answers every failure identically and always runs the password comparison, so it neither confirms which emails exist nor leaks the answer through timing. Repeated failures are throttled per email and per hashed client address.
- Object storage keys are generated server-side and never sent to or accepted from a browser: a client asks for an *issue*, and the server resolves the key. Uploaded files are identified by their magic number, not the browser's `Content-Type`.

# Architecture (Day 1)

Single **Next.js App Router** application. Telegram Mini App, Bale bot webhooks, web admin, and HTTP APIs will be routes and modules inside this repo — not separate services.

```text
src/
  app/           # Pages and Route Handlers (health, later mini-app, admin, webhooks)
  components/    # Shared UI (staging page only on Day 1)
  lib/           # Env, logging, pagination, validation
  modules/       # Domain (attribution today; catalog/orders later)
  server/        # Prisma access, public error mapping
  types/
prisma/          # PostgreSQL schema and migrations
docs/            # Contract implementation docs
```

## Data

- **PostgreSQL** is the system of record.
- **Prisma** is the only query layer (parameterized SQL).
- **Object Storage** (Liara or S3-compatible) will hold covers and PDFs later. Day 1 only reserves env placeholders.

## Adapters (later days)

- Telegram Mini App / Bot: `TELEGRAM_*` env, verify init data, write `UserIdentity` + `EntrySession`.
- Bale Bot: `BALE_BOT_TOKEN`, same attribution types (`MessengerChannel`).
- Web Admin: `AdminUser` row exists; login is Day 3.

Attribution helpers in `src/modules/attribution` are messenger-agnostic. Do not parse Telegram `initData` here yet.

## Module boundaries

| Area | Day 1 | Later |
| --- | --- | --- |
| Identity / sessions / events | Schema + normalize | Writers from bots/Mini App |
| Catalog, cart, orders, payments | Not present | Own modules under `src/modules/` |
| Messaging / campaigns | Not present | Day 8 |
| AI / RAG / Phase 2 | Out of contract | Never in this phase |

## Why not Redis, workers, or microservices

Phase 1 traffic is a magazine storefront plus admin. Postgres can hold sessions, jobs-as-rows, and campaign send logs until a measured bottleneck appears. Extra runtimes would add Liara cost and failure modes without a Day 1 requirement. Docker is not required for Liara’s Next.js platform.

## Pagination (REQ-004)

`src/lib/pagination.ts` caps page size so list endpoints can stream small payloads. Catalog UI is Day 3.

# magazine-platform — Phase 1 10-day implementation plan

Contract duration: **10 days** from start conditions (Article 14). Every `REQ-xxx` is assigned to **exactly one day**. Nothing in Phase 1 is labelled future, optional, or later.

A requirement on Day N may depend only on REQs scheduled on Day N or earlier. Within a day, implement rows **top to bottom**.

Client-furnished blockers (brand, covers, prices, PDFs, gateway, SMS, CRM, hosting) sit on the client (Article 15). Unresolved product details are frozen in `docs/DECISIONS_REQUIRED.md` using **development defaults only** until the client decides.

This plan names Next.js, database, and similar scaffolding as engineering work. Those names are not new contractual requirements.

---

## Day 1 — Foundation

Repository/application skeleton (Next.js), database, data model, env/secrets, base security, RTL/design tokens, event/attribution model. No shopping UI yet.

Same-day order: REQ-002 → REQ-070 / REQ-072 → REQ-001 → REQ-003 / REQ-004.

| REQ | Why this day |
| --- | --- |
| REQ-002 | Module and schema boundaries before any feature. |
| REQ-070 | Base security (HTTPS, parameterized queries, secret-in-env, init-data *design*). |
| REQ-072 | Secret store and log redaction from the first commit. |
| REQ-001 | RTL/Persian tokens before UI work. |
| REQ-003 | Attribution/event tables (writers arrive with Mini App/bots later). |
| REQ-004 | Pagination and small-payload convention before catalog UI. |

**Exit:** app boots; migrations for users, sessions, issues, carts, orders, payments, events exist; no Phase 2 modules.

## Day 2 — Telegram identity and Mini App shell

Telegram authentication, user identity, profile, addresses, Mini App shell.

Same-day order: REQ-005 → REQ-016 → REQ-006 / REQ-017 → REQ-022 → REQ-021 → REQ-018.

| REQ | Why this day |
| --- | --- |
| REQ-005 | Mini App host + Telegram init-data verification (uses REQ-070). |
| REQ-016 | User record from Telegram id (Bale id column reserved). |
| REQ-006 | Light/dark theme on the shell. |
| REQ-017 | Profile fields. |
| REQ-022 | Province/city/postal validation rules (used by address save). |
| REQ-021 | Multi-address CRUD + default (calls REQ-022). |
| REQ-018 | Mobile verification *hook* (OTP port; production SMS is REQ-061). |

**Exit:** user opens Mini App, completes profile and addresses, reopens as the same user.

## Day 3 — Admin shell, catalog, preview foundation

Admin authentication shell, catalog management, home/archive/search/filter, storage + PDF-preview foundation (unsigned/internal object access; signing is Day 6).

Same-day order: REQ-046 → REQ-048 → REQ-011 → REQ-010 / REQ-012 → REQ-013 / REQ-014.

| REQ | Why this day |
| --- | --- |
| REQ-046 | Web admin exists with authenticated staff login (single operator is enough; roles are Day 7). |
| REQ-048 | Create/update issues: price, stock, images, cover, descriptions. |
| REQ-011 | Issue detail fields. |
| REQ-010 | Home + current issue + buy CTA (cart wiring Day 4). |
| REQ-012 | Archive grid + search. |
| REQ-013 | Year/season/topic filters + progressive load. |
| REQ-014 | Limited watermarked PDF preview pages. |

**Exit:** sample issues browsable in Mini App; preview pages render from storage.

## Day 4 — Cart, pricing, subscriptions, order creation

Same-day order: REQ-032 / REQ-034 / REQ-038 → REQ-023 → REQ-033 / REQ-035 → REQ-024 → REQ-025 / REQ-031.

| REQ | Why this day |
| --- | --- |
| REQ-032 | Admin subscription packages. |
| REQ-034 | Admin discount codes. |
| REQ-038 | Admin shipping-cost settings. |
| REQ-023 | Cart. |
| REQ-033 | Apply a code to the cart (does not depend on the totals module). |
| REQ-035 | Choose shipping method/fee (does not depend on the totals module). |
| REQ-024 | Totals engine: items − discount + shipping. |
| REQ-025 | Create unpaid order with snapshots. |
| REQ-031 | Single-issue and subscription SKUs in cart/catalog. |

**Exit:** unpaid order exists; payable amount is internally consistent. Paid persistence is Day 5.

## Day 5 — Payments, retry, paid orders, fulfillment queue

Fiat payment, verification/idempotency, failed-payment retry, order history, fulfillment state, Telegram crypto.

Same-day order: REQ-044 → REQ-039 → REQ-040 → REQ-041 / REQ-042 / REQ-045 → REQ-026 → REQ-027 / REQ-028.

| REQ | Why this day |
| --- | --- |
| REQ-044 | Admin gateway credentials (masked; uses REQ-072). |
| REQ-039 | Fiat gateway session for the snapshotted amount. |
| REQ-040 | Persist successful and failed attempts (idempotent). |
| REQ-041 | User-facing payment result. |
| REQ-042 | Retry without double fulfill. |
| REQ-045 | Crypto checkout **only** in Telegram Mini App; writes the same payment ledger. |
| REQ-026 | Mark/store successful (paid) orders. |
| REQ-027 | User order history. |
| REQ-028 | Thank-you, invoice record, shipping queue, admin-visible new paid order. |

**Exit:** sandbox fiat and Telegram crypto can mark an order paid; failures are retryable.

## Day 6 — Bots, downloads, returning user, help

Telegram Bot, Bale Bot, returning-user flow, signed URLs/downloads, user dashboard, FAQ/help surfaces.

Same-day order: REQ-007 / REQ-008 → REQ-009 → REQ-071 → REQ-015 → REQ-019 / REQ-020 / REQ-064 / REQ-065.

| REQ | Why this day |
| --- | --- |
| REQ-007 | Telegram bot gateway, guidance, and Bot API notices. |
| REQ-008 | Bale bot within real Bale APIs (purchase uses Day 4–5 backend). |
| REQ-009 | Numeric issue pick on Bale if the API allows. |
| REQ-071 | Signed, time-limited URLs for stored preview/download objects. |
| REQ-015 | Entitled downloads only (after paid order). |
| REQ-019 | Returning user prefill + short checkout. |
| REQ-020 | User dashboard: profile, orders, shipment placeholder, change history. |
| REQ-064 | Help section (seed/empty content; CMS Day 7). |
| REQ-065 | FAQ section (seed/empty content; CMS Day 7). |

**Exit:** both messengers reach catalog/purchase paths; files are not hot-linked.

## Day 7 — Full admin operations

Users/orders/transactions, roles, tracking, dashboard shell, content CMS, packing lists.

Same-day order: REQ-067 → REQ-047 / REQ-050 / REQ-049 → REQ-029 / REQ-043 → REQ-030 / REQ-036.

| REQ | Why this day |
| --- | --- |
| REQ-067 | Distinct admin roles and permissions. |
| REQ-047 | End-user management. |
| REQ-050 | Dashboard landing (widgets filled Day 9). |
| REQ-049 | Home banners, FAQ, help CMS (publishes to Day 3 home and Day 6 help/FAQ). |
| REQ-029 | Order management and status changes. |
| REQ-043 | Transaction list. |
| REQ-030 | Order filters, address labels, packing lists. |
| REQ-036 | Enter tracking code; user dashboard shows it. |

**Exit:** operations can fulfill an order and restrict staff by role.

## Day 8 — Messaging, segmentation, CRM, tickets

Messaging foundation first, then segments, retargeting, campaigns, CRM, support.

Same-day order: REQ-062 → REQ-061 → REQ-054 / REQ-055 → REQ-056 → REQ-057 / REQ-058 → REQ-059 → REQ-037 / REQ-063 / REQ-066.

| REQ | Why this day |
| --- | --- |
| REQ-062 | Admin SMS settings. |
| REQ-061 | SMS + in-messenger send path (uses Day 6 bots). |
| REQ-054 | Manual tags/categories. |
| REQ-055 | Derived segments: buyer, visitor, abandoner, active subscriber. |
| REQ-056 | Retargeting engine (segments + send path). Does not depend on reminder copy UI. |
| REQ-057 | Configurable abandon/fail reminders (uses the engine). |
| REQ-058 | Targeted group-send infrastructure. |
| REQ-059 | Manual campaigns in admin. |
| REQ-037 | Auto-notify tracking code via REQ-061. |
| REQ-063 | CRM webhook/API for agreed events. |
| REQ-066 | Tickets / human operator handoff. |

**Exit:** abandoner can get one reminder; CRM receives a paid-order event; tracking notify fires.

## Day 9 — Analytics, audit, export, compatibility

Same-day order: REQ-051 → REQ-052 / REQ-053 → REQ-060 → REQ-068 / REQ-069 / REQ-075.

| REQ | Why this day |
| --- | --- |
| REQ-051 | Users/products/orders/sales stats on the dashboard. |
| REQ-052 | Revenue by range, messenger, entry source. |
| REQ-053 | Sales funnel. |
| REQ-060 | Campaign sent/failed (and channel extras if any). |
| REQ-068 | Admin audit log. |
| REQ-069 | CSV/Excel export. |
| REQ-075 | Compatibility matrix on typical Telegram/Bale/admin clients. |

**Exit:** reports match seeded data; Persian export opens; compatibility matrix drafted. Integration hardening happens on this day (retries, idempotency review) without new REQs.

## Day 10 — E2E, production, documentation, handover

Same-day order: REQ-073 → REQ-074 → REQ-076 / REQ-077 → REQ-079 / REQ-078 / REQ-080.

| REQ | Why this day |
| --- | --- |
| REQ-073 | Article 17 scenarios + purchase/payment E2E, written report. |
| REQ-074 | Production deploy on client-funded infra. |
| REQ-076 | Persian admin guide. |
| REQ-077 | Technical + custom API docs. |
| REQ-078 | Handover of running system / source / accesses **when settlement allows**. |
| REQ-079 | One admin training session. |
| REQ-080 | One-month defect-fix window process (calendar + intake). |

**Exit:** test report, production URLs, guides, training note. Settlement-gated items listed if unpaid (Articles 9, 12, 20) — still not dropped from scope.

---

## Assignment index (every REQ once)

| Day | REQ IDs | Count |
| --- | --- | --- |
| 1 | 001, 002, 003, 004, 070, 072 | 6 |
| 2 | 005, 006, 016, 017, 018, 021, 022 | 7 |
| 3 | 010, 011, 012, 013, 014, 046, 048 | 7 |
| 4 | 023, 024, 025, 031, 032, 033, 034, 035, 038 | 9 |
| 5 | 026, 027, 028, 039, 040, 041, 042, 044, 045 | 9 |
| 6 | 007, 008, 009, 015, 019, 020, 064, 065, 071 | 9 |
| 7 | 029, 030, 036, 043, 047, 049, 050, 067 | 8 |
| 8 | 037, 054, 055, 056, 057, 058, 059, 061, 062, 063, 066 | 11 |
| 9 | 051, 052, 053, 060, 068, 069, 075 | 7 |
| 10 | 073, 074, 076, 077, 078, 079, 080 | 7 |
| **Total** | REQ-001 … REQ-080 | **80** |

---

## Requirements assigned to each day

- **Day 1:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-070, REQ-072
- **Day 2:** REQ-005, REQ-006, REQ-016, REQ-017, REQ-018, REQ-021, REQ-022
- **Day 3:** REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-046, REQ-048
- **Day 4:** REQ-023, REQ-024, REQ-025, REQ-031, REQ-032, REQ-033, REQ-034, REQ-035, REQ-038
- **Day 5:** REQ-026, REQ-027, REQ-028, REQ-039, REQ-040, REQ-041, REQ-042, REQ-044, REQ-045
- **Day 6:** REQ-007, REQ-008, REQ-009, REQ-015, REQ-019, REQ-020, REQ-064, REQ-065, REQ-071
- **Day 7:** REQ-029, REQ-030, REQ-036, REQ-043, REQ-047, REQ-049, REQ-050, REQ-067
- **Day 8:** REQ-037, REQ-054, REQ-055, REQ-056, REQ-057, REQ-058, REQ-059, REQ-061, REQ-062, REQ-063, REQ-066
- **Day 9:** REQ-051, REQ-052, REQ-053, REQ-060, REQ-068, REQ-069, REQ-075
- **Day 10:** REQ-073, REQ-074, REQ-076, REQ-077, REQ-078, REQ-079, REQ-080

## Requirements that depend on a third-party capability

| REQ | Third party |
| --- | --- |
| REQ-003, REQ-005, REQ-006, REQ-007 | Telegram Bot API / Mini Apps / theme / Deep Link |
| REQ-008, REQ-009 | Bale bot API |
| REQ-018, REQ-037, REQ-057, REQ-061, REQ-062 | SMS provider (client-funded) |
| REQ-022 | Optional national address dataset |
| REQ-039, REQ-040, REQ-041, REQ-042, REQ-044 | Mutually approved payment gateway |
| REQ-045 | Crypto rail inside Telegram (unnamed in contract) |
| REQ-058, REQ-059, REQ-060 | “Other services” for group send (5-49) |
| REQ-063 | Client CRM |
| REQ-014, REQ-015, REQ-071 | Object storage / CDN if used |
| REQ-074 | Hosting, domain, TLS (Article 13) |

See `docs/DECISIONS_REQUIRED.md` for every item that cannot be implemented deterministically until the client or the Phase 1 proposal answers it.

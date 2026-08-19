# magazine-platform — Decisions required (Phase 1 freeze)

The contract (especially Article 5 and 5-78) includes Phase 1 proposal detail dated 1405/05/15. That appendix is **not in this repository**. Until the client representative (Articles 15-10 … 15-12) or the proposal text answers the items below, engineering may use the **Safe default for development** only.

A default is **not** a final client requirement and must not be treated as extra Scope (Articles 3-5 and 7). When the client decides, replace the default without adding features.

**Who** is the client / کارفرما unless noted. Contractor proposes options; client confirms.

| Column | Meaning |
| --- | --- |
| Latest day | Last sprint day the team can proceed on a default before the REQ is blocked for *acceptance*, not for writing code against a stub. |

---

## DEC-001 — Payment gateway

- **Related REQ:** REQ-039, REQ-040, REQ-041, REQ-042, REQ-044
- **What must be decided:** Named IRR/fiat gateway (provider, merchant model, sandbox vs live, callback/IPN style, settlement currency).
- **Who must provide it:** Client (Articles 15-6, 15-7); contractor integrates.
- **Latest implementation day before blocking:** Day 5
- **Safe default for development:** One adapter interface + a fake/sandbox driver (no live charges). Do not ship the fake driver as the production gateway.

## DEC-002 — Crypto payment rail

- **Related REQ:** REQ-045
- **What must be decided:** Which crypto method inside Telegram Mini App only (e.g. TON Connect, Telegram Stars, listed wallets, token, confirmation rule).
- **Who must provide it:** Client + contractor technical proposal; Telegram platform constraints apply.
- **Latest implementation day before blocking:** Day 5
- **Safe default for development:** Payment-method enum `crypto` + adapter stub that records a test “paid” only in non-production. No Bale crypto UI.

## DEC-003 — SMS provider

- **Related REQ:** REQ-018, REQ-037, REQ-057, REQ-061, REQ-062
- **What must be decided:** Vendor, sender ID, account in client’s name, OTP vs marketing templates, delivery receipts.
- **Who must provide it:** Client (Articles 13, 15-8)
- **Latest implementation day before blocking:** Day 8 (OTP *port* on Day 2 can stay a console/dev sender)
- **Safe default for development:** Message port with a `console`/`log` adapter; OTP codes visible in staging logs only.

## DEC-004 — CRM specification

- **Related REQ:** REQ-063
- **What must be decided:** CRM product, base URL, auth (HMAC/token), event list, field mapping, retry/idempotency keys. Contract says “as specified in the proposal.”
- **Who must provide it:** Client (Article 15-9)
- **Latest implementation day before blocking:** Day 8
- **Safe default for development:** Outbound webhook to a configurable URL for `user.created` and `order.paid` JSON; HMAC secret in env. Not a claim that this matches the real CRM.

## DEC-005 — Bale capability

- **Related REQ:** REQ-008, REQ-009, REQ-075
- **What must be decided:** Whether Bale supports Mini App, WebView checkout, file send, numeric conversation, and payment return URLs; written gap list (Article 6-5) if not.
- **Who must provide it:** Contractor documents actual Bale API; client accepts fallback.
- **Latest implementation day before blocking:** Day 6
- **Safe default for development:** Bot-only Bale path: identify user, numeric issue pick, send catalog summary + payment/order links the platform allows. Do not assume Telegram Mini App parity.

## DEC-006 — PDF preview page limit

- **Related REQ:** REQ-014
- **What must be decided:** Exact number of preview pages per issue (and whether it is global or per issue).
- **Who must provide it:** Client / Phase 1 proposal
- **Latest implementation day before blocking:** Day 3
- **Safe default for development:** Configurable `PREVIEW_PAGE_LIMIT=3`. Not a contractual page count.

## DEC-007 — Watermark format

- **Related REQ:** REQ-014
- **What must be decided:** Text vs image, wording (e.g. user id / “preview”), opacity, placement, per-page vs overlay.
- **Who must provide it:** Client (brand) / proposal
- **Latest implementation day before blocking:** Day 3
- **Safe default for development:** Diagonal text overlay `پیش‌نمایش` + issue number. Replace with client artwork when delivered.

## DEC-008 — Subscription rules

- **Related REQ:** REQ-031, REQ-032, REQ-055
- **What must be decided:** Package duration vs issue count, auto-renew or prepaid term, which issues are included, pause/cancel, physical vs digital entitlement.
- **Who must provide it:** Client / Phase 1 proposal (5-59)
- **Latest implementation day before blocking:** Day 4
- **Safe default for development:** SKU type `subscription` with `issue_count` or `duration_days` fields, no auto-renew, no extra billing engine. Packages are prepaid catalog items.

## DEC-009 — Admin role matrix

- **Related REQ:** REQ-067, REQ-029, REQ-044, REQ-062
- **What must be decided:** Role names and allow/deny for catalog, orders, finance/gateway, SMS, campaigns, users, settings. Contract says “per proposal.”
- **Who must provide it:** Client / proposal
- **Latest implementation day before blocking:** Day 7
- **Safe default for development:** Four roles — `superadmin`, `fulfillment`, `finance_view`, `support` — with a written matrix in handover. Not extra products; only access splits.

## DEC-010 — Shipping rules

- **Related REQ:** REQ-035, REQ-038, REQ-030
- **What must be decided:** Methods (post, courier, pickup), fee table (flat vs by city/weight), digital-only skip, COD or not.
- **Who must provide it:** Client
- **Latest implementation day before blocking:** Day 4
- **Safe default for development:** One method `پست` with a single admin-editable flat fee; digital-only cart fee = 0. Physical delivery remains client operations (15-14, 15-15).

## DEC-011 — OTP requirement

- **Related REQ:** REQ-018
- **What must be decided:** When mobile verification is mandatory (always, first purchase, change-of-number only, never).
- **Who must provide it:** Client (clause 5-12 “if needed”)
- **Latest implementation day before blocking:** Day 2 for the hook; Day 8 if OTP must go over real SMS
- **Safe default for development:** Feature flag `OTP_REQUIRED=false` so checkout works; flag can be turned on in staging.

## DEC-012 — Campaign channels

- **Related REQ:** REQ-058, REQ-059, REQ-060, REQ-061
- **What must be decided:** Which “other services” (5-49) are in Phase 1: SMS, Telegram broadcast, Bale broadcast, email, or a named ESP.
- **Who must provide it:** Client
- **Latest implementation day before blocking:** Day 8
- **Safe default for development:** Campaigns send only through the in-scope SMS port and Telegram/Bale bots already built. No extra ESP.

## DEC-013 — Funnel definition

- **Related REQ:** REQ-053, REQ-003
- **What must be decided:** Named stages and event names (proposal does not list them in the contract text).
- **Who must provide it:** Client / contractor proposal for confirmation
- **Latest implementation day before blocking:** Day 9
- **Safe default for development:** Stages `visit` → `view_issue` → `add_cart` → `checkout` → `paid`. Replace names if the client confirms different labels **without adding stages that are new products**.

---

## Additional items (same freeze rules)

## DEC-014 — Deep Link / source parameters

- **Related REQ:** REQ-003, REQ-052
- **What must be decided:** Which start params / UTM keys marketing will use.
- **Who must provide it:** Client
- **Latest implementation day before blocking:** Day 1 for storage; Day 9 for reports to be meaningful
- **Safe default for development:** Persist raw `start_param` / `source` string plus messenger id. No extra analytics product.

## DEC-015 — Invoice vs receipt

- **Related REQ:** REQ-028
- **What must be decided:** Tax invoice fields vs simple payment receipt; numbering; legal template.
- **Who must provide it:** Client
- **Latest implementation day before blocking:** Day 5
- **Safe default for development:** Internal invoice number `INV-{order_id}` and a thank-you summary. Not a claim of tax-compliant invoicing.

## DEC-016 — Label / packing output format

- **Related REQ:** REQ-030
- **What must be decided:** Browser print vs PDF vs Excel for address labels and packing lists.
- **Who must provide it:** Client
- **Latest implementation day before blocking:** Day 7
- **Safe default for development:** Printable HTML plus CSV of the same rows (satisfies print **or** export).

## DEC-017 — Archive taxonomy

- **Related REQ:** REQ-013
- **What must be decided:** Controlled lists for year, season, topic (and any other proposal categories).
- **Who must provide it:** Client / proposal / content delivery (15-3)
- **Latest implementation day before blocking:** Day 3
- **Safe default for development:** Fields `year`, `season`, `topic` as strings/enums populated from admin on each issue.

## DEC-018 — Digital file entitlement

- **Related REQ:** REQ-015, REQ-070
- **What must be decided:** Whether each SKU includes a full digital PDF; which orders grant download.
- **Who must provide it:** Client (content + rights, 15-4, 15-5)
- **Latest implementation day before blocking:** Day 6
- **Safe default for development:** Issue has optional `full_pdf`; download allowed only after paid order when the file is present. Preview still required.

## DEC-019 — Signed URL TTL

- **Related REQ:** REQ-071
- **What must be decided:** Expiry minutes for preview vs purchased download.
- **Who must provide it:** Contractor proposes; client may confirm
- **Latest implementation day before blocking:** Day 6
- **Safe default for development:** Preview 15 minutes; entitled download 60 minutes. Configurable.

## DEC-020 — Gateway/SMS/shipping settings UX

- **Related REQ:** REQ-044, REQ-062, REQ-038, REQ-077
- **What must be decided:** Whether production secrets are entered only in env/host, or also in admin UI.
- **Who must provide it:** Contractor security default; client hosting
- **Latest implementation day before blocking:** Day 5 (gateway), Day 4 (shipping fees), Day 8 (SMS)
- **Safe default for development:** Fees editable in admin; API keys in env with optional masked admin override. Secrets never committed.

## DEC-021 — Warranty vs settlement clock

- **Related REQ:** REQ-078, REQ-080
- **What must be decided:** Whether “final delivery” (19-1) starts at production go-live (REQ-074) or at settlement-gated handover (REQ-078).
- **Who must provide it:** Both parties (Articles 18, 19, 20)
- **Latest implementation day before blocking:** Day 10
- **Safe default for development:** Document both dates in handover; do not invent a third product.

## DEC-022 — Telegram theme fallback

- **Related REQ:** REQ-006
- **What must be decided:** Acceptable if Telegram WebView ignores theme params.
- **Who must provide it:** Contractor documents; client accepts Article 6 limits
- **Latest implementation day before blocking:** Day 2
- **Safe default for development:** Apply `themeParams` when present; otherwise a readable light theme.

---

Development defaults **expire** when the matching decision is signed. They must not appear in handover as if the client ordered them.

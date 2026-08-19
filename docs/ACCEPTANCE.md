# magazine-platform — Phase 1 Acceptance Criteria

Each item maps 1:1 to `docs/SCOPE.md`. A requirement is accepted only when the acceptance test passes on the stated platform(s).

**Dependencies** are implementation prerequisites only: infrastructure or features that must already exist. They are not extra contractual scope. A requirement may depend only on REQs scheduled on the same day or an earlier day. Cycles are forbidden. End-to-end proofs that need the full system belong to REQ-073, not to every feature’s dependency list.

Legend for **Platform:** Telegram = Mini App and/or Telegram bot; Bale = Bale bot; Web Admin = admin UI; Backend = APIs, jobs, data; Shared = more than one of the above.

---

## REQ-001

- **Requirement:** User-facing UI is right-to-left and Persian.
- **Expected behavior:** Layout, typography, and form flow are RTL; copy is Persian unless a field is inherently Latin (IDs, tracking codes, URLs).
- **Acceptance test:** Open home, issue detail, cart, checkout, and help on a Persian locale device; no LTR breakage of primary actions.
- **Dependencies:** none
- **Platform:** Shared

## REQ-002

- **Requirement:** Code and data model are structured so later phases can be added without rewriting the storefront core.
- **Expected behavior:** Clear module boundaries (catalog, orders, payments, messaging, admin); no Phase 2/AI modules shipped.
- **Acceptance test:** Review architecture notes in handover docs; confirm no RAG/assistant/native-app/DRM/website storefront code.
- **Dependencies:** none
- **Platform:** Backend

## REQ-003

- **Requirement:** Store messenger user id and entry source / Deep Link parameters when the messenger provides them.
- **Expected behavior:** New sessions persist user id plus UTM-like/start-param/source; missing params do not block checkout.
- **Acceptance test:** Open Mini App with a start parameter and via bot link; admin analytics show distinct sources. Repeat on Bale if the platform exposes an equivalent. (Writers to this model land with REQ-005/007/008; the model itself is Day 1.)
- **Dependencies:** REQ-002
- **Platform:** Shared

## REQ-004

- **Requirement:** Progressive loading and a small first payload for weak networks.
- **Expected behavior:** Archive and images load incrementally; first screen does not require the full catalog or PDFs.
- **Acceptance test:** Throttle network; home and archive remain usable; subsequent pages/images load on scroll or demand. (Archive UI is REQ-012; this REQ is the loading convention it must follow.)
- **Dependencies:** REQ-001, REQ-002
- **Platform:** Telegram

## REQ-005

- **Requirement:** Telegram Mini App is the primary storefront.
- **Expected behavior:** User can open the Mini App from Telegram and complete browse → cart → checkout (other REQs).
- **Acceptance test:** Open the Mini App (direct Mini App URL or keyboard/menu button); it loads authenticated against Telegram init data. Bot deep-link launch is verified with REQ-007.
- **Dependencies:** REQ-001, REQ-070
- **Platform:** Telegram

## REQ-006

- **Requirement:** Mini App follows Telegram light and dark theme where the platform allows.
- **Expected behavior:** Theme variables track Telegram color scheme; no unreadable contrast in either mode.
- **Acceptance test:** Toggle Telegram theme; Mini App surfaces update without a hard-coded single theme.
- **Dependencies:** REQ-005
- **Platform:** Telegram

## REQ-007

- **Requirement:** Telegram bot is gateway, notifier, communication channel, and guide into the Mini App.
- **Expected behavior:** `/start` (or equivalent) explains next step and opens the Mini App; bot can send transactional notices when other REQs trigger them.
- **Acceptance test:** New user starts the bot, receives guidance, opens Mini App; after a paid order, user can receive a bot notice if messaging REQs are on.
- **Dependencies:** REQ-005
- **Platform:** Telegram

## REQ-008

- **Requirement:** Bale bot implements agreed Phase 1 flows within Bale APIs.
- **Expected behavior:** Users on Bale can be identified, browse or select issues, and complete purchase paths that Bale supports. If Bale cannot host a Mini App, documented fallback (including REQ-009) is used. Contractor documents any Bale gap (contract 6-5).
- **Acceptance test:** Complete a documented happy path on Bale; any unsupported Mini App feature is listed in handover, not silently omitted from Telegram.
- **Dependencies:** REQ-011, REQ-016, REQ-025, REQ-039
- **Platform:** Bale

## REQ-009

- **Requirement:** Bale user can pick an issue by number without opening a Mini App, if Bale supports it.
- **Expected behavior:** Numeric input resolves to an issue; invalid numbers are rejected with a Persian message; if Bale cannot support this, the gap is reported to the client.
- **Acceptance test:** Send a valid issue number; receive that issue’s summary and a purchase path. Send an invalid number; receive an error, not a crash.
- **Dependencies:** REQ-008, REQ-011
- **Platform:** Bale

## REQ-010

- **Requirement:** Home shows the current/latest issue and a quick-purchase path.
- **Expected behavior:** Current issue is visually primary; a control starts add-to-cart or checkout for that issue.
- **Acceptance test:** With at least two issues, home highlights the designated current issue; a primary buy CTA is present for that issue. Wiring through cart/checkout is completed with REQ-023/REQ-025 and proven in REQ-073.
- **Dependencies:** REQ-005, REQ-011
- **Platform:** Telegram

## REQ-011

- **Requirement:** Issue detail includes cover, title, number, date, description, table of contents, price, and stock.
- **Expected behavior:** All listed fields render when provided by admin; out-of-stock is visible and blocks purchase of that copy type as configured.
- **Acceptance test:** Open an issue with full metadata; each field is present. Set stock to 0; purchase of that item is blocked.
- **Dependencies:** REQ-048
- **Platform:** Shared

## REQ-012

- **Requirement:** Archive is a searchable grid of issues.
- **Expected behavior:** Issues appear in a grid; search matches title/number (and other indexed fields).
- **Acceptance test:** Load archive with >1 page of issues; search for a known title returns it and hides unrelated issues.
- **Dependencies:** REQ-004, REQ-005, REQ-048
- **Platform:** Telegram

## REQ-013

- **Requirement:** Archive filters by year, season, and topic, with progressive loading.
- **Expected behavior:** Combining filters narrows the grid; more items load on scroll/page.
- **Acceptance test:** Apply year and topic filters; results match. Scroll/load-more fetches the next slice without reloading the Mini App.
- **Dependencies:** REQ-012
- **Platform:** Telegram

## REQ-014

- **Requirement:** Multi-page PDF preview with page limit and watermark.
- **Expected behavior:** User sees only the allowed preview pages; each page is watermarked; full PDF is not exposed via the preview URL.
- **Acceptance test:** Open preview; page count ≤ configured limit; watermark visible; fetching a non-preview page with the preview token fails. Time-limited signing is REQ-071.
- **Dependencies:** REQ-011
- **Platform:** Shared

## REQ-015

- **Requirement:** Download only allowed files (preview pack and purchased digital copy when the client delivered one).
- **Expected behavior:** Unpurchased full digital files are not downloadable; after a qualifying purchase, the entitled file downloads via a protected link.
- **Acceptance test:** Anonymous/unpaid user cannot download the full issue. After a successful digital-eligible order, download works once the signed URL is issued.
- **Dependencies:** REQ-026, REQ-071
- **Platform:** Shared

## REQ-016

- **Requirement:** User account system exists.
- **Expected behavior:** A user record is created from messenger identity and can hold profile, addresses, and orders.
- **Acceptance test:** First Mini App open creates a user keyed by Telegram id; subsequent opens reuse the same user.
- **Dependencies:** REQ-005
- **Platform:** Backend

## REQ-017

- **Requirement:** Profile stores first name, last name, mobile, and other required fields.
- **Expected behavior:** Checkout cannot complete while required profile fields are empty (except where returning-user prefill already has them).
- **Acceptance test:** New user with empty profile is prompted; submitting valid name + mobile persists and reappears on next session.
- **Dependencies:** REQ-016
- **Platform:** Shared

## REQ-018

- **Requirement:** Mobile number is verified when verification is required.
- **Expected behavior:** If the configured policy requires OTP (or equivalent), the number is marked verified only after success; if policy is off, checkout can proceed without OTP.
- **Acceptance test:** With verification on, wrong OTP fails; correct OTP marks verified. With verification off, checkout proceeds without OTP.
- **Dependencies:** REQ-017
- **Platform:** Shared

## REQ-019

- **Requirement:** Returning users are recognized, prefills apply, and checkout is shortened.
- **Expected behavior:** Known profile and default address are filled; user can pay without re-entering unchanged data.
- **Acceptance test:** Complete one order; start a second; name, mobile, and default address are prefilled; fewer steps than the first purchase.
- **Dependencies:** REQ-016, REQ-017, REQ-021, REQ-023
- **Platform:** Telegram

## REQ-020

- **Requirement:** User dashboard shows personal data, past orders, shipment status, and change history.
- **Expected behavior:** User can view (not only admin) this information; profile edits append to change history.
- **Acceptance test:** After an order and a profile edit, dashboard shows the order, shipment/tracking state, and a history row for the edit.
- **Dependencies:** REQ-016, REQ-017, REQ-027
- **Platform:** Telegram

## REQ-021

- **Requirement:** Users manage multiple addresses, edit them, and pick a default.
- **Expected behavior:** Add/edit/delete (or deactivate) addresses; exactly one default when any address exists; checkout uses the selected/default address.
- **Acceptance test:** Add two addresses, set the second as default, edit the first; checkout shows the default unless the user selects otherwise.
- **Dependencies:** REQ-016, REQ-022
- **Platform:** Shared

## REQ-022

- **Requirement:** Province, city, and postal code are validated with available data/services.
- **Expected behavior:** Invalid combinations or postal formats are rejected; if no external validator is available, documented local rules still run.
- **Acceptance test:** Submit empty city or illegal postal code; save is rejected. Submit a valid sample; save succeeds.
- **Dependencies:** REQ-002
- **Platform:** Backend

## REQ-023

- **Requirement:** User can create and update a cart.
- **Expected behavior:** Add/remove/change quantity; cart survives Mini App reopen for the same user until checked out or expired per rules.
- **Acceptance test:** Add an issue, close Mini App, reopen; cart still contains it. Remove line; cart updates.
- **Dependencies:** REQ-016, REQ-011
- **Platform:** Shared

## REQ-024

- **Requirement:** Order amount is calculated (items, discounts, shipping).
- **Expected behavior:** Displayed payable amount equals items − discount + shipping; matches the amount sent to the gateway.
- **Acceptance test:** Cart with two items, a valid code, and a shipping method; UI total equals backend total equals gateway amount.
- **Dependencies:** REQ-023, REQ-033, REQ-035
- **Platform:** Backend

## REQ-025

- **Requirement:** User can place an order from the cart.
- **Expected behavior:** A pending/unpaid order is created with snapshot of items, address, and amounts.
- **Acceptance test:** Checkout with valid profile and address creates an order id; cart is bound to that order.
- **Dependencies:** REQ-017, REQ-021, REQ-023, REQ-024
- **Platform:** Shared

## REQ-026

- **Requirement:** Successful orders are stored durably.
- **Expected behavior:** After confirmed payment, order status is paid/successful and is the source of truth for admin and history.
- **Acceptance test:** Complete payment; order remains after process restart; admin and user history both show it.
- **Dependencies:** REQ-025, REQ-040
- **Platform:** Backend

## REQ-027

- **Requirement:** User can see order history.
- **Expected behavior:** List of the user’s orders with status and amounts; no other user’s orders.
- **Acceptance test:** Two users each place an order; each history shows only their own.
- **Dependencies:** REQ-026
- **Platform:** Telegram

## REQ-028

- **Requirement:** Success page with thanks, invoice record/display, shipping queue, admin notification.
- **Expected behavior:** After paid order, user sees confirmation and invoice reference; order enters a fulfillment queue; admin is notified in panel (and/or configured channel).
- **Acceptance test:** Pay successfully; Mini App shows thank-you + invoice; admin sees a new queued order without manual refresh longer than the agreed poll/push delay.
- **Dependencies:** REQ-026, REQ-041
- **Platform:** Shared

## REQ-029

- **Requirement:** Admins manage orders and change status.
- **Expected behavior:** Authorized roles can open an order and move it through the defined statuses (e.g. paid → packing → shipped → delivered, plus cancellation rules).
- **Acceptance test:** Admin changes status; user dashboard reflects it; unauthorized role cannot change status.
- **Dependencies:** REQ-026, REQ-046, REQ-067
- **Platform:** Web Admin

## REQ-030

- **Requirement:** Admins filter orders and produce address labels / packing lists.
- **Expected behavior:** Filters (status, date, messenger, etc.) reduce the list; print or export label/packing list for the selection.
- **Acceptance test:** Filter paid-unshipped; export/print list includes names and addresses of those orders only.
- **Dependencies:** REQ-029
- **Platform:** Web Admin

## REQ-031

- **Requirement:** Sell single issues and periodic subscription packages.
- **Expected behavior:** User can buy one issue or a defined subscription SKU; subscription creates the agreed entitlement (issues/term) recorded on the user.
- **Acceptance test:** Purchase a single issue; order has one issue line. Purchase a package; user is marked active subscriber for the configured term/issues.
- **Dependencies:** REQ-023, REQ-032
- **Platform:** Shared

## REQ-032

- **Requirement:** Admins manage subscription packages.
- **Expected behavior:** Create/edit/deactivate packages (name, price, duration or issue count, contents).
- **Acceptance test:** Create a package in admin; it appears in Mini App; deactivate it; new purchases of that SKU stop.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-033

- **Requirement:** Discount codes apply at checkout.
- **Expected behavior:** Valid code reduces payable amount per rules (percent/fixed, min basket, expiry); invalid/expired/used-up codes are rejected.
- **Acceptance test:** Apply a valid code; total drops. Apply expired code; error, total unchanged.
- **Dependencies:** REQ-023, REQ-034
- **Platform:** Shared

## REQ-034

- **Requirement:** Admins manage discount codes.
- **Expected behavior:** CRUD (or create/disable) codes with value, validity window, and usage limits.
- **Acceptance test:** Create a code in admin; it works once at checkout; after max uses it fails.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-035

- **Requirement:** Shipping methods and costs are applied in scope.
- **Expected behavior:** User selects an offered method; cost matches admin configuration; digital-only carts can skip physical shipping if so configured.
- **Acceptance test:** Physical cart shows methods and fees; changing method updates REQ-024 total.
- **Dependencies:** REQ-023, REQ-038
- **Platform:** Shared

## REQ-036

- **Requirement:** Admin enters tracking code; user sees it when entered.
- **Expected behavior:** Empty tracking is allowed until fulfillment; once saved, user history/dashboard shows it. System does not itself post the parcel.
- **Acceptance test:** Admin saves a tracking string; user order view shows the same string.
- **Dependencies:** REQ-029, REQ-020
- **Platform:** Shared

## REQ-037

- **Requirement:** Customer is notified automatically when a tracking code is saved, via connected SMS/messenger.
- **Expected behavior:** Saving a tracking code enqueues a message; if SMS/bot is down, failure is logged and does not corrupt the order.
- **Acceptance test:** Save tracking; test user receives SMS or bot message containing the code (with services configured). Disable provider; admin still sees a failed-send log.
- **Dependencies:** REQ-036, REQ-061
- **Platform:** Backend

## REQ-038

- **Requirement:** Admins configure shipping cost.
- **Expected behavior:** Shipping fee table or rules are editable without a code deploy.
- **Acceptance test:** Change a fee in admin; new checkout uses the new fee; in-flight unpaid orders keep their snapshotted fee.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-039

- **Requirement:** Integrate the mutually approved IRR (or fiat) payment gateway.
- **Expected behavior:** Checkout can redirect or otherwise start a gateway payment for the calculated amount.
- **Acceptance test:** Sandbox/live (as agreed) payment session is created for a real order amount.
- **Dependencies:** REQ-025, REQ-044
- **Platform:** Backend

## REQ-040

- **Requirement:** Successful and failed payments are recorded.
- **Expected behavior:** Each attempt stores status, amount, gateway reference, and order link.
- **Acceptance test:** One success and one failure (cancel or decline) produce two records with distinct statuses.
- **Dependencies:** REQ-039
- **Platform:** Backend

## REQ-041

- **Requirement:** User sees the payment result.
- **Expected behavior:** Distinct success and failure screens/messages after return from gateway or crypto flow.
- **Acceptance test:** Complete a success path (REQ-028) and a fail path; user is not left on a blank WebView.
- **Dependencies:** REQ-040
- **Platform:** Telegram

## REQ-042

- **Requirement:** User can retry after failed payment.
- **Expected behavior:** Failed/cancelled payment leaves the order retryable or recreates a payable attempt without duplicating fulfillment.
- **Acceptance test:** Fail payment, tap retry, pay successfully; exactly one successful fulfillment.
- **Dependencies:** REQ-041, REQ-039
- **Platform:** Shared

## REQ-043

- **Requirement:** Admin can list successful and failed transactions.
- **Expected behavior:** Filterable list with amount, status, time, user/order.
- **Acceptance test:** After mixed attempts, admin list shows both; opening a row matches gateway/backend record.
- **Dependencies:** REQ-040, REQ-046
- **Platform:** Web Admin

## REQ-044

- **Requirement:** Admins configure gateway settings.
- **Expected behavior:** Merchant keys/mode are stored securely and used by REQ-039; changing mode does not leak secrets in the UI.
- **Acceptance test:** Update sandbox credentials as an admin; a test payment uses them. Secrets are masked in the form.
- **Dependencies:** REQ-046, REQ-072
- **Platform:** Web Admin

## REQ-045

- **Requirement:** Cryptocurrency payment exists only in the Telegram Mini App.
- **Expected behavior:** Telegram Mini App offers crypto alongside (or as configured with) the fiat gateway; Bale and web admin have no customer crypto checkout.
- **Acceptance test:** Pay an order with crypto in Telegram; order becomes paid. Confirm Bale checkout has no crypto button. Admin cannot initiate a customer crypto charge as a storefront.
- **Dependencies:** REQ-005, REQ-025, REQ-040
- **Platform:** Telegram

## REQ-046

- **Requirement:** Web admin panel exists and is the operator UI.
- **Expected behavior:** Authenticated staff reach dashboard and modules below; public users cannot.
- **Acceptance test:** Unauthenticated request to admin URL is rejected; valid staff login reaches REQ-050.
- **Dependencies:** REQ-070
- **Platform:** Web Admin

## REQ-047

- **Requirement:** Admins manage end users.
- **Expected behavior:** Search/list users, open profile, see orders; support actions stay within role permissions.
- **Acceptance test:** Find a Mini App user by mobile; open record; orders match REQ-027.
- **Dependencies:** REQ-016, REQ-046
- **Platform:** Web Admin

## REQ-048

- **Requirement:** Admins manage issues/products: price, stock, images, cover, descriptions.
- **Expected behavior:** Create/update issue metadata; Mini App reflects published changes.
- **Acceptance test:** Change price and cover; Mini App detail shows new values after refresh.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-049

- **Requirement:** Admins manage home banners, FAQ, and help texts.
- **Expected behavior:** Published content appears in Mini App help/FAQ/home without a deploy.
- **Acceptance test:** Edit FAQ in admin; Mini App FAQ shows the new answer. Same for a help article and a home banner.
- **Dependencies:** REQ-010, REQ-046, REQ-064, REQ-065
- **Platform:** Web Admin

## REQ-050

- **Requirement:** Management dashboard is available.
- **Expected behavior:** After login, admin sees an overview (widgets may be filled by REQ-051/053).
- **Acceptance test:** Login lands on a dashboard page, not an empty 404.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-051

- **Requirement:** Stats for users, products, orders, and sales.
- **Expected behavior:** Dashboard or reports show counts/sums consistent with the database.
- **Acceptance test:** Seed known counts; UI matches those counts.
- **Dependencies:** REQ-050, REQ-026
- **Platform:** Web Admin

## REQ-052

- **Requirement:** Revenue by time range, messenger split, and entry source, where data exists.
- **Expected behavior:** Date filter changes totals; Telegram vs Bale split matches order.channel; source matches REQ-003.
- **Acceptance test:** Two orders from different messengers/sources; report split equals those orders.
- **Dependencies:** REQ-003, REQ-051
- **Platform:** Web Admin

## REQ-053

- **Requirement:** Sales funnel is shown.
- **Expected behavior:** Funnel stages (at least visit/browse, cart, checkout, paid — using stored events) are visible.
- **Acceptance test:** Walk a test user through abandon-at-cart vs paid; funnel counts move in the expected stages.
- **Dependencies:** REQ-003, REQ-023, REQ-026
- **Platform:** Web Admin

## REQ-054

- **Requirement:** Users can be categorized and tagged.
- **Expected behavior:** Admin assigns tags/categories; lists can filter by them.
- **Acceptance test:** Tag a user “VIP”; filter users by that tag returns them.
- **Dependencies:** REQ-047
- **Platform:** Web Admin

## REQ-055

- **Requirement:** System identifies buyers, visitors, payment abandoners, and active subscribers from recorded data.
- **Expected behavior:** Segments are derived (or nightly refreshed) from orders, sessions, failed payments, and subscription state — not only manual tags.
- **Acceptance test:** Create one user per type with the matching events; each appears in the corresponding segment.
- **Dependencies:** REQ-026, REQ-031, REQ-042, REQ-003
- **Platform:** Backend

## REQ-056

- **Requirement:** Retargeting subsystem exists.
- **Expected behavior:** Segment membership can trigger outbound messages according to rules, without sending to unsubscribed/blocked users if the provider supports that.
- **Acceptance test:** A user in an abandoner segment receives the configured reminder once; a paid user does not get the abandoner reminder.
- **Dependencies:** REQ-055, REQ-061
- **Platform:** Backend

## REQ-057

- **Requirement:** Abandoned-checkout and failed-payment reminders with panel-configurable delay and copy.
- **Expected behavior:** Admin sets delay and Persian text; job sends via SMS and/or messenger; paying cancels further reminders for that order.
- **Acceptance test:** Abandon cart; after configured delay (or test clock) message is sent. Pay in between; no reminder.
- **Dependencies:** REQ-046, REQ-056, REQ-061
- **Platform:** Shared

## REQ-058

- **Requirement:** Infrastructure to message defined user groups via other connected services.
- **Expected behavior:** A group (segment or tag) can be selected as a campaign audience; send goes through the connected provider APIs, not ad-hoc one-off scripts.
- **Acceptance test:** Select a tag with N users; dry-run or test send reports N targeted (minus unsubscribes).
- **Dependencies:** REQ-054, REQ-055, REQ-061
- **Platform:** Backend

## REQ-059

- **Requirement:** Manual targeted campaigns from the admin panel.
- **Expected behavior:** Admin composes a campaign, picks audience, sends or schedules, within provider limits.
- **Acceptance test:** Create and send a test campaign to a single test user; delivery logged.
- **Dependencies:** REQ-058, REQ-046
- **Platform:** Web Admin

## REQ-060

- **Requirement:** Measurable campaign performance reports.
- **Expected behavior:** For sends the system can observe (sent, failed, and click/open if the channel provides it), admin sees counts.
- **Acceptance test:** After REQ-059, report shows at least sent vs failed for that campaign.
- **Dependencies:** REQ-059
- **Platform:** Web Admin

## REQ-061

- **Requirement:** SMS and in-messenger messaging using available services.
- **Expected behavior:** A message API can send SMS and Telegram/Bale bot messages when credentials exist; missing credentials fail clearly.
- **Acceptance test:** Send a test SMS and a test bot message to a fixture user with providers configured.
- **Dependencies:** REQ-007, REQ-008, REQ-062
- **Platform:** Backend

## REQ-062

- **Requirement:** Admins configure SMS provider settings.
- **Expected behavior:** API keys/sender id stored securely; used by REQ-061.
- **Acceptance test:** Save SMS settings; test send uses them. Secrets masked.
- **Dependencies:** REQ-046, REQ-072
- **Platform:** Web Admin

## REQ-063

- **Requirement:** Webhook or API integration to the client’s existing CRM.
- **Expected behavior:** Agreed events (at least new user and paid order) POST to the client CRM endpoint with auth; retries/backoff on failure; payload documented.
- **Acceptance test:** Paid order produces a CRM request captured by a test endpoint; signature/auth matches the spec agreed with the client.
- **Dependencies:** REQ-016, REQ-026
- **Platform:** Backend

## REQ-064

- **Requirement:** Help section in the product.
- **Expected behavior:** User can open help content managed via REQ-049.
- **Acceptance test:** Mini App has a Help entry; content matches admin.
- **Dependencies:** REQ-005
- **Platform:** Telegram

## REQ-065

- **Requirement:** FAQ is available to users.
- **Expected behavior:** FAQ list/answers render; empty FAQ is a valid empty state, not an error.
- **Acceptance test:** FAQ list renders; empty FAQ is a valid empty state. After REQ-049 publishes items, those answers appear (proven in REQ-049).
- **Dependencies:** REQ-005
- **Platform:** Telegram

## REQ-066

- **Requirement:** Ticket or in-app support with handoff to a human operator.
- **Expected behavior:** User can open a thread; admin/operator sees it and replies; user is notified via Mini App and/or bot within platform limits.
- **Acceptance test:** User sends a ticket; operator replies in admin; user sees the reply.
- **Dependencies:** REQ-016, REQ-046, REQ-007
- **Platform:** Shared

## REQ-067

- **Requirement:** Distinct admin roles and permissions.
- **Expected behavior:** At least the roles implied by the contract (e.g. fulfillment vs full admin vs finance viewer) cannot perform others’ writes.
- **Acceptance test:** Restricted role cannot change gateway keys or delete issues; privileged role can. Matrix is written in handover docs.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-068

- **Requirement:** Audit log of administrative actions.
- **Expected behavior:** Writes (login optional, catalog, orders, settings, campaigns, user edits) append actor, action, time, target.
- **Acceptance test:** Change an issue price; audit log shows who, what, when. Log is not editable by a normal admin role.
- **Dependencies:** REQ-046, REQ-067
- **Platform:** Backend

## REQ-069

- **Requirement:** CSV/Excel export of exposable data.
- **Expected behavior:** At least orders and users (and other agreed datasets) export; encoding supports Persian.
- **Acceptance test:** Export orders; open in Excel/Sheets; Persian names intact; row count matches filter.
- **Dependencies:** REQ-029, REQ-047
- **Platform:** Web Admin

## REQ-070

- **Requirement:** Conventional security for this class of system.
- **Expected behavior:** AuthN on admin; verification of Telegram init data; no public PII dumps; HTTPS in production; parameterized queries; secrets not in git.
- **Acceptance test:** Checklist signed in handover: init-data verify, admin session, HTTPS, secrets in env, no directory listing of PDFs.
- **Dependencies:** REQ-002
- **Platform:** Shared

## REQ-071

- **Requirement:** Preview/download files use signed, time-limited URLs.
- **Expected behavior:** URLs expire; unsigned URLs are rejected; guessing another issue’s path fails authorization.
- **Acceptance test:** Capture a preview URL; after TTL it 403s. User A URL cannot fetch user B’s purchased file.
- **Dependencies:** REQ-014, REQ-070
- **Platform:** Backend

## REQ-072

- **Requirement:** Credentials, tokens, and API keys are confidential and used only to run the project.
- **Expected behavior:** Secrets live in env/secret store; admin UIs mask them; they are not logged in full.
- **Acceptance test:** Grep of repo has no live keys; logs of a payment call do not print the full secret.
- **Dependencies:** REQ-002
- **Platform:** Backend

## REQ-073

- **Requirement:** Main scenarios are tested before final delivery: register/login, place order, purchase, payment success, payment failure, returning user, retargeting, admin panel, plus other main Scope paths.
- **Expected behavior:** A written test report maps each scenario to pass/fail.
- **Acceptance test:** Test report attached to handover lists Article 17 scenarios all passing on production-like env.
- **Dependencies:** REQ-016, REQ-025, REQ-039, REQ-041, REQ-042, REQ-019, REQ-056, REQ-046
- **Platform:** Shared

## REQ-074

- **Requirement:** Final version is deployed to production.
- **Expected behavior:** Production URLs for Mini App, bots, and admin are live on client-funded infrastructure.
- **Acceptance test:** Client representative opens production Mini App and admin; bots answer on production tokens.
- **Dependencies:** REQ-073, third-party hosting paid by client (Article 13)
- **Platform:** Shared

## REQ-075

- **Requirement:** Compatibility checked on typical user environments.
- **Expected behavior:** Documented pass on current Telegram iOS/Android WebView and a current desktop Telegram; Bale on a typical Android/iOS client if in scope; admin on current Chrome/Safari.
- **Acceptance test:** Compatibility matrix in handover with date, OS, app versions, pass/fail.
- **Dependencies:** REQ-005, REQ-008, REQ-046
- **Platform:** Shared

## REQ-076

- **Requirement:** Persian guide for the admin panel.
- **Expected behavior:** Guide covers login, catalog, orders, tracking, discounts, campaigns, roles — at the level needed to operate Phase 1.
- **Acceptance test:** A non-author staff member completes “enter tracking code” using only the guide.
- **Dependencies:** REQ-046
- **Platform:** Web Admin

## REQ-077

- **Requirement:** Essential technical docs and custom API docs if custom APIs exist.
- **Expected behavior:** How to run, env vars, deploy, and any contractor-built API surface.
- **Acceptance test:** Handover folder contains those docs; a developer can deploy a staging instance from them (given secrets).
- **Dependencies:** REQ-002, REQ-046
- **Platform:** Backend

## REQ-078

- **Requirement:** After full settlement, deliver running system, custom source, and transferable accesses.
- **Expected behavior:** Items in Article 18 that are gated on settlement are transferred; until settlement, contract 12/20 holds (no extra product features).
- **Acceptance test:** Settlement confirmed; client has repo/access list signed off.
- **Dependencies:** REQ-074, client payment (Articles 9, 12, 20)
- **Platform:** Shared

## REQ-079

- **Requirement:** One training session on the admin panel for client representatives.
- **Expected behavior:** Session occurs; attendance noted in handover.
- **Acceptance test:** Signed or written confirmation of date and attendees.
- **Dependencies:** REQ-076, REQ-046
- **Platform:** Web Admin

## REQ-080

- **Requirement:** One month of in-scope defect fixes after final delivery, without new features.
- **Expected behavior:** Defects vs this acceptance file are fixed; change requests go to a new contract (Article 7).
- **Acceptance test:** Process documented; a sample in-scope bug filed in week 1 is fixed within the month.
- **Dependencies:** REQ-074
- **Platform:** Shared

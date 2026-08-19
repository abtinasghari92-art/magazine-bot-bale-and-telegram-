# magazine-platform — Phase 1 Scope

**Project:** magazine-platform (Telegram Mini App + Bale bot + web admin)  
**Source of truth:** Contract «قرارداد طراحی، توسعه، پیاده‌سازی و تحویل فاز اول سامانه فروش مبتنی بر مینی‌اپ تلگرام، بازوی بله و خدمات مرتبط» (project 1002), dated as signed, especially **Article 5**, plus Phase 1 obligations in Articles **16**, **17**, **18**, and **19**.  
**Out of this document:** application code. This file is implementation documentation only.

## Rules used for extraction

- Every Phase 1 contractual feature appears **exactly once**, under one heading below.
- Overlapping clauses (for example 5-5 with 5-60, or 5-7/5-8 with 5-66) are merged into a single feature that keeps all distinct obligations.
- Clause **5-78** does not add a separate product feature; it incorporates Phase 1 proposal detail. The proposal file is not in this repository; unresolved client/proposal details are listed in `docs/DECISIONS_REQUIRED.md`.
- **Not in Phase 1 (Article 23):** Phase 2, AI / RAG / intelligent assistant, native Android/iOS apps, independent ecommerce website, full DRM, magazine content production, photography, cover design, copy-editing, third-party service costs, support after the one-month defect window.

Requirement IDs (`REQ-001` … `REQ-080`) are the shared keys used in `docs/ACCEPTANCE.md` and `docs/SPRINTS.md`.

---

## Platform foundation

- **REQ-001** — Right-to-left Persian UI across user-facing surfaces. *(5-4)*
- **REQ-002** — Technical structure suitable for later development, without implementing out-of-scope phases. *(16-3)*
- **REQ-003** — Persist messenger user id plus entry source / Deep Link parameters, within messenger capabilities, for analytics and retargeting. *(5-61)*
- **REQ-004** — Slow-network experience: progressive loading and reduced initial payload. *(5-72)*

## Telegram Mini App

- **REQ-005** — Design and implement the Telegram Mini App as the primary storefront. *(5-1)*
- **REQ-006** — Align Mini App chrome with Telegram light and dark themes, within platform capability. *(5-72)*

## Telegram Bot

- **REQ-007** — Telegram bot as entry gateway, notification channel, user communication, and guidance into the Mini App / purchase flow. *(5-2)*

## Bale Bot

- **REQ-008** — Bale bot implementing agreed capabilities within Bale infrastructure and APIs. *(5-3, 6-4)*
- **REQ-009** — Numeric issue selection in Bale for users who do not open a Mini App, if Bale technically supports it. *(5-67)*

## Magazine catalog

- **REQ-010** — Home page shows the current / latest issue with a quick-purchase path. *(5-5, 5-60)*
- **REQ-011** — Issue detail shows cover, title, issue number, publication date, description, table of contents, price, and stock. *(5-6)*

## Archive

- **REQ-012** — Archive listing as a grid, with search. *(5-7, 5-66)*
- **REQ-013** — Archive filters by year, season, and topic (and other categories named in the Phase 1 proposal), with progressive loading matching the content structure supplied by the client. *(5-8, 5-66)*

## PDF preview/download

- **REQ-014** — Multi-page PDF preview of an issue, with the agreed page limit and watermark. *(5-9)*
- **REQ-015** — Download of files that Phase 1 allows: previews and, when the client has delivered a purchased digital copy, that file. *(5-27, 5-70)*

## User accounts

- **REQ-016** — User account system. *(5-26)*
- **REQ-017** — Capture and complete profile: first name, last name, mobile number, and other fields required by the contract. *(5-10, 5-11)*
- **REQ-018** — Mobile-number verification when required. *(5-12)*
- **REQ-019** — Detect returning users, prefill known data, and enable a fast checkout path. *(5-62)*
- **REQ-020** — User dashboard: personal data, previous orders, shipment status, and history of profile/data changes. *(5-69)*

## Addresses

- **REQ-021** — Multiple addresses, change/edit, and a default address. *(5-11, 5-13, 5-63)*
- **REQ-022** — Validate province, city, and postal code within available datasets/services. *(5-63)*

## Cart

- **REQ-023** — Create and maintain a shopping cart. *(5-14)*
- **REQ-024** — Calculate order amount (line items, discounts, shipping). *(5-16)*

## Orders

- **REQ-025** — Place an order. *(5-15)*
- **REQ-026** — Persist successful orders. *(5-23)*
- **REQ-027** — User-visible order history. *(5-24)*
- **REQ-028** — After successful payment: thank-you page, invoice display or record, enqueue for shipment, notify admin panel. *(5-64)*
- **REQ-029** — Admin order management and order-status changes. *(5-41, 5-42)*

## Subscriptions

- **REQ-031** — Two purchase models: single-issue sale and periodic subscription packages, per Phase 1 definitions. *(5-59)*
- **REQ-032** — Admin management of subscription packages. *(5-75)*

## Discounts

- **REQ-033** — Apply discount codes at checkout. *(5-17)*
- **REQ-034** — Admin management of discount codes. *(5-75)*

## Shipping

- **REQ-035** — Shipping methods and shipping-cost calculation within Phase 1 scope. *(5-18)*
- **REQ-036** — Admin enters tracking code; user sees it when present. Physical packing and postal delivery remain the client’s operation. *(5-25, 5-43, 5-44, 15-14, 15-15)*
- **REQ-037** — Automatic customer notification of the tracking code, within connected messaging services. *(5-76)*
- **REQ-038** — Admin configuration of shipping cost. *(5-77)*
- **REQ-030** — Admin order filters, address-label / packing-list print or export, as shipping operations support. *(5-76)*

## Payment

- **REQ-039** — Connect the payment gateway approved by both parties. *(5-19)*
- **REQ-040** — Record successful and failed payments. *(5-20)*
- **REQ-041** — Show payment result to the user. *(5-21)*
- **REQ-042** — Allow retry after failed payment. *(5-22)*
- **REQ-043** — Admin list of successful and failed transactions. *(5-45)*
- **REQ-044** — Admin settings for the payment gateway. *(5-77)*

## Telegram crypto payment

- **REQ-045** — Cryptocurrency payment is designed and implemented **only** inside the Telegram Mini App (not Bale, not web admin). *(16-10)*

## Admin panel

- **REQ-046** — Web administration panel. *(5-32)*
- **REQ-047** — Admin user management. *(5-36)*
- **REQ-048** — Admin management of products / magazine issues: price, stock, images, cover, descriptions. *(5-39, 5-40)*
- **REQ-049** — Admin management of home banners, FAQ copy, and help texts. *(5-30, 5-75)*

## Dashboard

- **REQ-050** — Management dashboard as the admin landing overview. *(5-33)*

## Analytics

- **REQ-051** — Counts and stats for users, products, orders, and sales. *(5-34, 5-73)*
- **REQ-052** — Reports for revenue over time ranges, split by messenger, and by entry source, for measurable data. *(5-73)*

## Funnel

- **REQ-053** — Sales-funnel view in admin. *(5-35, 5-73)*

## User segmentation

- **REQ-054** — Categorize and tag users. *(5-37)*
- **REQ-055** — Identify buyers, visitors, payment/checkout abandoners, and active subscribers from recorded data. *(5-38, 5-74)*

## Retargeting

- **REQ-056** — Retargeting subsystem. *(5-46)*
- **REQ-057** — Reminders after abandoned checkout or failed payment; time and copy configurable in the panel. *(5-47, 5-65)*

## Campaigns

- **REQ-058** — Infrastructure to send targeted messages to defined user groups, using other connected services within technical limits. *(5-49)*
- **REQ-059** — Manual targeted campaigns from the panel, within connected services. *(5-65)*
- **REQ-060** — Performance reports for campaigns the system can measure. *(5-50)*

## SMS / messaging

- **REQ-061** — SMS and in-messenger messages within available third-party services. *(5-48)*
- **REQ-062** — Admin settings for the SMS service. *(5-77)*

## CRM integration

- **REQ-063** — Webhook or API connection to the client’s current CRM, within the Phase 1 specification. *(5-52)*

## Support / tickets

- **REQ-064** — In-product help section. *(5-28)*
- **REQ-065** — FAQ for users. *(5-29)*
- **REQ-066** — Ticket or in-app support thread, with handoff to a human operator, within platform capability. *(5-31, 5-71)*

## Roles and permissions

- **REQ-067** — Distinct admin roles and access levels. *(5-53, 5-77)*

## Audit log

- **REQ-068** — Audit log of administrative actions. *(5-54, 5-77)*

## Export CSV/Excel

- **REQ-069** — CSV/Excel export of data the system is allowed to expose. *(5-51)*

## Security

- **REQ-070** — Conventional security measures appropriate to this project. *(16-4)*
- **REQ-071** — Signed, time-limited URLs for preview and download files, to reduce unauthorized resharing. *(5-68)*
- **REQ-072** — Treat passwords, tokens, and API keys as confidential; use them only to run the project. *(21-1, 21-2, 21-4)*

## Deployment

- **REQ-073** — Test main purchase and payment scenarios (and the Article 17 scenario list) before final delivery. *(5-55, 17-1, 17-2)*
- **REQ-074** — Deploy the final production version. *(5-56)*
- **REQ-075** — Check compatibility on typical user environments, within technical limits. *(17-3)*

## Documentation and handover

- **REQ-076** — Persian guide for using the admin panel. *(5-57, 18-5)*
- **REQ-077** — Essential technical documentation, plus custom API docs if custom APIs exist. *(18-3, 18-4)*
- **REQ-078** — After full settlement: running system, deliverable custom source, and transferable accesses. *(5-58, 18-1, 18-2, 18-6, 9-6, 20-2)*
- **REQ-079** — One training session on the admin panel for client representatives. *(18-7)*
- **REQ-080** — One-month in-scope defect fix after final delivery (wrong behavior vs agreed spec only; not new features). *(19-1, 19-2)*

---

## Explicitly out of Phase 1

Do not implement or document as Phase 1 work:

| Excluded | Contract |
| --- | --- |
| Phase 2 and intelligent archive assistant | 2-2, 3-4, 4, 23-1 |
| Magazine content production, photography, cover design, editing | 23-2 … 23-5 |
| Standalone Android app | 23-6 |
| Standalone iOS app | 23-7 |
| Independent ecommerce website | 23-8 |
| Full DRM system | 23-9 |
| Third-party service fees (hosting, SMS, gateway, CDN, licenses) | 13, 23-11 |
| Support after the one-month defect window | 19-4, 23-12 |
| Physical packing, postage, last-mile delivery | 15-14, 15-15 |

---

## Traceability (contract clause → REQ)

| Clause | REQ |
| --- | --- |
| 5-1 | REQ-005 |
| 5-2 | REQ-007 |
| 5-3 | REQ-008 |
| 5-4 | REQ-001 |
| 5-5, 5-60 | REQ-010 |
| 5-6 | REQ-011 |
| 5-7, 5-66 (grid/search) | REQ-012 |
| 5-8, 5-66 (filters/lazy load) | REQ-013 |
| 5-9 | REQ-014 |
| 5-10, 5-11 (profile) | REQ-017 |
| 5-12 | REQ-018 |
| 5-11/5-13/5-63 (addresses) | REQ-021 |
| 5-63 (geo/postal validation) | REQ-022 |
| 5-14 | REQ-023 |
| 5-15 | REQ-025 |
| 5-16 | REQ-024 |
| 5-17 | REQ-033 |
| 5-18 | REQ-035 |
| 5-19 | REQ-039 |
| 5-20 | REQ-040 |
| 5-21 | REQ-041 |
| 5-22 | REQ-042 |
| 5-23 | REQ-026 |
| 5-24 | REQ-027 |
| 5-25, 5-43, 5-44 | REQ-036 |
| 5-26 | REQ-016 |
| 5-27, 5-70 | REQ-015 |
| 5-28 | REQ-064 |
| 5-29 | REQ-065 |
| 5-30, 5-75 (FAQ/help/banners) | REQ-049 |
| 5-31, 5-71 | REQ-066 |
| 5-32 | REQ-046 |
| 5-33 | REQ-050 |
| 5-34 | REQ-051 |
| 5-35, 5-73 (funnel) | REQ-053 |
| 5-36 | REQ-047 |
| 5-37 | REQ-054 |
| 5-38, 5-74 | REQ-055 |
| 5-39, 5-40 | REQ-048 |
| 5-41, 5-42 | REQ-029 |
| 5-45 | REQ-043 |
| 5-46 | REQ-056 |
| 5-47, 5-65 (reminders) | REQ-057 |
| 5-48 | REQ-061 |
| 5-49 | REQ-058 |
| 5-50 | REQ-060 |
| 5-51 | REQ-069 |
| 5-52 | REQ-063 |
| 5-53, 5-77 (roles) | REQ-067 |
| 5-54, 5-77 (audit) | REQ-068 |
| 5-55, 17-1, 17-2 | REQ-073 |
| 5-56 | REQ-074 |
| 5-57, 18-5 | REQ-076 |
| 5-58, 18-1, 18-2, 18-6 | REQ-078 |
| 5-59 | REQ-031 |
| 5-61 | REQ-003 |
| 5-62 | REQ-019 |
| 5-64 | REQ-028 |
| 5-65 (manual campaigns) | REQ-059 |
| 5-67 | REQ-009 |
| 5-68 | REQ-071 |
| 5-69 | REQ-020 |
| 5-72 (theme) | REQ-006 |
| 5-72 (slow network) | REQ-004 |
| 5-73 (messenger/source/revenue) | REQ-052 |
| 5-75 (packages) | REQ-032 |
| 5-75 (discount codes) | REQ-034 |
| 5-76 (labels/filters) | REQ-030 |
| 5-76 (tracking notify) | REQ-037 |
| 5-77 (shipping cost setting) | REQ-038 |
| 5-77 (gateway setting) | REQ-044 |
| 5-77 (SMS setting) | REQ-062 |
| 5-78 | No extra REQ (proposal incorporation; see ambiguities) |
| 16-3 | REQ-002 |
| 16-4 | REQ-070 |
| 16-10 | REQ-045 |
| 17-3 | REQ-075 |
| 18-3, 18-4 | REQ-077 |
| 18-7 | REQ-079 |
| 19-1 | REQ-080 |
| 21-1, 21-2, 21-4 | REQ-072 |

**Total extracted requirements: 80 (REQ-001 … REQ-080).**

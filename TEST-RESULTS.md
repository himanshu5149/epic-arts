# Validation — Epic Arts catalog, Studio & guarded Art Advisor

> **October 26, 2026 refresh (this section first):** the “digital product experience” additions — wall planner, print-fit helper and free printer test sheet — passed **44/44 unit tests** (`tests/walls.test.mjs` eight new tests; 36 existing unchanged), a clean `tsc --noEmit`, and a production build. Fresh HTTP evidence in `tests/reports/wall-planner-2026-10-26.json`: `/wall` 200 with server-rendered frames, share-link tamper rejection (studio/private IDs dropped, `noindex` on parameterized URLs), sitemap inclusion, printer-test PDF served as `%PDF` (6,467 bytes), product-page planner links, home teaser, and unchanged `private, no-store` on advisor/Studio. Wall-tamper and fit arithmetic are unit-tested; full browser/axe/mobile suites were not rerun for this additive UI change. The remaining sections below describe the October 24 validation.


**Validated October 24, 2026.** Final production build is running on port **3000** in explicit free demo mode. No live payment, email, image-AI or language-model credential is configured. Browser regressions use an isolated production-mode instance with disposable data/cache paths, not the customer database.

## Celebrations & gifting refresh (October 26, 2026)
- **47/47 unit tests** after adding `tests/celebrations.test.mjs` (occasion-edit integrity, gift validation, gift checkout shape).
- Isolated production QA (`DATA_DIR=.cache/qa/celebrations-tmp`, port 3010, data deleted): demo gift checkout 201 → identical re-POST 200 with gift intact; changed gift content with the same idempotency key → 409. Serializable order includes `gift` only when present.
- Fresh HTTP evidence `tests/reports/celebrations-gift-2026-10-26.json`: 9 routes 200, `/celebrations` SSR with 3 occasion sections, sitemap inclusion, `/checkout`/`/advisor`/`/studio`/`/library` remain `private, no-store`, catalog 1,288, demo enabled. Not rerun: browser/axe/mobile suites for this additive change.

## Inspiration shelf refresh (October 26, 2026)
- **51/51 unit tests** after adding `tests/references.test.mjs` (query bounds, public-domain filtering, cache behavior, thumbnail id validation, disk caching, failure mapping). `tsc` clean; production build ok.
- Fresh HTTP evidence `tests/reports/inspiration-shelf-2026-10-26.json`: 9 routes 200 with correct cache policy, `/inspiration` SSR title + curated chips, sitemap inclusion, 400 for invalid thumbnail ids. **The sandbox could not reach api.artic.edu**, so the live call exercised the designed honest-503 path; real upstream data shape is covered by unit tests with faithful fixtures. Browser/axe/mobile suites not rerun for this additive change.

## Passed

| Area | Verified result |
| --- | --- |
| Types/build | `tsc --noEmit`, Vite client and React SSR builds, offline public asset index all pass. Final client JS **470.88 kB / 144.90 kB gzip**, CSS **158.92 kB / 30.56 kB gzip**, SSR **364.92 kB**. |
| Unit suite | **36/36 pass**: original 15 plus 21 advisor tests. Includes 60 palette/count/direction/budget property combinations within one test. |
| Public catalog | **1,032 public editions**, all traversed across **43** 24-item pages without missing or duplicate IDs. Maximum API page size 48; the gallery does not render 1,000 cards. |
| Distinct artwork | **1,024 unique structural vector compositions**, after stripping metadata/titles/paper-fleck texture; 16 families × 64 editions. No fabricated new reviews or ratings. |
| Native exports | All 16 families rendered real SVG/raster images and valid nine-file ZIPs: native SVG, 2400×3000 PNG/JPG, three vector artwork PDFs, recipe, print guide and license. Density and native PDF characteristics tested. |
| Advisor selection | A real three-family Mithila-inspired collection in Indigo Dawn, **$56 total under a $60 total artwork budget**; distinct public IDs, correct palette, source-backed provenance and file guidance. |
| Budget boundary | Insufficient budgets return no full collection, never expensive substitutes. Textual total limits can narrow the form budget. Affordable families remain in an open-direction candidate pool. A mid-run price change is re-read and rejected if over budget. |
| Collection purchase | Explicit collection-to-bag action → real three-item demo checkout → authorized library → actual **2,378,349-byte native-vector ZIP**, all nine entries verified, including SVG and valid PDF headers. No automatic order was created by the recommendation. |
| Studio handoff | Matching approved family, palette and seed correctly prefill Studio controls. **Zero automatic Studio POSTs** on opening the handoff. Creation still needs a visitor click. |
| Grounded questions | Reviewed licensing, handmade/provenance boundaries, file resolution and private-order guidance; source links and dated research. A weather question explicitly abstains. “Trends” plural retrieves the evidence panel correctly. |
| Advisor persistence | Refresh resumes the private run. Exclusion-based rerolls return different IDs. A simulated server-accepted POST with a lost response resumes with `reused=true`, not a second reservation. |
| Advisor authorization | Owning session or correct bearer capability accepted; unrelated browser, wrong capability, malformed/unknown/expired run rejected. Capabilities are hashed server-side and absent from exported briefs/action logs. |
| Role/call bounds | Unknown roles and payment/publication/shell capabilities rejected. Two async execution slots were tested against eight queued model-backed requests; max concurrent mocked provider requests was **2**. A looping model stops at **3 calls / 4 read-only tools**. |
| Quotas/recovery | Queue cap, two-outstanding/session, 60 briefs/session/day, six model reservations/session/day, installation model quota, idempotency, interrupted-run recovery, expiry cleanup and event cascade exercised. Disabling the model also disables already queued model reservations. |
| Optional model adapter | Actual chat tool-call protocol tested with mocked HTTP responses, including valid retrieval, no-consent/no-call, forbidden tools, fabricated/private IDs, quota exhaustion, provider failure and labeled no-key fallback. No live model request is claimed. |
| Linked activity | Four local specialist action records; optional model actions add actual events. Stored-head verification passes and detects changed summaries or missing tail entries. This is a consistency check, not signed/immutable evidence. |
| Original commerce | All **16** original desktop behavioral checks pass: filters/sort/search, saved/cart persistence, promo, review gating, private links, ownership, CSRF, public offline browsing and real original ZIP download. |
| Original download | The existing Tree of Life ZIP remains **5,169,580 bytes**. The eight original archives were not regenerated or replaced. |
| Original mobile | Navigation/saved drawer/cart, demo checkout, second real download and cookie-free token fallback pass. |
| Studio expansion | Real generation → private product → persistent cart → checkout → library → **2,481,669-byte nine-file ZIP**, expected seed `2401026`, owner/token controls and private metadata exclusion. Minor archive size differences can reflect PDF metadata. |
| Snapshots | Existing atomic product/recipe snapshots and snapshot-based downloads remain intact. Raw studio capability stripping is preserved. |
| Responsive | **101 page/state/viewport checks**, 320–1440 px: 36 original, 30 Studio/catalog expansion, 35 advisor/collection/guide/three-item-checkout combinations. No horizontal overflow. |
| Accessibility | Zero axe WCAG A/AA findings across the 16 existing route cases and eight advisor states, plus cart/populated-library and generated Studio-result/history checks. Automated checks do not constitute manual screen-reader certification. |
| Image/browser health | Final advisor flow: no page exceptions, image HTTP errors or broken decoded images. No external HTTP request in no-key mode. Original regression and expansion suites report no browser errors. |
| PWA privacy | APIs, advisor, Studio, orders, checkout, private products/previews, tokens and downloads are not stored in service-worker caches. Visited public pages still work offline. |
| Development | Development SSR and hydrated advisor tested after resolving React Router v7 conditional-export interoperability. Direct and `/@fs/` access to private source/cache/skill paths return 403/404, not file content. |
| SEO/deployment | Advisor SSR, canonical title/URL, sitemap entry and private/no-store landing response tested. HEAD requests now receive the appropriate 200 headers. Existing public product schema and private noindex protections remain. |
| Source/license | Exact upstream commit pinned, three small reference examples and eight skill files retained/verified unchanged, four domain skills hashed. Apache license and adaptation notice retained. No monorepo dependency installation. |
| Dependency hygiene | Upstream dependency-doctor executed offline: **0 manifest findings**. Full `npm audit`: **0 known vulnerabilities** at validation time. These are different checks, not a guarantee against all defects. |

## Local observations, not production-scale claims

The latest isolated catalog traversal measured **9 ms p95 local HTTP time** across 43 bounded metadata requests. An earlier run while browser suites competed for this small sandbox measured 45 ms. Neither is a public latency guarantee, capacity estimate or production load test.

Simultaneously launching multiple Chromium suites and a development compiler exceeded short test deadlines in this constrained sandbox. Catalog behavior was narrowed/reproduced, then the full original purchase/mobile/expansion suites passed when run serially. The advisor suite and original purchase suite were rerun successfully against the final build. Worker/candidate/queue limits are implemented, but distributed traffic and internet-scale throughput are **not tested**.

## Reproducible commands

```bash
npm run check
npm test
npm run build
npm audit
python3 .agents/skills/dependency-doctor/scripts/dep_doctor.py package.json --json

# Use a separate production-mode demo process with isolated DATA_DIR and CACHE_DIR.
TEST_ORIGIN=http://localhost:3001 node tests/agents-browser.mjs
TEST_URL=http://localhost:3001 node tests/e2e.mjs
TEST_URL=http://localhost:3001 node tests/mobile.mjs
TEST_URL=http://localhost:3001 node tests/expansion.mjs
TEST_URL=http://localhost:3001 node tests/accessibility.mjs
TEST_URL=http://localhost:3001 node tests/overlay-a11y.mjs
```

Browser scripts require Playwright Chromium and its OS dependencies. Defaults target port 3000 if the environment override is omitted; tests create real demo orders, so deliberately select disposable storage.

## Retained evidence

- `tests/reports/agents-browser-results.json`: final 20 advisor checks, 35 layouts, eight axe states, real ZIP contents and no-key network results.
- `tests/reports/dev-agent-results.json`: development SSR/interaction and source-file protection.
- `tests/reports/dependency-doctor.json`: actual upstream offline skill output.
- `tests/reports/scope-creep.json`, `tests/reports/SCOPE-REVIEW.md`: actual upstream diff classification and file-by-file review dispositions.
- `tests/accessibility-report.json`: existing route scans.
- `tests/expansion-results.json`: all 1,032 products, Studio purchase/download, 30 layouts and local request observation.

Raw capabilities, private test state, downloaded ZIPs, isolated QA databases and screenshots are kept under excluded `.cache/qa/` paths, not published as customer-facing assets.

## Cleanup and non-claims

One precisely identified main-preview advisor QA order, its snapshots/access records, five associated private runs, 20 action events and its unused test session were selectively removed. Later full browser regressions used disposable isolated storage. Unrelated orders, creations and sessions were not deleted. Earlier catalog-expansion QA cleanup remains documented in the previous work; no bulk database reset was performed.

Not represented as validated or connected:

- Live Stripe payments/refunds, real receipt email, payment-country eligibility, taxes, an external production domain or reviewed legal identity/policies.
- Live image-AI or language-model output, provider account/model eligibility, moderation behavior, real billing or guaranteed financial enforcement without credentials. Provider-side controls are still required.
- Live search volumes, authenticated marketplace analytics, actual Epic Arts buyer demand, predicted revenue or bestseller status. Research is dated third-party evidence.
- Multiple application replicas, distributed queues/databases, internet-scale load, backup restoration, a penetration test, every device/browser or manual accessibility certification.
- Handmade/antique authenticity, artisan partnerships, exclusive ownership or guaranteed copyright protection. Native vector and original upscaled/raster provenance remain clearly distinguished.

See `AGENT-SYSTEM.md`, `THIRD-PARTY-NOTICES.md`, `README.md`, `ARCHITECTURE.md` and `MARKET-RESEARCH.md`. The preview still offers **free demo checkout with real downloads**; it does not collect a real payment.

## Catalog variety expansion — 26 October 2026
- Four new appended motif families (`pond-turtle`, `royal-elephant`, `scroll-garden`, `diya-glow`) raise twenty generative families: **1,280 reproducible + 8 originals = 1,288 public editions**. Existing recipes/seeds/IDs unchanged (families appended at end of registry; engine still `1.0.0`).
- Full suite **52/52** including new guard “appended motif families preserve every existing 1.0.0 recipe”.
- Fresh HTTP evidence `tests/reports/catalog-variety-2026-10-26.json`: catalog 1,288, 54 pages, `/shop?page=54` 200, `/collections` 200, all four new families render real 720×900 WebP previews (23–35 KB), family search `turtle`/`diwali` each resolve 64 editions, legacy preview bytes unchanged.

## Multi-gateway payments — 26 October 2026
- Payment layer (`server/payments.mjs`) adds **Razorpay** (UPI/QR/cards/netbanking/wallets, INR at documented `USD_INR_RATE`) and **PayPal** (Orders API v2, server-side capture) alongside demo and **Stripe** (upgraded to automatic payment methods: cards + Apple Pay/Google Pay/Link). Nothing is collected without configured secrets; unconfigured modes answer honest **503** with a specific message.
- Suite **64/64**; new `tests/payments.test.mjs` (12 tests): gateway enablement honesty, USD→paise math, Razorpay order idempotency, HMAC callback verification + replay safety, amount/gateway mismatch refusals, signed webhook capture + failure-order safety, PayPal create/COMPLETED capture/custom-id + amount cross-checks, failed capture state machine, mode validation.
- Fresh HTTP evidence `tests/reports/payment-gateways-2026-10-26.json`: config lists only `demo` with no keys; razorpay/paypal/stripe checkout attempts → 503 with specific honest messages; unknown mode → 400; demo purchase 201 → real ZIP download 200; hosted page/callback/paypal-return guards 404/400; webhook 503 without configured secret; `gateway`/`gateway_ref` migration verified on the live store.
- Not certifiable here: real gateway onboarding, sandbox/live charges, webhook delivery from providers, and INR settlement — they require the operator’s own keys.

## Master-homage families + 100k catalog scale — 27 October 2026
- Catalog grew 1,288 → **100,808 editions**: 28 families × 3,600 versionsed editions + 8 originals. Eight appended "World masters" families (`hokusai-current`, `starry-nocturne`, `golden-adele`, `sfumato-orb`, `scream-dusk`, `monet-lilies`, `vermeer-window`, `mucha-muse`) — public-domain artist homages (died 80+ years), original generative compositions, honest disclaimer text on every page; no copying of any artwork, no marketplace scraping.
- Scale engineering: catalog storage switches public generative rows to compact recipe refs hydrated deterministically on read (SQL DB ~54 MB for 100,808 rows; ~2.5 s seeding; steady ~90 MB RSS through a full 100,808-row pagination traversal). FTS5 per-row delete skipped during clean reseeds (was unbounded). Writes re-canonicalize generative public rows from recipes — forged stored prices/names cannot enter; gate tests prove forged-price neutralization and DB-level visibility-flip refusal.
- Suite **65/65**; evidence `tests/reports/masters-homage-scale-2026-10-27.json`: health/catalog=100,808, 2,101 pages (limit 48), last page 200, all eight homages render 720×900 WebP previews (17–45 KB, ~80–160 ms first render), `q=hokusai|klimt|salvator|vermeer|mucha|monet` each resolve exactly 3,600 editions, art pages 200 with public-domain/no-reproduction/no-endorsement disclaimers, bounded sitemap 2,019 URLs, home badge 100,808.

## Google keywords + download hardening — 27 October 2026
- Sitewide `meta[name=keywords]` via a shared vocabulary (core heritage terms + per-page topical keywords + artist-inspired terms on 8 master-homage families) and `keywords` embedded in Product JSON-LD on every artwork page. Verified live: `/` 17 keywords, `/shop` 22, `/art/starry-nocturne-1800` 34 (incl. "van gogh inspired art", "world masters homage art"), legacy & celebration pages covered. Evidence: `tests/reports/keywords-and-downloads-2026-10-27.json`.
- Downloads: end-to-end verified working (demo checkout → `/api/download` → valid `PK` ZIP, 0.5–5 MB, CRC OK) for originals, legacy and master-homage editions. Client hardened for embedded previews: iframe banner, per-artwork direct file link (right-click → Save), window.open fallback, clearer notices.
- Suite 65/65 after changes.

# Epic Arts — catalog, generation & advisor architecture

## What is implemented

```text
Browser / installable PWA
  ├─ SSR page + bounded route bootstrap (8 home / 24 shop / 12 trend-edit products)
  ├─ React catalog, persistent bag, saved pieces, recent unlisted studio editions
  └─ same-origin API
       ├─ indexed SQLite catalog + FTS5 + pagination/filtering
       ├─ durable studio job queue → procedural renderer / optional image provider
       ├─ private advisor queue → public catalog/guide retrieval → budget/provenance gate
       │    └─ optional consent-gated model coordinator → bounded read-only tools
       ├─ authoritative checkout → Stripe or explicit free demo
       └─ ownership-authorized library → on-demand private export

Raster previews: SVG → Sharp → 720×900 WebP → regenerable cache
Purchased engine editions: SVG → PNG/JPG + vector artwork PDFs → private ZIP cache
```

### Inventory is real, not placeholder cards

`shared/designs.mjs` defines sixteen families, eight palettes and deterministic recipes. `server/art-engine.mjs` contains the actual drawing rules. The catalog seeds 64 editions per family plus the eight original products: **1,032 public editions**.

Every engine product can generate its own SVG, PNG, JPG, three PDF sizes, recipe, guide and license. No thousand-file stock-image download or raster archive precomputation is necessary. Tests compare all 1,024 compositions **after removing metadata and paper-fleck texture** to detect duplicates that merely have different names or superficial noise.

The original eight ZIPs remain under `private/downloads`. Native-vector editions do not inherit their AI-upscaling disclosure.

### Search and pagination

`server/catalog.mjs` indexes category, color, style, price and curated order. FTS5 indexes names, traditions, descriptions and discovery terms. Search terms are normalized and passed as prepared-statement values; user input cannot become SQL or arbitrary FTS operators.

- `GET /api/catalog` and the compatibility alias `GET /api/products` return `{items,total,page,pages,limit,catalogTotal,...}`.
- Default page size: 24; maximum: 48. Query parameters: `q`, `collection`, `color`, `style`, `max`, `sort`, `page`, `limit`.
- Sorts: curated, newest, price-low/high, editorial trending, paid purchases, and paid-buyer ratings.
- Private studio products are excluded from search, public lists and the sitemap.
- Canonical request keys keep client hydration and SSR on the same page/filter result.
- The browser imports compact design metadata and individual recipe resolution, **not a 1,032-record JSON inventory**.

The pagination currently uses bounded SQL LIMIT/OFFSET. For very deep catalogs (hundreds of thousands or millions), use keyset pagination and dedicated search infrastructure rather than claiming the current implementation is unlimited.

### Studio jobs

- `POST /api/studio/jobs` validates an allowlisted family and palette, a 0–2147483647 seed, detail 1–5, title ≤80 characters and mood ≤400 characters.
- Job creation returns an unguessable ID and bearer token. `GET /api/studio/jobs/:id?token=...` reports queued/rendering/complete/failed state.
- SQLite persists the queue. Jobs left rendering at process restart are returned to queued state.
- One studio worker runs at a time; total pending queue is capped at twelve jobs. Built-in jobs are usually short. Optional remote image AI shares this worker, so production operators should separate slow provider work before heavy use.
- Per-session daily allowance and IP rate limits prevent an unbounded public generation endpoint.
- Results are **unlisted purchasable products**, not automatically published into the public catalog. Product metadata requires its owning session or a valid studio capability. Order-authorized links can open collected personal editions on another device.
- Recent studio records/tokens and a pending job token are stored on the creating device. Checkout refuses to proceed while a cart edition is unresolved, avoiding an amount that differs from the visible items.

The built-in engine is procedural design, not arbitrary text-to-image inference. Keyword mood matching only suggests an existing family and palette. “Surprise me” selects and composes a new recipe automatically.

### Guarded Art Advisor

`/advisor` is an integrated public landing page with private client-side results. The four roles are catalog curator, heritage guide, collection stylist and print companion. In the default **no-key mode**, they run deterministic rules, indexed catalog retrieval, guide retrieval and server validation—not four independent language models.

`server/agents/` adds a durable, private run lifecycle with atomic idempotency/quota reservation, at most 12 waiting jobs and two default cooperative async execution slots (1–3 configurable) inside the **single Node process**. It is not a distributed worker cluster. Run reads require the owner session or a valid hashed capability. The UI sends capabilities in Authorization headers; no private brief/result enters SSR bootstrap, the sitemap or the PWA cache. Runs expire after seven days, with periodic/startup terminal cleanup.

A brief yields 1–4 actual public native-vector editions. Retrieval and a 96-state beam heuristic operate on at most 64 candidates, preserve low-price families, enforce explicit palette/family constraints and keep integer-cent totals at or below the total budget. A final gate re-reads current product documents/prices and rejects private, changed, unverified or over-budget output. No full fit returns an explicit adjustment request, not a more expensive substitution.

A small reviewed guide corpus has its own FTS5 index. It separates native vector from upscaled/raster editions, personal from commercial rights, contemporary inspiration from handmade authenticity, and dated research from live demand. Unsupported topics abstain. It does not query private orders or ingest arbitrary URLs.

Optional language-model mode requires a server flag/key **and per-brief visitor consent**. A coordinator can use a bounded OpenAI read-only function-tool protocol and return product/guide IDs. Server gates remain authoritative. No model output can change catalog prices, write files, create/publish products, charge a payment, send email or approve a refund. There are at most three model calls/four function invocations per attempt, reservation quotas and timeouts; unavailability or a failed guard falls back to no-key mode. No live provider credential was supplied; protocol and failure behavior are mocked in tests.

Activity records port the hash-linking pattern from the named upstream repository and are persisted with a stored head. These verify consistency, not cryptographic identity or an independently anchored immutable audit. Skill Markdown provides reviewed boundaries, not executable powers; code allowlists and validation enforce them. No hidden model reasoning is exposed.

Explicit UI actions hand verified IDs to the existing bag/checkout, or an approved family/palette/seed to Studio controls. Opening Studio does not create anything. Commerce snapshots and download authorization are unchanged.

See **`AGENT-SYSTEM.md`** for exact APIs, quotas, retries, retention, limitations, deployment requirements and source mapping; **`THIRD-PARTY-NOTICES.md`** for the pinned Apache-licensed adaptations.

### Optional live image provider

Both `AI_GENERATION_ENABLED=true` and `OPENAI_API_KEY` are required. The browser receives a capability flag, never the API key. The server moderates the prompt, calls OpenAI image generation, stores the raster original in `DATA_DIR/source-images`, and labels the edition as image-AI/raster rather than native vector.

`OPENAI_IMAGE_MODEL` defaults to `gpt-image-1`; it must be available to the operator’s provider account. `AI_DAILY_LIMIT` defaults to five job reservations across the installation per UTC day, capped at twenty; there is also a per-session allowance. These are application quotas, **not a guaranteed currency spend cap**. Set provider-side financial limits. A process failure during an external request can require retry/reconciliation.

No provider credentials were supplied, so actual provider output, account eligibility, moderation behavior, price and external billing are **not live-validated**.

### Previews and paid delivery

Public previews are lower-resolution WebP derivatives with an Epic Arts preview mark. Full SVG source is not exposed by a public drawing endpoint. Original/private download directories are not mounted as static assets.

Studio preview URLs contain unguessable 128-bit edition identifiers. They are unlisted preview capabilities, **not authenticated image endpoints**: anyone who obtains an image URL can view that low-resolution preview. They use private/no-store headers and are excluded from the PWA cache. Full metadata and full files remain separately protected.

Every ZIP request checks the order, paid/demo state, session or order token, and item membership **before generating or streaming a file**. New checkout orders save immutable product/recipe snapshots atomically with the order; order display and downloads prefer those snapshots. Legacy orders without snapshots continue to resolve their existing product IDs.

The renderer uses single-flight promises to coalesce duplicate work. Preview work is limited to three concurrent renderings; ZIP export work to one, with a bounded waiting queue. Sharp concurrency and memory caching are also limited. Preview/export caches use versioned paths with a default **soft 256 MB threshold**, cleaned every 32 new writes. They are expendable and can be regenerated.

**Versioning contract:** preserve the 1.0.0 drawing rules and public ID recipes. Do not change the artwork behind a sold ID. A future renderer release must retain the previous renderer and use a new version/ID namespace; unsupported recipe versions fail rather than silently drawing a different edition.

### Persistence and deployment

Back up:
- the SQLite database under `DATA_DIR` (orders, snapshots, token hashes, private designs, jobs, private advisor runs/action chains, consent and reviews);
- `DATA_DIR/source-images` if image AI is enabled;
- the original `private/downloads` directory supplied with the app.

Preview and generated-ZIP caches can be deleted. Original AI-provider source images **cannot** be recreated reliably from a prompt; do not treat them as disposable cache.

Use one Node instance and a persistent local volume. In Docker, explicitly set `DATA_DIR=/data` and `CACHE_DIR=/data/cache` when an env file would otherwise override them. SQLite WAL is appropriate for this tested installation, not a claim of multi-region or horizontally distributed readiness.

### Path to larger traffic, not represented as already deployed

1. Serve public derivative previews through a CDN; keep full exports private.
2. Move transactional records, catalog metadata and the queue to shared Postgres (or equivalent) with transactional job claiming.
3. Move provider originals and immutable exports to private object storage with lifecycle/versioning and short-lived, authorized download URLs.
4. Separate generation, model orchestration and export workers from the web process. Add a properly leased shared queue, durable retry policies, dead-letter handling, provider reconciliation and cost monitoring. Do not run the current startup-wide SQLite queue recovery in multiple replicas.
5. Add keyset pagination/search service for very deep inventory, and operator review/publishing tools for quality and rights checks.
6. Load-test the intended workload, test backup restoration and recovery, and instrument paid-order/download success before increasing marketing spend.

These are concrete next infrastructure steps, **not implemented or proven distributed services**.

## Verification

See `TEST-RESULTS.md`. The local traversal benchmark covered all 43 catalog pages and all 1,032 IDs; its measured request time is a local development-machine observation, not a production throughput SLA. The suite also exercises native exports across all sixteen families, personal creation/purchase/download, access controls, PWA exclusions, accessibility and mobile layouts.

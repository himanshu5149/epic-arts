# Epic Arts — the guarded Art Advisor

**Implemented October 24, 2026.** Open **Art advisor** in the site navigation, or `/advisor`.

This is a working extension of the storefront, not a directory of unrelated AI demos. It adapts selected patterns from `Shubhamsaboo/awesome-llm-apps` at commit `6c16b23f1bacd0fdf240bb5141ef45e59e82c306`. See `THIRD-PARTY-NOTICES.md` and the pinned, unmodified reference sources under `vendor/awesome-llm-apps/`.

## What a visitor can do now

1. Describe a wall, choose a direction/room/palette, and set **one total USD artwork budget** for 1–4 editions.
2. Receive real, public, native-vector products in a shared palette. The server selects complementary families where the budget permits, rejects duplicate IDs and never fills a collection with over-budget products.
3. View the actual editions in a framed arrangement. This is inspiration, not a measured installation; no frame or physical print is sold.
4. Read source-linked provenance, license, file and printing guidance. Ask the gallery about these topics, or see dated research with its limitations. Unsupported questions are explicitly not answered.
5. Ask for another selection, excluding previously shown IDs; save a capability-free JSON brief; refresh to resume; inspect and verify the stored action chain.
6. Explicitly add the collection to the bag, then use the existing checkout/library to download real files.
7. Open **Make a matching edition** to prefill an allowlisted Studio family, palette and seed. This does **not** create, publish, buy or automatically request image AI. The visitor must click Create in the Studio.

The default example produces **three Indigo Dawn, Mithila-inspired editions for $56 total against a $60 budget**. Product prices are re-read at the final gate, and checked again at checkout. Printing, frames and any checkout taxes are separate.

## Honest modes

### No-key mode — enabled by default

Four specialist **roles** execute a deterministic retrieval-and-validation workflow:

| Role | Actual capabilities | Main boundary |
| --- | --- | --- |
| Catalog curator | `search_catalog`, `get_product` | Only eligible **public** products; no private studio data or invented IDs |
| Heritage guide | `search_guides`, `trend_evidence` | Reviewed passages and dated sources; no artisan-authenticity or live-demand claim |
| Collection stylist | `fit_collection` | Integer-cent total, distinct IDs, a coherent palette, bounded selection |
| Print companion | `search_guides` | Distinguish native vector from upscaled/raster editions; personal-use and digital-only clarity |

This is **not four independently running language models**, a general reasoning service, image understanding, or arbitrary text-to-image generation. Free-text cues use finite keyword/topic rules; the explicit palette, direction, count and budget controls remain important. An unrecognized question abstains rather than receiving a plausible invention.

Catalog retrieval uses existing indexed SQLite reads; reviewed guide retrieval uses a separate FTS5 index. There is no embedding bill, external search API, remote URL crawling, or synthetic customer/order memory.

### Optional connected-model mode — off until configured and opted into

Set on the **server only**:

```dotenv
AGENT_LLM_ENABLED=true
OPENAI_API_KEY=your-server-side-key
OPENAI_AGENT_MODEL=gpt-4.1-mini
AGENT_DAILY_LLM_LIMIT=20
AGENT_WORKERS=2
```

Both the flag and key are required. The visitor must additionally select the per-brief opt-in checkbox. The browser never requests a model key. The image-AI flag is independent: turning the advisor model on does not turn image generation on.

The coordinator uses the actual OpenAI chat tool-call protocol. It can invoke three **read-only** function tools: search eligible products, read an eligible product, and retrieve reviewed guides. It must retrieve before returning structured product/guide IDs. It cannot supply authoritative prices, URLs, policies or prose. Its selection is independently validated on the server against the candidate pool, current catalog visibility, recipe version, palette, allowed families, requested count and total budget.

A provider error, malformed/fabricated selection, forbidden tool, excess loop or failed guard falls back to the verified no-key selection and is visibly labeled. Disabling the model also disables previously queued model reservations. No raw model reasoning is saved or displayed.

**Live provider calls were not tested:** no credentials were supplied. The normal protocol, tool limits, forbidden actions, hallucinated/private IDs, consent, disabled configuration, quotas, provider failures and fallback were tested using mocked HTTP responses. Confirm account/model access and set provider-side spending controls before enabling it. A reservation quota is not a guaranteed financial cap.

## Real source use, not automatic “powers”

- **Specialist roles:** adapted from `multimodal_design_agent_team/design_agent_team.py`. We use its division-of-responsibility pattern, not its Streamlit UI, Gemini dependency, or screenshot-upload feature.
- **Permission gates and linked activity:** adapted from `trust_gated_agent_team/trust_gated_agents.py`. Meaningful allowlisted capabilities replace the demo's arbitrary trust scores.
- **Retrieval-first grounding:** adapted from `rag_tutorials/agentic_rag_gpt5/agentic_rag_gpt5.py`. A reviewed local FTS corpus replaces arbitrary URL ingestion and a paid embedding/vector service. No unsafe HTML rendering is used.
- **Actually executed development skills:** the audited upstream dependency-doctor ran offline against `package.json`; scope-creep-detector classified the saved feature diff. Reports and review dispositions are retained under `tests/reports/`.
- **Domain skills:** `skills/epic-{curator,heritage,stylist,print}/SKILL.md` are operator-reviewed boundaries. The runtime loads and hashes them; optional model prompts include them. Server code and schemas enforce permissions regardless of prompt text. Markdown does not grant tools or execute code.

The full monorepo was shallow-cloned for review, not added to the product or installed wholesale. Only selected small sources, skills, license, provenance and real adaptations are retained. No new npm or Python runtime dependency was added.

## Lifecycle, limits and privacy

```text
POST validated brief + client-generated capability + retry key
  → atomic idempotency / quota / queue reservation
  → queued → running → complete | failed
       curator retrieval
       heritage grounding / dated research
       optional bounded model coordinator
       stylist budget + current-product gate
       print companion guidance
  → private result + checked actions
  → explicit visitor choice: bag / Studio / keep brief
```

- **One Node instance, one SQLite database.** Default two cooperative asynchronous execution slots (configurable 1–3), not separate CPU worker processes or distributed workers.
- Up to 12 waiting jobs; no more than two outstanding briefs per session. At most 60 new briefs/session/UTC day and 40 POSTs/IP/hour, plus the site's existing API limits. Session limits are not authenticated-person identity guarantees.
- Idempotent retry keys and token hashes prevent a lost POST response from reserving a second job. Completed retries reuse the same run; a changed body or capability is rejected.
- At most two attempts for an interrupted run. Queued/running work survives restart. This is single-instance recovery: **do not run multiple web processes against this queue**.
- At most 16 indexed family reads, at most 128 matching products before ranking, at most 64 solver candidates, 1–4 final editions, beam width 96. This is a bounded heuristic selector, not a proof of globally optimal taste or every possible combination.
- Optional model: at most 3 HTTP model calls and 4 read-only function invocations per attempt; each request has a 15-second timeout and at most 700 completion tokens. Failed calls can still cost money.
- Default 20 model-job reservations per installation/UTC day (operator range 1–50), and at most 6/session/day. Reservations, including failures, count at intake. Interrupted attempts can repeat provider calls; reservations created on an earlier day may execute after recovery. Use external financial controls.
- Read access requires the owning HttpOnly session **or** the 256-bit private run capability. Only hashes of capabilities are stored on the server. Capabilities are sent in Authorization headers, not result URLs. Client-generated capabilities use `crypto.getRandomValues`.
- The most recent request/capability is kept in local storage for resume. Clearing it is device-only. Expired device records are removed when the page next opens. Run access expires after seven days; terminal server records/events are removed every 15 minutes while running and on startup. An offline process cannot delete records until it restarts.
- `/advisor`, its APIs, and other private commerce/Studio routes are excluded from PWA caching. The SSR landing page remains a discoverable public page with a canonical URL and sitemap entry; personal results are not embedded in SSR or sitemaps.
- Optional model context is only the opted-in brief, reviewed skills, eligible public product summaries and guide excerpts. It contains no session cookies, checkout contact data, order tokens, private studio tokens, API keys or private files. Users should not put sensitive information in a brief.

## Action-chain semantics

Each stored event includes run ID, sequence, timestamp, role, approved action, input/output digests, a human-readable action summary, previous hash and SHA-256 entry hash. Event append and stored-head update are one transaction. Verification detects changed summaries, broken sequences, or a removed tail when the stored head remains unchanged.

This is a **consistency check**, not signed or immutable evidence. An attacker able to rewrite the database and all hashes can fabricate a new chain; there is no independent anchor. The log shows tool actions and verified facts, not private model reasoning. Neither it nor a skill file is an authorization credential.

## API

All result/action endpoints use private/no-store responses and same-origin JSON mutation protections.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/agents/config` | Capabilities, actual model availability, role/skill versions and hashes; no key |
| POST | `/api/agents/runs` | Validated request; returns id/state/mode/reused |
| GET | `/api/agents/runs/:id` | Private run state, result, activity and chain status |
| GET | `/api/agents/runs/:id/audit` | Authorized stored-chain verification/export |

POST fields: `brief` (5–700 chars), `intent` (`collection`/`question`), `budget` (USD 1–300), `count` (1–4), approved `direction`, `palette`, `room`, optional public `exclude` IDs (max 16), explicit boolean `useLlm`, a retry-safe `requestKey` (16–100 safe characters) and a securely random 64-hex `token`. The UI generates and saves the last two before sending. A textual “under $45 total” can narrow, never raise, the form budget. An “each” amount does not replace the total budget.

GET requests can supply `Authorization: Bearer <run capability>`. The owning session also grants access. Unknown, unauthorized, malformed and expired run reads return 404 without revealing another visitor's run.

## Verification and operations

```bash
npm run check
npm test
npm run build
node tests/agents-browser.mjs
python3 .agents/skills/dependency-doctor/scripts/dep_doctor.py package.json --json
```

For browser regressions, use a disposable `DATA_DIR` and `CACHE_DIR` and set `TEST_ORIGIN` for `agents-browser.mjs` or `TEST_URL` for the existing suites. Tests create real demo orders; do not run bulk cleanup against a customer database. The final advisor browser suite verifies a real three-item checkout and native-vector ZIP, eight axe states, 35 layouts, no-key/no-external-request behavior, private data isolation, idempotent lost-response recovery and Studio prefill without automatic creation.

Back up SQLite including commerce and agent records, plus non-regenerable provider originals. Retain skill versions and source attribution with the release. The production Docker image copies the four domain skills, Apache license and third-party notice; developer reference caches and audit tools are not required to serve the app.

## What “larger scale” still requires

The implemented indexed reads, bounded candidate/DOM sizes, durable jobs, idempotency, quotas, fallback and retention are **single-instance safeguards**, not a globally distributed deployment. Before horizontal scale:

1. Move catalog/commerce/run storage to shared transactional Postgres with proper migrations.
2. Move long-running jobs to a shared leased queue with dead letters, cancellation, reconciliation and idempotent provider effects. Do not reuse this startup-wide SQLite recovery logic across replicas.
3. Separate web, model orchestration, rendering and export workers. Add authenticated cost controls and monitoring.
4. Use private object storage/versioned exports and a CDN for public derivatives; keep purchase authorization before issuing short-lived downloads.
5. Load-test the real arrival mix and provider latency, establish SLOs, test restores and recovery, and review rights/policies before paid launch.

Those services and throughput guarantees have **not** been deployed or claimed here.

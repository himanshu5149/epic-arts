# Scope review — guarded Art Advisor integration

Intent: Integrate a guarded Epic Arts advisor agent workflow and reviewed awesome-llm-apps skills, with budget-safe collections, source attribution, private resumable orchestration, and preserved commerce.

Input: a saved unified diff against source/config/documentation copies captured before this task (no Git history was invented). SHA-256: `c02f4d15d0b4f054ab608d83218d346780f6ea279245d4278c8112a26e287f64`.

The actual upstream classifier reports **51 files**, **+3912 / −76 lines**, across 9 path subsystems. It detected **0 new manifest dependencies**, **0 API-rename signals**, **0 formatting-only files**, and one Docker build-file change. Generated evidence JSON/screenshots/downloads are not part of this code diff.

## Interpretation

The classifier uses cheap exact path/intent tokens without stemming. For example, singular `agent` in the intent does not match the directory token `agents`; it also cannot infer that Header/Footer/SEO/privacy changes integrate a route. These are review prompts, not proof of unrelated work. Every zero-overlap path has an explicit disposition below. The classifier is not a JavaScript API compatibility oracle or a security audit.

## Keep / split / justify dispositions

| Flagged file | Disposition | Connection to intent |
| --- | --- | --- |
| `.dockerignore` | **Justify** | Exclude regenerable reference/QA caches and development audit tools from the Docker build context; no storefront feature is removed. |
| `.env.example` | **Keep** | Document the new optional server-only advisor flag, model, worker and reservation limits; all defaults remain no-key. |
| `AGENTS.md` | **Keep** | Make retained project skills discoverable and state preservation, credential and isolated-QA boundaries for future maintainers. |
| `ARCHITECTURE.md` | **Keep** | Explain the actual advisor queue/gates and explicitly distinguish single-instance safeguards from future distributed services. |
| `Dockerfile` | **Justify** | The runtime reads four domain skills at startup, so they must ship; Apache license and adaptation notice must accompany the derivative runtime. |
| `README.md` | **Keep** | Expose the new visitor flow and truthful mode/setup/test instructions in the existing project entry point. |
| `TEST-RESULTS.md` | **Keep** | Record verified new behavior and rerun existing-store outcomes, including limitations and precise QA cleanup. |
| `THIRD-PARTY-NOTICES.md` | **Keep** | Attribute actual selected Apache-licensed sources, pin the upstream commit, preserve author notices and explain adaptations. |
| `public/sw.js` | **Keep** | Exclude advisor navigation/results from private PWA caching, alongside existing Studio/commerce exclusions. |
| `server/agents/audit.mjs` | **Keep** | Implement the requested trust-gated role capability checks and hash-linked private action consistency records. |
| `server/agents/index.mjs` | **Keep** | Implement durable lifecycle, idempotency, authorization, bounded execution, quotas, expiry and recoverable advisor requests. |
| `server/agents/knowledge.mjs` | **Keep** | Provide reviewed FTS guide retrieval and source-grounded, dated heritage/printing/research facts. |
| `server/agents/planner.mjs` | **Keep** | Ground product retrieval and enforce distinct editions, palette, current prices and total artwork budget. |
| `server/agents/provider.mjs` | **Keep** | Make the optional model integration a real bounded read-only tool-call protocol, never a payment/publication agent. |
| `server/index.mjs` | **Justify** | Mount advisor APIs/lifecycle, protect new internal paths and no-store page state, and allow correct HEAD responses without changing existing commerce contracts. |
| `shared/agents.mjs` | **Keep** | Share operator-approved role metadata, capabilities and allowed room/direction settings across runtime and UI. |
| `shared/seo.mjs` | **Keep** | Give the new public landing page valid SSR metadata/canonical/sitemap coverage without indexing private results. |
| `src/App.tsx` | **Keep** | Route the integrated Art Advisor within the existing app and providers. |
| `src/components/Footer.tsx` | **Keep** | Make the integrated advisor discoverable in the existing help navigation. |
| `src/components/Header.tsx` | **Keep** | Expose the new advisor route in desktop and mobile navigation. |
| `src/pages/Home.tsx` | **Keep** | Add a small on-brand entry point into the budget-safe gallery-wall workflow. |
| `src/pages/Info.tsx` | **Keep** | Disclose advisor local/server storage, expiry and optional per-brief provider transfer in the existing privacy policy. |
| `src/pages/Studio.tsx` | **Keep** | Accept a validated family/palette/seed handoff while preserving the explicit Create step and no-key default. |
| `src/styles.css` | **Keep** | Load the cohesive advisor styles and the tablet navigation correction required by the fifth nav item. |
| `tests/accessibility.mjs` | **Keep** | Allow the existing suite to target an isolated demo instance rather than writing QA state into the customer database. |
| `tests/agents-browser.mjs` | **Keep** | Exercise the real new workflow, authorization, lost-response resume, download, privacy, 35 layouts and eight axe states. |
| `tests/agents.test.mjs` | **Keep** | Test hard permission/budget/recovery/expiry/provider boundaries and bounded orchestration, not just UI labels. |
| `tests/e2e.mjs` | **Keep** | Add only a target-origin override so the unchanged commerce regression can safely run on disposable storage. |
| `tests/mobile.mjs` | **Keep** | Add only a target-origin override for the existing mobile regression and responsive scans. |
| `tests/overlay-a11y.mjs` | **Keep** | Add only a target-origin override for the existing cart/library/focus regression. |
| `vite.config.ts` | **Justify** | Fix observed React Router v7 conditional-export dev SSR failure and deny new internal/source paths; verified a working dev advisor and 403/404 protections without dependency upgrades. |

## Large-hunk review

The threshold remains the upstream default of 80; it was not tuned to suppress warnings.

| File / hunk | Disposition | Reason |
| --- | --- | --- |
| `.agents/skills/dependency-doctor/SKILL.md` · `@@ -0,0 +1,151 @@` · 151 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `.agents/skills/dependency-doctor/scripts/dep_doctor.py` · `@@ -0,0 +1,485 @@` · 485 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `.agents/skills/scope-creep-detector/SKILL.md` · `@@ -0,0 +1,136 @@` · 136 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `.agents/skills/scope-creep-detector/references/scope-signals.md` · `@@ -0,0 +1,83 @@` · 83 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `.agents/skills/scope-creep-detector/scripts/scope_creep.py` · `@@ -0,0 +1,528 @@` · 528 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `AGENT-SYSTEM.md` · `@@ -0,0 +1,138 @@` · 138 lines | **Keep** | A dedicated feature handoff/validation document rather than unrelated application behavior. |
| `TEST-RESULTS.md` · `@@ -1,65 +1,88 @@` · 111 lines | **Keep** | A dedicated feature handoff/validation document rather than unrelated application behavior. |
| `server/agents/planner.mjs` · `@@ -0,0 +1,101 @@` · 101 lines | **Keep** | One bounded retrieval/constraint-selection/final-gate implementation; reviewed with price-change, insufficient-budget and 60 constraint-combination checks. |
| `src/pages/Advisor.tsx` · `@@ -0,0 +1,86 @@` · 86 lines | **Keep** | One integrated visitor page and lifecycle: brief → private resume → grounded collection → explicit bag/Studio handoff; exercised end to end. |
| `tests/agents.test.mjs` · `@@ -0,0 +1,110 @@` · 110 lines | **Keep** | A coherent feature-specific suite with 21 cases covering distinct invariants. Do not split tests away from their safety-critical implementation. |
| `vendor/awesome-llm-apps/LICENSE` · `@@ -0,0 +1,201 @@` · 201 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `vendor/awesome-llm-apps/references/agentic_rag_gpt5.py` · `@@ -0,0 +1,217 @@` · 217 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `vendor/awesome-llm-apps/references/design_agent_team.py` · `@@ -0,0 +1,264 @@` · 264 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |
| `vendor/awesome-llm-apps/references/trust_gated_agents.py` · `@@ -0,0 +1,651 @@` · 651 lines | **Keep** | Retain the complete, hash-verified upstream file/license and its notices. It is reviewed development/reference material, not an executable storefront service. |

## Preserved boundaries and follow-up grouping

- No new npm package, Python runtime package, remote skill installation, checkout contract replacement, payment activation or automatic product publishing. Original renderer/recipes, original archives and immutable sold-item behavior are preserved.
- Source pin, retained skill instructions and derivative attribution are a coherent part of using the requested repository. They should not be replaced with an unattributed link or bulk monorepo installation.
- The Docker/Vite/privacy/navigation edits are necessary integration and safety changes, not an independent redesign.
- Defer Postgres, a shared leased queue, separate model/render workers, object storage/CDN, authenticated cost controls, operator publishing, provider reconciliation and distributed load tests as a separate infrastructure project. Those are documented, not represented as deployed.
- All classified flags have been reviewed as Keep or Justify. No automatic split, revert, staging or commit operation was performed.

See `TEST-RESULTS.md` and `AGENT-SYSTEM.md` for actual validation and remaining limitations.

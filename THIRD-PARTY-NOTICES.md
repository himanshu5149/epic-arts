# Third-party notices — Epic Arts agent enhancement

## awesome-llm-apps

- Repository: https://github.com/Shubhamsaboo/awesome-llm-apps
- Pinned commit: `6c16b23f1bacd0fdf240bb5141ef45e59e82c306`
- License: **Apache License 2.0**, retained verbatim at `vendor/awesome-llm-apps/LICENSE`.
- Retrieved using a shallow public Git clone on October 24, 2026. No authenticated GitHub connector was used.
- Copyright and author notices in retained upstream files are unchanged. The dependency-doctor and scope-creep-detector skill metadata credits **Matt Van Horn**.

### Unmodified, retained material

1. `.agents/skills/dependency-doctor/`: upstream `agent_skills/dependency-doctor/` (skill instructions, stdlib-only Python script, and reference guide).
2. `.agents/skills/scope-creep-detector/`: upstream `agent_skills/scope-creep-detector/`.
3. `vendor/awesome-llm-apps/references/trust_gated_agents.py`: upstream `advanced_ai_agents/multi_agent_apps/trust_gated_agent_team/trust_gated_agents.py`.
4. `vendor/awesome-llm-apps/references/design_agent_team.py`: upstream `advanced_ai_agents/multi_agent_apps/agent_teams/multimodal_design_agent_team/design_agent_team.py`.
5. `vendor/awesome-llm-apps/references/agentic_rag_gpt5.py`: upstream `rag_tutorials/agentic_rag_gpt5/agentic_rag_gpt5.py`.

These Python application examples are **reference source, not executable storefront services**. Their Streamlit, Agno, model and vector-store dependencies are not installed. The offline dependency diagnosis and diff classifier are invoked manually for development QA, never from a public API. Source paths and hashes are pinned in `vendor/awesome-llm-apps/provenance.json`.

### Adaptations by Epic Arts

| Upstream pattern | Integrated adaptation |
| --- | --- |
| Separate design/UX/market specialist roles | Four domain roles: catalog curator, heritage guide, collection stylist, print companion. `shared/agents.mjs` and `skills/epic-*/SKILL.md`. |
| Trust registry and threshold-gated agent participation | Explicit per-role capability allowlists and schema validation in `server/agents/audit.mjs`, `planner.mjs`, and `provider.mjs`. We deliberately do **not** invent numerical trust scores or imply external identity verification. |
| SHA-256-linked agent activity entries and verification | Ported hash-linking/verification pattern in `server/agents/audit.mjs`, persisted transactionally in SQLite and scoped to each private run. Added run IDs, sequence checks, a stored head and authorization. This is not a signed, immutable or independently anchored audit system. |
| Search knowledge before answering | Reviewed local guide corpus with SQLite FTS5 retrieval, topic confidence/abstention, source links and dated research in `server/agents/knowledge.mjs` and `planner.mjs`. No arbitrary URL ingestion, vector service, or fabricated customer memory. |
| Model-backed agent tools | Optional bounded OpenAI chat tool-calling coordinator in `server/agents/provider.mjs`; tools can only read an eligible public candidate pool and reviewed guides. Server gates remain authoritative. |
| Dependency and scope hygiene skills | Actual offline runs against `package.json` and the feature diff, with reports retained under `tests/reports/`. No dependency upgrades or new CI policy were added by these skills. |

The deterministic planner, storefront UI, beam-budget solver, durable job lifecycle, idempotency, privacy controls, quotas and commerce/Studio handoff are Epic Arts-specific implementations. The no-key workflow is **rules + retrieval**, not four independent language models. Optional connected-model behavior is distinguished in the UI and requires per-brief consent.

The Apache-2.0 license applies to retained upstream material and derivative portions. It does not grant rights to the Epic Arts artwork, branding, unrelated packages or other traditions. Existing font licenses and npm package licenses remain applicable. The production container retains this notice and the upstream Apache license.

## public-apis/public-apis (MIT)

- Source: https://github.com/public-apis/public-apis, commit `82e763edc4919e2cb13ce8c8c57a33bc73ff4caf` (cloned 2026-10-26).
- Role: **discovery directory only**. Its “Art & Design” table led us to the Art Institute of Chicago public API used by `/inspiration`. No code or dataset was copied; the MIT license text is preserved at `vendor/public-apis/LICENSE`, details in `vendor/public-apis/provenance.json`.

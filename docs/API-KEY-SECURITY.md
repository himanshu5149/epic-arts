# API Key Security — Epic Arts

_Last updated: 2026-10-27_

## Where secrets live (and where they never do)

| Rule | Implementation |
|---|---|
| Server-only storage | Keys live in `.env`, loaded by `dotenv/config` at boot. File permissions `600` (owner read/write only). |
| Never committed | `.env` is in `.gitignore`. Rotate immediately if a key ever touches git history or a chat/screenshot. |
| Never serialized to browsers | `/api/config` reports only booleans (`agentLlmConnected`, `aiEnabled`). Verified by a live leak sweep over all public endpoints (2026-10-27: CLEAN). Tests also assert no secret string appears in serialized agent runs. |
| Outbound only in headers | The key appears solely in `Authorization: Bearer …` headers to `api.openai.com` from `server/studio.mjs` and `server/agents/provider.mjs`. No provider SDK, no remote skill loading. |

## Spend protection (defense in depth)

1. **App-side quotas** — `AGENT_DAILY_LLM_LIMIT=5` and `AI_DAILY_LIMIT` reservations are installation-wide per UTC day, plus per-session caps (6 LLM briefs/session/day, 60 total). Every attempt — including failures — counts against the reservation.
2. **Feature defaults** — `AI_GENERATION_ENABLED=false` because each image costs real money; the advisor model is opt-in per brief by the visitor, not automatic.
3. **Timeouts & caps** — provider calls are bounded (15 s timeout, ≤3 model calls, ≤4 tool calls per attempt, ≤2 attempts).
4. **Provider-side hard limits** — always configure a billing budget/hard cap at platform.openai.com (Settings → Billing). App quotas are not a financial guarantee: provider calls may incur cost even when the app falls back.

## Failure behavior (honest degradation)

If the provider is unreachable, over quota, or its suggestion fails a server-side guard, the advisor completes with `no-key-fallback` mode and returns real, verified catalog selections — it never fabricates results or surfaces raw provider errors. Observed live 2026-10-27: valid key + `credit_balance_exhausted` → graceful fallback.

## Key lifecycle checklist

- [ ] **Rotate now**: the key used during setup was pasted into a chat → treat as exposed. Revoke at platform.openai.com → API keys, create a new `sk-proj-…` key, update **only** the `OPENAI_API_KEY=` line in `.env`, restart the server. No code change needed.
- [ ] Set a **hard billing limit** and email alerts in the OpenAI dashboard.
- [ ] Restrict the project to the models in use (`gpt-4.1-mini`; `gpt-image-1` only if image AI is deliberately enabled).
- [ ] Review **Usage** weekly; unused keys should be disabled, not left dormant.
- [ ] Never paste keys into chats, tickets, screenshots, or frontend code.

## Verification commands

```bash
# key reaches the platform and is accepted (free metadata call):
curl -s -o /dev/null -w "%{http_code}\n" https://api.openai.com/v1/models -H "Authorization: Bearer $KEY"
# leak sweep expectation: no endpoint below may contain 'sk-proj':
# /  /api/config  /api/agents/config  /healthz  /shop  /checkout  /sitemap.xml
```

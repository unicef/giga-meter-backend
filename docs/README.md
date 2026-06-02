# Documentation index — giga-meter-backend

This folder is the **single source of truth** for the **current** state of this API.

| Doc | Purpose |
| --- | --- |
| [CURRENT_STATE.md](./CURRENT_STATE.md) | What exists now — start here |
| [CHANGELOG.md](./CHANGELOG.md) | Append-only log (one line per merged PR) |
| [adr/](./adr/) | Architecture Decision Records |

## Conventions

- Main docs are **always-current**: edit in place; do not embed PR narratives or dated “previously we…” sections.
- **`CURRENT_STATE.md` is a link-first index, not a narrative:** keep bullets concise and link to ADRs/`CHANGELOG.md`/`/prs/` for detail. See its [How to keep this current](./CURRENT_STATE.md#how-to-keep-this-current) rules (link-first, size cap, 14-day TTL, PR gate).
- Chronology lives in `CHANGELOG.md` and `/prs/` (merged pull requests).
- Agents: see [.agent/CONTEXT_RULES.md](../.agent/CONTEXT_RULES.md).

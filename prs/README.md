# Pull request history

This folder is an **append-only archive** of merged (or ready-to-merge) pull requests for **giga-meter-backend**.

It complements:

- `/docs/` — **current** system description (edit in place)
- `/docs/CHANGELOG.md` — one line per merged PR

## When to add a record

Create a file **when the PR is merged** (or when explicitly asked before merge for review prep).

## File naming

```
{pr-number}-{kebab-slug}.md
```

Examples:

- `321-cloudflare-measurements-protocol.md`
- `319-sync-develop-admin-meter-landing-v2.md`

Use the GitHub PR number and a short slug from the PR title.

## How to write a record

1. Copy [`_TEMPLATE.md`](./_TEMPLATE.md).
2. Fill **Context**, **Scope**, **Technical decisions**, and **Validation**.
3. Link `/docs/adr/` entries when relevant.
4. Reference **related PRs** when work depends on or complements another change (this repo or sibling repos such as Daily Check app).
5. Do **not** paste full OpenAPI specs — add or update contracts under `/docs/` when needed.

## Rules for agents

See [.agent/CONTEXT_RULES.md](../.agent/CONTEXT_RULES.md) — **PR history is mandatory on merge.**

- Add one file per merged PR; do not edit past PR files except trivial typo fixes.
- Do not use `/prs/` alone to infer current behavior; read `/docs/CURRENT_STATE.md`.

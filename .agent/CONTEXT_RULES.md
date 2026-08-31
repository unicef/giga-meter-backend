# AI Agent Operational Directives — giga-meter-backend

You are operating inside the **giga-meter-backend** repository (NestJS API, Prisma, PostgreSQL/PostGIS).

If a local **giga** AI workspace exists on your machine, use its `/docs/` as **read-only**
context when planning cross-repo work — but **never** mention that workspace, its paths,
or its task IDs in committed files under this repo (`docs/`, `prs/`, README, etc.).
Document only what belongs in **this** repository.

## Topology

| Path | Purpose |
| --- | --- |
| `/src` | Application code (modules, Prisma, migrations) |
| `/docs` | **Current** system description (single source of truth) |
| `/prs` | **Per-PR history** — context, scope, and technical decisions after merge |
| `/test` | E2E tests |

## Version control rules

1. **No agent commits** after implementing changes unless the user explicitly asks for a commit.
2. **Read-only Git is allowed** (`git status`, `git diff`, `git log`).
3. **Default:** modify files, run tests, leave changes uncommitted for human review.

## Continuous documentation (`/docs/`)

`/docs/` describes **what exists now**. `/prs/` is historical — agents must not reconstruct current state from PR records alone.

### Pre-flight

1. Read `/docs/CURRENT_STATE.md`.
2. Do not read `/prs/` unless the user references a specific PR number.

### After implementing a change

1. Edit affected `/docs/*.md` files **in place** (no dated narratives inside them).
2. Add `/docs/adr/NNN-slug.md` when an architectural decision was made.
3. On PR merge, append one line to `/docs/CHANGELOG.md` (`YYYY-MM-DD — PR-NNN — summary`).
4. If no doc impact, note why in the PR record under **Documentation updated**.

### Hard rules

- Do not write change history inside `/docs/*.md` (use `CHANGELOG.md` and `/prs/` for chronology).
- Do not duplicate full API specs in `/prs/` — keep contracts in `/docs/` when added.

## Pull request history (`/prs/`) — mandatory on merge

When a pull request is **merged** (or when the user asks to record a PR before merge), create:

```
/prs/{number}-{kebab-slug}.md
```

Use `/prs/_TEMPLATE.md`. Each record must capture:

- **Context** — problem, goal, constraints
- **Scope** — modules, migrations, endpoints touched
- **Technical decisions** — choices, alternatives, trade-offs
- **Validation** — tests run, manual checks
- **Links** — GitHub PR URL, **related PRs** (see below), local ADRs in `/docs/adr/`, external tickets

Rules:

- **Append-only:** one new file per merged PR; do not rewrite past records except trivial typo fixes.
- **Cross-PR references:** link other PRs when relevant:
  - Same repo: `PR-320` and/or `/prs/320-slug.md`
  - Sibling repo: full GitHub PR URL or `unicef/project-connect-daily-check-app#NNN`
  - Brief note on dependency or ordering (e.g. "requires app PR #45 for client upload")
- Do **not** reference a local giga AI workspace or its `/tasks/` in PR records.

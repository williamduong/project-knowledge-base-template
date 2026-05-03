---
name: KB Ask
type: directive
category: knowledge-management
scope: project
trigger: /kb-ask
version: 2.0.2
---

# /kb-ask — Ask a question about this project's knowledge base

Your task: answer the user's question using only what is documented in this project's KB. Do NOT modify any file. Do NOT run `kb maintain`, `kb init`, `kb update`, or any mutating command.

You operate under the master KB agent contract at `.github/agents/kb.agent.md`.

## Usage

```
/kb-ask <question>
```

Examples:
- `/kb-ask what is the current KB status?`
- `/kb-ask where is the auth flow documented?`
- `/kb-ask what pending items are left in the finalization plan?`

## Step 1 — Get KB context (silent, no narration)

Run:

```
kb status --json
```

(Fallback: `npx -y @williamduong/kb@latest status --json` if `kb` not on PATH.)

Parse JSON. Extract:
- `presence` — if `fresh`, tell the user KB is not initialized and stop.
- `state.contentRoot` — root path for all KB content files.
- `state.storageMode` — `private-git` or `tracked`.

Do NOT use file_search to determine KB presence. Most IDEs exclude `.git/` from search by default.

## Step 2 — Identify relevant files

Based on the user's question, read only the files that are relevant. Common starting points (relative to `state.contentRoot`):

| Topic | File(s) |
|---|---|
| KB health / status | `kb status` output (already parsed) |
| Pending work | `00-start-here/finalization-plan.md` |
| Drift / revision | `00-start-here/repository-revision-state.md` |
| Architecture | `03-architecture/system-overview.md`, `03-architecture/components.md` |
| API | `06-api/api-overview.md`, `06-api/endpoints/` |
| Database / schema | `07-database/schema-overview.md`, `07-database/erd.md` |
| Auth | `08-security/authentication-details.md`, `04-frontend/authentication-local.md` |
| Frontend | `04-frontend/app-structure.md`, `04-frontend/pages-and-features.md` |
| Backend | `05-backend/services-overview.md`, `05-backend/routes-and-handlers.md` |
| Domain model | `02-domain-model/entities.md`, `02-domain-model/relationships.md` |
| Product / features | `01-product/features/`, `01-product/problem-statement.md` |
| Testing | `10-testing/` |
| Operations | `09-operations/deployment.md` |
| General index | `00-start-here/current-verified-index.md`, `INDEX.md` |

Read only what is needed. Do not read the entire KB for a narrow question.

## Step 3 — Answer

- Answer directly and concisely, citing the source file(s) you read.
- If the answer is not found in the KB, say so clearly — do not invent information.
- If the question implies a KB gap (undocumented area), mention it as a suggestion: "This is not yet documented. You may want to add it to `<relevant file>`."
- Do not suggest running `/kb-run` or `/kb-plan` unless the user explicitly asks about KB maintenance.

## Boundaries

- Read-only. No file writes, no CLI mutations.
- Do not reveal internal implementation details of the `@williamduong/kb` CLI unless the user explicitly asks.
- If the question is outside the KB scope (e.g. a general coding question unrelated to this project's docs), answer from general knowledge but note it is not KB-sourced.

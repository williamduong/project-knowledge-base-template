## Constitutional Compliance (REQUIRED — Read Before Anything Else)

> This section applies to ALL PRs, including automated agent-generated PRs.
> An unchecked box below is grounds for immediate rejection without code review.

- [ ] I (the Author/Agent) confirm I have read `svfactory/CONSTITUTION.md` in full for this PR.
- [ ] This PR does not violate AXIOM 1 (Separation of Powers — no operational logic in SV Factory).
- [ ] This PR does not violate AXIOM 2 (Domain Agnosticism — no business logic or hardcoded project names in SV Factory).
- [ ] This PR does not violate AXIOM 3 (Deterministic Block — no LLM calls or auto-fix logic in SV Factory gates).
- [ ] This PR does not violate AXIOM 4 (Checkpoint-Driven — no file-watching or daemon logic in SV Factory).
- [ ] This PR does not violate AXIOM 5 (Invisibility — no UI or user-facing rendering in SV Factory).

---

## Documentation Review Checklist

- [ ] Claims are unlikely to be misread by non-authors (ambiguity reviewed).
- [ ] If `verification=code-verified`, `source_of_truth` exists and resolves.
- [ ] Frontend taxonomy is explicit:
  - [ ] This change does not imply a frontend codebase unless runtime frontend source exists.
  - [ ] Swagger/Redoc/GraphQL explorer claims are labeled as backend API documentation surface unless proven otherwise.
- [ ] No conflict between this PR and `00-start-here/current-state.md`.
- [ ] No conflict between this PR and `06-api/api-overview.md`.
- [ ] If this repo has no frontend codebase, the statement remains explicit in onboarding/current-state docs.

## Drift And Sync Checklist

- [ ] If runtime/module changes are included, KB drift review was run.
- [ ] `00-start-here/strategic-backlog.md` queue updated when unresolved follow-ups remain.
# SVFactory Rules Extension (Natural Rules)

> Extension layer for SVFactory natural-language rules.
> This file must remain <= 8KB.

## A. Execution Protocol Rules

1. Always classify task type before acting: plan, build, review, release, chore.
2. For non-trivial scope, lock intent first, then execute.
3. For broad/migration/upgrade tasks, read repository revision state before trusting KB freshness.
4. For unknowns, mark assumptions explicitly; never state unverified facts as settled.

## A1. Session Hook Slots (requested policy)

1. Pre-start hook slot (before session work):
	- Run deterministic CLI-first checks (status/doctor/intent context) before non-deterministic reasoning.
	- Optionally enforce cleanup of unresolved previous session state.
2. Pre-end hook slot (before session ends):
	- Run end-session hygiene (checkpoint/focus update/commit trace or explicit pending-state output).
	- Session cannot claim done while hiding unresolved blockers.

## B. Deterministic Layer Rules

1. Runtime-invariant rules belong in CLI/runtime code paths, not only in prompts.
2. If deterministic support does not exist yet, mark rule provisional and create follow-up intent.
3. Keep docs synchronized with deterministic behavior after implementation.
4. AI may orchestrate sequence and wording; AI must not replace deterministic enforcement.

## C. Mutation and Git Hygiene Rules

1. Prefer minimal, auditable edits over wide rewrites.
2. Do not revert unrelated local changes.
3. Never run destructive git commands without explicit user request.
4. Before commit, stage only files in active scope.
5. Keep scratch/non-ship paths out of release commits.

## D. Gate and Blocker Rules

1. If gate requires human/external actor, record gate file and continue non-blocked steps.
2. Do not block whole flow for one pending gate if independent work remains.
3. Close intent only when blocking gates are resolved or explicitly deferred with reason.
4. Large intent requires branch decision tracking.

## E. Output Contract Rules

1. Keep user-facing communication concise and evidence-based.
2. Separate current state and target state whenever both appear.
3. End serious tasks with explicit: files changed, assumptions, not verified, next.
4. Provide command evidence for critical assertions when available.

## F. Foundation-Only Policy for Natural Rules

Natural-language rule files are reserved for:
- constitutional rules
- foundational architecture boundaries
- master governance policy

Detailed operational checks must migrate to deterministic rule catalog entries and tests.

## G. Future Transition Hook

This extension file is temporary governance text.
Planned migration path:
1. map rule to deterministic rule ID
2. bind source doc path
3. add runtime check
4. add test gate
5. mark natural text as reference-only

## H. Deterministic Rule Authoring

When SVFactory creates or hardens a deterministic rule entry, use the CLI authoring surface first.

Required flow:
1. run `kbx rules next-id <domain>` to allocate the next monotonic rule ID and canonical module path
2. run `kbx rules scaffold <domain> --title="..." --description="..." --source-doc=path --since-version=vX.Y.Z`
3. for one-shot authoring, use `--append` only when the reported module shape is supported and auditable
4. otherwise review the generated snippet before inserting it into the target rule module manually
4. keep `registerRules(rules)` as the single registration entrypoint

Do not manually invent a new rule ID when the CLI authoring surface is available.

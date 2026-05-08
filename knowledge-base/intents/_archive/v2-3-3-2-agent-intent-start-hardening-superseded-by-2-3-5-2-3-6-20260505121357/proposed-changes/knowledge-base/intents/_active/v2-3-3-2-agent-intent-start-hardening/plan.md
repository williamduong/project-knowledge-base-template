---
intent_id: v2-3-3-2-agent-intent-start-hardening
type: intent-plan
---

# Plan

## Goal

Close startup orchestration gaps that caused KB Agent behavior drift during upgrade tests.

Target outcomes:
- Every new chat session starts with explicit intent selection.
- Exactly one intent is locked for the whole session unless user explicitly requests a switch.
- User can choose from active intents or request new intent creation.
- SV Factory and KB Agent docs stay aligned on the same startup contract.
- External-source context collection is documented as non-destructive and evidence-first.

## Files Touched

- `kb-root/agent.md` (modified): update bootstrap ending to require active-intent list + load/create-new question.
- `kb-root/process.md` (modified): Workflow 7 adds mandatory startup intent chooser step.
- `template/.github/agents/kbx.agent.template.md` (modified): MANDATORY Preflight includes session-start intent chooser.
- `template/12-ai-skills/agent-operating-manual.md` (modified): Minimal Agent Workflow formalizes startup intent chooser.
- `knowledge-base/intents/_active/v2-3-3-2-agent-intent-start-hardening/intent.md` (modified): scope, signals, decision summary.
- `knowledge-base/intents/_active/v2-3-3-2-agent-intent-start-hardening/plan.md` (modified): executable plan.
- `knowledge-base/intents/_active/v2-3-3-2-agent-intent-start-hardening/impact.md` (modified): risk and downstream impact.

## Acceptance Criteria

1. SV Factory bootstrap explicitly requires listing active intents and asking user to pick resume/create-new before taking task.
2. KB Agent preflight explicitly requires session-start chooser with two paths: load existing intent or create new intent.
3. Both agents enforce session intent lock: one selected intent per session, switch only with explicit user confirmation.
4. Agent Operating Manual reflects the same rule so behavior is discoverable from governance docs.
5. Intent workspace documents the three validated issues and fix rationale.
6. Guidance for onboarding external source context (vipepix-generation) is delivered as a non-destructive playbook.


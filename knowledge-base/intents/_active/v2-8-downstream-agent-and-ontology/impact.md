---
intent_id: v2-8-downstream-agent-and-ontology
type: intent-impact
---

# Impact: v2.8 Downstream Agent + Ontology Hardening + Backend Abstraction

## Summary

Three parallel workstreams addressing post-v2.7 priorities:
- **WS1 (KB Agent)**: Better prompts, transparent reasoning, self-diagnosis → improved downstream user experience
- **WS2 (Ontology)**: Type system + validation → better data quality and extensibility
- **WS3 (Backend)**: Protocol design (planning-only) → architecture foundation for enterprise deployments

**Impact class**: User-facing (WS1, WS2) + Planning (WS3)

## Signals

### Positive Signals

- **WS1**: Downstream users report better KB Agent reliability and clearer debugging
- **WS1**: `[AI DECISION]` logs help users understand agent reasoning
- **WS1**: Self-diagnosis catches KB state issues before they block work
- **WS2**: Ontology validation catches schema drift early (deterministic like rules engine)
- **WS2**: Ontology evolution policy reduces resistance to schema updates
- **WS3**: Backend protocol design attracts enterprise interest for DB integration

### Risk Signals

- **WS1**: Too many logs overwhelm users → mitigation: minimal logging by default, expert mode opt-in
- **WS2**: Type system too strict, breaks existing ontologies → mitigation: gradual enforcement, migration guide
- **WS3**: Protocol misses critical use cases → mitigation: call it v1.0, prototype before v3.0 commit

## Scope

### What's Included

- KB Agent prompt updates (all 3 prompts: plan/run/ask)
- Ontology type system definition (JSON schema)
- Ontology validation rules (KBX-O001..N)
- Decision logs in downstream agent
- Self-diagnosis capability
- Backend abstraction protocol design (doc + decision record)

### What's Out of Scope

- Actual backend implementations (deferred to v2.8.x/v2.9)
- Ontology GraphDB migration (future research, not in v2.8)
- AI model changes or fine-tuning (agent uses v2.8 prompts only)

## Timeline

| Phase | Duration | Deliverables |
|---|---|---|
| Phase 0 (Planning) | ~1 session | This document, roadmap, design decisions |
| Phase 1 (WS1) | ~2-3 sessions | Agent prompts v2.8, decision logs, self-diagnosis |
| Phase 2 (WS2) | ~2-3 sessions | Ontology type system, validation rules, evolution policy |
| Phase 3 (WS3) | ~1 session | Protocol design doc, decision record (code deferred) |

**Post-v2.8**: v2.8.x patches + v2.9 backend implementation + v3.0 major release

## Dependencies

### Internal

- v2.7 rules engine (already complete)
- v2.6 ontology structure (already complete)
- v2.8 Phase 0 design decisions (this intent)

### External

- None (no new npm dependencies)

### Parallel Paths

- WS1, WS2, WS3 can execute in parallel (no blocking dependencies)
- Recommended sequence: WS1 first (user-visible immediately), WS2 second, WS3 last (planning-only)

## Testing Strategy

| Workstream | Test Type | Coverage |
|---|---|---|
| WS1 | Downstream agent smoke test | `kbx init` + `@kbx` session in fresh KB |
| WS1 | Decision log parsing | Verify `[AI DECISION]` logs are valid and helpful |
| WS1 | Self-diagnosis | Unit tests for KB state → suggestion mapping |
| WS2 | Ontology validation | 20+ tests covering all KBX-O rules |
| WS2 | Contract evolution | Test v1.0 contract on existing ontologies |
| WS3 | N/A (planning-only) | Decision record review |

### Acceptance Gate

1. All existing 710 unit tests pass (regression)
2. 20+ new ontology validation tests pass
3. Downstream KB Agent can read v2.7 rules and output decision logs
4. Backend abstraction protocol documented

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| WS1 decision logs are too verbose | Medium | High (noise) | Start minimal, iterate on feedback |
| WS2 type system breaks existing ontologies | Low | High (breaking) | Gradual enforcement, migration guide, backwards compat flag |
| WS3 protocol design misses use cases | Medium | Medium (rework) | v1.0 label, prototype with customer before major release |
| Schedule slip on WS2 validation rules | Low | Low (deferrable) | Can defer KBX-O rules to v2.8.1 if needed |

## Continuity

### For Downstream Users

- v2.8 is additive: existing KBs continue to work without changes
- New features are opt-in (decision logs, ontology validation, backend protocol is not forced)
- No migration required from v2.7 to v2.8

### For Maintainers

- WS1 prompts must be kept in sync with agent-operating-manual.md
- WS2 ontology rules must follow the same deterministic pattern as governance rules
- WS3 backend protocol document becomes reference for future implementations

### For Post-v2.8 Phases

- v2.8.x: Bug fixes, iterate on feedback, no major feature additions
- v2.9: Backend abstraction Phase 1 implementation (filesystem only, reference)
- v3.0: Multiple backend options, major release readiness

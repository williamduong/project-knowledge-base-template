---
intent_id: v2-9-v2-9-natural-rules-foundation-file-architecture
type: intent-plan
---

# Plan

## Goal

Define post-refactor success criteria that are executable and testable across governance and runtime.

Execution slices:
1. Break v2.9 graph work into lane-specific child intents with explicit dependency chain.
2. Add lane-aware graph-ingest export command defaults for rules, intents, and source.
3. Validate behavior through targeted command tests.
4. Publish checkpoint audit evidence from intent checkpoints and commit history.

## Files Touched

- knowledge-base/intents/_backlog/v2-9-1-rules-graph-lane-foundation.md (newly drafted, then enriched)
- knowledge-base/intents/_backlog/v2-9-2-intent-realtime-graph-lane.md (newly drafted, then enriched)
- knowledge-base/intents/_backlog/v2-9-3-source-gitnexus-graph-lane.md (newly drafted, then enriched)
- src/commands/graph.js (modified for lane export and default output paths)
- test/commands/graph-lane-export.test.js (new targeted coverage)
- intents/_active/v2-9-v2-9-natural-rules-foundation-file-architecture/{intent.md,plan.md,impact.md} (activation + success criteria)

## Acceptance Criteria

- `kb graph export --lane=rules --json` writes `knowledge-base/.kb/graph-ingest/rules.json` by default.
- `kb graph export --lane=intents --json` writes `knowledge-base/.kb/graph-ingest/intents.json` by default.
- `kb graph export --lane=source --json` writes `knowledge-base/.kb/graph-ingest/source.json` by default.
- Three lane child intents exist in backlog and state dependency order explicitly.
- New lane-export command tests pass.

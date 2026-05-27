# DNA Temporary Quarantine

This folder is the holding zone for legacy or mixed-boundary assets that:

- are too KBX-specific to remain in the outer SVFactory layer
- are not yet clean enough to move directly into `dna/kbx`

## Purpose

Use `dna/tmp` only when a module is:

- mixed between SVFactory core and KBX worldview
- distribution-boundary unresolved
- runtime/UI/CLI semantics are still collapsed together

## Required metadata for every moved asset

Record next to the moved file or in an adjacent note:

- original path
- likely final target:
  - `SVFactory core`
  - `dna/kbx`
- why final placement is blocked
- extraction steps needed

## Non-goal

`dna/tmp` must not become:

- a second monolith
- a hidden place to keep avoiding boundary decisions

Every asset here should be treated as temporary quarantine.


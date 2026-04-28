# Project Knowledge Base Template

This repository is a multi-project knowledge base template for documenting software systems, delivery decisions, architecture, operations, security, testing, and agent workflows.

It is designed for teams that want a consistent documentation baseline across different project archetypes such as web apps, API platforms, data and AI systems, internal enterprise tools, and extension or integration products.

## Current Template Version

- Template version: `v1.1.0`
- License: GNU AGPL v3 with separate commercial licensing available
- Baseline state file for downstream projects: [00-start-here/repository-revision-state.md](00-start-here/repository-revision-state.md)

Downstream project KBs should stamp both the adopted template version and the brand-scoped source baseline commit they were verified against.

## What This Repository Contains

- Orientation and onboarding documents in `00-start-here/`
- Product, domain, architecture, frontend, backend, API, database, security, operations, and testing knowledge areas
- AI-agent guidance in `12-ai-skills/`
- Reusable document stubs in `14-templates/`
- Governance rules for metadata, verification, review cadence, and template lifecycle in `15-governance/`

## Quick Start

1. Read [INDEX.md](INDEX.md) for the full template map.
2. Choose the project archetype in [00-start-here/project-scope-matrix.md](00-start-here/project-scope-matrix.md).
3. Read [00-start-here/how-to-use-this-kb.md](00-start-here/how-to-use-this-kb.md) for working mode and default decisions.
4. Start or refine the maintenance queue in [00-start-here/finalization-plan.md](00-start-here/finalization-plan.md).
5. Use the documents under `14-templates/` and fill only the modules that are relevant to the project.

## Recommended Reading Paths

- Engineers: `00-start-here` -> `03-architecture` -> `05-backend` or `04-frontend` -> `06-api` -> `07-database`
- Product and BA: `00-start-here` -> `01-product` -> `02-domain-model` -> `03-architecture`
- QA: `00-start-here` -> `10-testing` -> `08-security` -> `09-operations`
- AI agents: `00-start-here` -> `15-governance` -> task-specific folders

## Working With AI Agents

If you use GitHub Copilot or another coding agent in this repository:

- Start with [12-ai-skills/agent-operating-manual.md](12-ai-skills/agent-operating-manual.md)
- Check [00-start-here/repository-revision-state.md](00-start-here/repository-revision-state.md) against the current git revision before broad maintenance or upgrade work
- Use [12-ai-skills/prompting-guide.md](12-ai-skills/prompting-guide.md) to choose prompt shape
- Keep document metadata valid per [15-governance/metadata-schema.md](15-governance/metadata-schema.md)
- Respect verification and time-state rules before asserting facts

## Repository Rules

- Keep placeholders explicit using values such as `TODO`, `TBC`, and `UNKNOWN`
- Do not remove unused template areas prematurely; keep them as placeholders until governance says otherwise
- Separate current state from target state when both need to exist in one document
- Update links, indexes, and metadata when files are added, moved, or renamed

## Key Entry Points

- [INDEX.md](INDEX.md)
- [00-start-here/how-to-use-this-kb.md](00-start-here/how-to-use-this-kb.md)
- [00-start-here/intent-index.md](00-start-here/intent-index.md)
- [00-start-here/repository-revision-state.md](00-start-here/repository-revision-state.md)
- [12-ai-skills/prompting-guide.md](12-ai-skills/prompting-guide.md)
- [12-ai-skills/agent-operating-manual.md](12-ai-skills/agent-operating-manual.md)
- [15-governance/metadata-schema.md](15-governance/metadata-schema.md)
- [TEMPLATE_CHANGELOG.md](TEMPLATE_CHANGELOG.md)

## License

This project is dual-licensed.

- Open-source use is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
- Commercial use without the open-source obligations of the AGPL v3 requires a separate commercial license from the copyright holder.

Copyright (c) 2026 Dương Tấn Nghĩa.

**Commercial Licensing:**
If you wish to use this software for commercial purposes without the open-source requirements of the AGPL v3, please contact **duongtannghia@gmail.com** to acquire a commercial license.

## Author

**William Duong (Dương Tấn Nghĩa)**

- **GitHub:** [github.com/williamduong](https://github.com/williamduong)
- **Email:** duongtannghia@gmail.com
- **Blog:** [William Research Logs](https://williamresearch.com/)
# Project Knowledge Base Template

This repository is a multi-project knowledge base template for documenting software systems, delivery decisions, architecture, operations, security, testing, and agent workflows.

It is designed for teams that want a consistent documentation baseline across different project archetypes such as web apps, API platforms, data and AI systems, internal enterprise tools, and extension or integration products.

## Current Template Version

- Template version: `v1.1.0`
- License: GNU AGPL v3 with separate commercial licensing available
- Baseline state file for downstream projects: [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md)

## CLI Preview

This repository now includes a preview CLI scaffold (`kb`) for local initialization and maintenance workflow bootstrapping.

Run directly from this repository:

```bash
node ./bin/kb.js help
```

Global install mode (after publish):

```bash
npm install -g @williamduong/kb
kb help
```

One-off usage with npx:

```bash
npx @williamduong/kb help
```

Currently implemented commands:

- `help`
- `init --mode private-git|tracked`
- `show [--backup-existing]` (private-git mode)
- `hide [--restore-backup]` (private-git mode)
- `test`
- `sync [--accept-baseline]`
- `update [--accept-baseline]`
- `doctor [--json] [--strict]`

Pre-publish artifact simulation:

```bash
npm run doctor:json
npm run pack:smoke
npm run release:dry
```

Generate the template release note page from git history:

```bash
npm run release:notes -- v1.1.1 Patch Low dry-run
```

Release notes are `manual-only`: they do not auto-update on every commit push. Remove `dry-run` when you explicitly want to prepend a new entry into `template/TEMPLATE_CHANGELOG.md` using commits since the last generated release anchor.

Direct Node variant with named flags:

```bash
node ./scripts/generate-template-changelog.js --template-version v1.1.1 --change-type Patch --impact Low --dry-run
```

Downstream project KBs should stamp both the adopted template version and the brand-scoped source baseline commit they were verified against.

## What This Repository Contains

- Orientation and onboarding documents in `template/00-start-here/`
- Product, domain, architecture, frontend, backend, API, database, security, operations, and testing knowledge areas
- AI-agent guidance in `template/12-ai-skills/`
- Reusable document stubs in `template/14-templates/`
- Governance rules for metadata, verification, review cadence, and template lifecycle in `template/15-governance/`

## Public Site (Landing + Docs)

This repository includes a standalone website bundle in `site/` for GitHub Pages publishing:

- Landing page: `site/landing/`
- Docs portal: `site/docs/`
- Entrypoint redirect: `site/index.html`

The docs portal renders markdown directly from the `main` branch via `raw.githubusercontent.com`, so docs stay up to date without duplicating template files.

### Enable GitHub Pages

1. Push the repository to GitHub (default branch `main`).
2. Open **Settings -> Pages**.
3. Under **Build and deployment**, choose **Source: GitHub Actions**.
4. Keep workflow file `.github/workflows/pages.yml` enabled.

After deployment, the site will be available at:

- `https://<owner>.github.io/<repo>/landing/`
- `https://<owner>.github.io/<repo>/docs/`

## Quick Start

1. Read [template/INDEX.md](template/INDEX.md) for the full template map.
2. Choose the project archetype in [template/00-start-here/project-scope-matrix.md](template/00-start-here/project-scope-matrix.md).
3. Read [template/00-start-here/how-to-use-this-kb.md](template/00-start-here/how-to-use-this-kb.md) for working mode and default decisions.
4. Start or refine the maintenance queue in [template/00-start-here/finalization-plan.md](template/00-start-here/finalization-plan.md).
5. Use the documents under `template/14-templates/` and fill only the modules that are relevant to the project.

## Recommended Reading Paths

- Engineers: `template/00-start-here` -> `template/03-architecture` -> `template/05-backend` or `template/04-frontend` -> `template/06-api` -> `template/07-database`
- Product and BA: `template/00-start-here` -> `template/01-product` -> `template/02-domain-model` -> `template/03-architecture`
- QA: `template/00-start-here` -> `template/10-testing` -> `template/08-security` -> `template/09-operations`
- AI agents: `template/00-start-here` -> `template/15-governance` -> task-specific folders

## Working With AI Agents

If you use GitHub Copilot or another coding agent in this repository:

- Start with [template/12-ai-skills/agent-operating-manual.md](template/12-ai-skills/agent-operating-manual.md)
- Use [template/12-ai-skills/ai-ide-compatibility-matrix.md](template/12-ai-skills/ai-ide-compatibility-matrix.md) to keep the same KB workflow across common AI-enabled IDEs
- Check [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md) against the current git revision before broad maintenance or upgrade work
- Use [template/12-ai-skills/prompting-guide.md](template/12-ai-skills/prompting-guide.md) to choose prompt shape
- Keep document metadata valid per [template/15-governance/metadata-schema.md](template/15-governance/metadata-schema.md)
- Respect verification and time-state rules before asserting facts

## Repository Rules

- Keep placeholders explicit using values such as `TODO`, `TBC`, and `UNKNOWN`
- Do not remove unused template areas prematurely; keep them as placeholders until governance says otherwise
- Separate current state from target state when both need to exist in one document
- Update links, indexes, and metadata when files are added, moved, or renamed

## Key Entry Points

- [template/INDEX.md](template/INDEX.md)
- [template/00-start-here/how-to-use-this-kb.md](template/00-start-here/how-to-use-this-kb.md)
- [template/00-start-here/terminology-guard.md](template/00-start-here/terminology-guard.md)
- [template/00-start-here/what-this-repo-is-not.md](template/00-start-here/what-this-repo-is-not.md)
- [template/00-start-here/intent-index.md](template/00-start-here/intent-index.md)
- [template/00-start-here/repository-revision-state.md](template/00-start-here/repository-revision-state.md)
- [template/12-ai-skills/prompting-guide.md](template/12-ai-skills/prompting-guide.md)
- [template/12-ai-skills/agent-operating-manual.md](template/12-ai-skills/agent-operating-manual.md)
- [template/12-ai-skills/ai-ide-compatibility-matrix.md](template/12-ai-skills/ai-ide-compatibility-matrix.md)
- [template/15-governance/metadata-schema.md](template/15-governance/metadata-schema.md)
- [template/TEMPLATE_CHANGELOG.md](template/TEMPLATE_CHANGELOG.md)

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
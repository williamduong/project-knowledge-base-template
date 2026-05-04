# Release Runbook End-to-End (@williamduong/kb)

> Last updated: v2.2.2 — Added MANDATORY RULES section to prevent version/tag confusion.

---

## MANDATORY RULES (read before every release)

These rules are non-negotiable. Violating any one of them will produce orphaned tags, broken version gates, or publish failures.

### RULE 1 — Never use `npm version` bare

```bash
# FORBIDDEN — auto-creates a git commit + tag BEFORE publish succeeds
npm version patch
npm version minor
npm version major
```

Bare `npm version` will:
1. Bump `package.json`
2. Create a git commit
3. Create a git tag **immediately**
4. Then run `prepublishOnly` — which will fail if template files are out of sync

Result: an orphaned git tag with no corresponding npm publish.

**Do this instead (ALWAYS):**

```bash
# Step 1 — bump only in package.json, no commit, no tag
npm version patch --no-git-tag-version
# or edit package.json version field manually

# Step 2 — sync version stamp to all template files
npm run version:sync

# Step 3 — verify all gates pass
npm run release:dry

# Step 4 — commit
git add -A
git commit -m "release: X.Y.Z"

# Step 5 — publish FIRST
npm publish --access public

# Step 6 — ONLY after publish succeeds, create the tag
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main
git push origin vX.Y.Z
```

### RULE 2 — version:sync must run before every commit that bumps version

Running `npm version --no-git-tag-version` only changes `package.json`. The following files must also be synced or `version:check` will block publish:
- `template/template.json`
- `template/.github/agents/kb.agent.md`
- `template/.github/prompts/kb-ask.prompt.md`
- `template/.github/prompts/kb-plan.prompt.md`
- `template/.github/prompts/kb-run.prompt.md`

Run `npm run version:sync` immediately after bumping. Do not commit before verifying `npm run version:check` passes.

### RULE 3 — Never push a version tag before publish succeeds

Git tags are hard to undo from remote. If publish fails:
1. Delete the local tag: `git tag -d vX.Y.Z`
2. Fix the publish error
3. Re-publish
4. Re-create the tag only after publish returns exit 0

### RULE 4 — If a dangling git tag already exists, clean it before retrying

```bash
# Check for orphaned tags (tag exists in git but not npm)
git tag -l
npm view @williamduong/kb versions --json

# Delete dangling tag (local)
git tag -d vX.Y.Z

# Delete from remote if already pushed
git push origin :refs/tags/vX.Y.Z
```

### RULE 5 — version:check is the single source of truth

Before any publish attempt, `npm run version:check` must return "Version check OK". If it reports mismatches, run `npm run version:sync` and commit before proceeding.

### RULE 6 — Run npm publish guard before publish

Always run the prepublish guard before any publish attempt:

```bash
npm run prepublish:version-guard
```

If it fails with "already exists on npm", do not retry publish. Bump version first.

### RULE 7 — Separate release intent from governance intent

- Governance intent tracks policy/process changes.
- Release intent exists only when there is a concrete publish target (`vX.Y.Z`).
- Never treat governance-only commits as a signal to re-publish the same package version.

---

Muc tieu: moi lan release deu di theo 1 luong co dinh, khong sot buoc:
- code
- changelog
- npm
- git tag + GitHub Release
- website/docs (GitHub Pages)
- verification va rollback

Flow uu tien (v1.6+):
- Path A (khuyen nghi): pipeline-first voi `kb release init-pipeline` + `kb release plan` + `kb release run`
- Path B (fallback): manual command set

## 0) Chon pham vi release

Chon 1 trong 3 muc:
- patch: sua loi, khong breaking
- minor: them tinh nang, backward compatible
- major: co breaking change

Version quy uoc:
- package version: X.Y.Z
- git tag: vX.Y.Z
- release title: vX.Y.Z

## 1) Preflight moi truong

```bash
node -v
npm -v
npm whoami
gh auth status
```

Dieu kien pass:
- Node >= 18
- npm account co quyen publish `@williamduong/kb`
- GitHub CLI da dang nhap dung account

Neu can dang nhap lai npm:

```bash
npm login
npm whoami
```

Set auth mode uu tien cho security key/web flow:

```bash
npm config set auth-type web
```

## 2) Dong bo nhanh release

```bash
git checkout main
git pull origin main
npm ci
git status --short
```

Dieu kien pass:
- working tree sach hoac chi co thay doi release dang lam

## 3) Chuan bi noi dung release

Cap nhat toi thieu:
- `package.json` version (roi chay `npm run version:sync` ngay de dong bo)
- `template/TEMPLATE_CHANGELOG.md` (entry moi cho moi minor/major bump)
- `README.md` neu co doi command/flow (bao gom version badge dau file)
- `site/index.html` va/hoac `site/docs.html` neu can surface thay doi release cho public

Neu release them lenh moi (vi du: `kb intent`, `kb graph`, `kb chaos`):
- Them vao CLI table trong `site/index.html`
- Them vao command list trong `README.md`
- Cap nhat "Latest Release" badge tren `site/index.html` thanh version moi

Neu agent layer thay doi (kb.agent.md, prompt files):
- Verify version field trong `template/.github/agents/kb.agent.md`
- Verify version trong `template/.github/prompts/*.prompt.md`
- Them entry vao `template/TEMPLATE_CHANGELOG.md` ghi ro agent-layer changes

Neu docs tree doi, rebuild metadata:

```bash
npm run docs:tree
```

Sau khi chay `npm version X.Y.Z`, dong bo version vao cac file lien quan:

```bash
npm run version:sync
```

Neu muon generate draft release notes tu lich su git:

```bash
npm run release:notes -- vX.Y.Z -- --from=vPREV --format=md --output=notes/release-vX.Y.Z.md
```

Hoac dung kb release notes (khuyen nghi cho downstream KBs):

```bash
kb release notes vX.Y.Z --from=vPREV --output=notes/release-vX.Y.Z.md
```

Review file notes vua sinh roi cap nhat `template/TEMPLATE_CHANGELOG.md` thu cong.

## 4) Chay quality gate truoc publish

Chay unit tests truoc:

```bash
npm run test:unit
```

Roi chay full release dry-run:

```bash
npm run release:dry
```

`release:dry` bao gom:
- `npm run doc:gate`
- `npm run doctor`
- `npm run pack:smoke`

Neu fail: sua den khi pass 100%. Ca hai lenh tren phai pass truoc khi sang buoc 4.1.

## 4.1) Pipeline-first run (khuyen nghi)

Khoi tao pipeline 1 lan (neu chua co):

```bash
node ./bin/kb.js release init-pipeline --template=npm-package --yes
```

Preview truoc khi chay that:

```bash
node ./bin/kb.js release plan --bump=<patch|minor|major> --from=vPREV
node ./bin/kb.js release run --bump=<patch|minor|major> --from=vPREV --dry-run
```

Chay release pipeline that:

```bash
node ./bin/kb.js release run --bump=<patch|minor|major> --from=vPREV
```

Luu y:
- Pipeline co pre-check `kb status --quiet`, se dung neu workspace dang attention/blocked.
- Cac buoc nguy hiem (push/publish) nen de `confirm: true` trong YAML.
- Sau khi pipeline thanh cong, catalog se duoc auto-update idempotent.

## 5) Commit va tag release

```bash
git add <files-release>
git commit -m "release: X.Y.Z"
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Push len remote:

```bash
git push origin main
git push origin vX.Y.Z
```

## 6) Publish npm

```bash
npm publish --access public
```

Neu npm hien web auth link:

```text
npm notice Open https://www.npmjs.com/login/<id> to use your security key for authentication
```

Thuc hien ngay:
- mo link va xac thuc trong trinh duyet
- quay lai terminal va tiep tuc

Neu gap `EOTP`:

```bash
npm publish --access public --otp=<6-digit-code-moi>
```

Neu gap loi web done endpoint (`E404 /-/v1/done`):

```bash
npm config set auth-type legacy
npm publish --access public
```

## 7) Tao GitHub Release

```bash
gh release create vX.Y.Z --title "vX.Y.Z" --notes "<release notes>"
```

Kiem tra release:

```bash
gh release view vX.Y.Z --json url,name,tagName,isDraft,isPrerelease
```

## 8) Website/docs deploy va verify

Repo nay deploy site qua GitHub Pages workflow (`.github/workflows/pages.yml`) khi push `main`.

Kiem tra workflow Pages moi nhat:

```bash
gh run list --workflow pages.yml --limit 1
```

Neu can trigger tay:

```bash
gh workflow run pages.yml
```

Cho den khi run thanh cong:

## 9) Post-publish verification (v2.0+)

Kiem tra tren moi truong consumer sau khi npm publish thanh cong:

```bash
# Cai dat version moi nhat va kiem tra help
npm install -g @williamduong/kb@latest
kb version
kb help --advanced
```

Smoke test cac lenh moi tu v1.7-v2.0:

```bash
# Graph (v1.9)
kb graph check
kb graph export

# Chaos (v1.8)
kb chaos --quiet

# Intent (v2.0)
kb intent list
kb intent suggest-lessons

# Release catalog (v1.5-v1.6)
kb release list
```

Kiem tra site da cap nhat:
- Mo https://williamduong.github.io/project-knowledge-base-template/ va xac nhan "Latest Release" badge hien dung version
- CLI table co cac lenh moi

Neu gap rollback npm:

```bash
# Deprecate (khong xoa duoc tren npm)
npm deprecate @williamduong/kb@X.Y.Z "Rollback: see vX.Y.ZPREV"
```

```bash
gh run watch
```

Verify URL public:
- `https://<owner>.github.io/<repo>/landing/`
- `https://<owner>.github.io/<repo>/docs/`

## 9) Verification cuoi cung (bat buoc)

```bash
npm view @williamduong/kb version
npm view @williamduong/kb dist-tags --json
git rev-list -n 1 vX.Y.Z
git log --oneline -1
gh release view vX.Y.Z --json url,tagName,isDraft,isPrerelease
gh run list --workflow pages.yml --limit 1
```

Checklist pass:
- npm `latest` = X.Y.Z
- tag `vX.Y.Z` ton tai va trung release commit
- GitHub Release khong draft, khong prerelease (neu ban hanh chinh thuc)
- Pages run moi nhat thanh cong
- landing/docs load duoc va hien dung noi dung vua cap nhat

## 10) Post-release smoke test

Trong folder test moi:

```bash
npm install -g @williamduong/kb@latest
kb version
kb help
kb init
```

Dieu kien pass:
- version dung X.Y.Z
- init flow/handoff prompt dung nhu thiet ke

## 11) Rollback / su co

Nguyen tac:
- khong the publish de overwrite cung 1 version

Neu release loi:
1. deprecate version loi
2. sua code
3. tang version moi va release lai

Lenh mau:

```bash
npm deprecate @williamduong/kb@X.Y.Z "Deprecated due to release issue. Use X.Y.(Z+1)."
```

Neu can rollback docs/site:
- tao commit revert tren `main`
- push len remote de Pages deploy lai

## 12) Quick command set (patch release)

Path A (pipeline-first):

```bash
git checkout main
git pull origin main
npm ci
npm whoami
gh auth status
npm config set auth-type web

npm run docs:tree
npm run release:dry

node ./bin/kb.js release init-pipeline --template=npm-package --yes
node ./bin/kb.js release plan --bump=patch --from=vPREV
node ./bin/kb.js release run --bump=patch --from=vPREV --dry-run
node ./bin/kb.js release run --bump=patch --from=vPREV

gh release create vX.Y.Z --title "vX.Y.Z" --notes-file notes/release-notes-vX.Y.Z.md
gh run list --workflow pages.yml --limit 1

npm view @williamduong/kb version
npm view @williamduong/kb dist-tags --json
gh release view vX.Y.Z --json url,name,tagName,isDraft,isPrerelease
```

Path B (manual fallback):

```bash
git checkout main
git pull origin main
npm ci
npm whoami
gh auth status
npm config set auth-type web

npm run docs:tree
npm run release:dry

git add <files-release>
git commit -m "release: X.Y.Z"
git tag -a vX.Y.Z -m "Release X.Y.Z"
git push origin main
git push origin vX.Y.Z

npm publish --access public

gh release create vX.Y.Z --title "vX.Y.Z" --notes "<release notes>"
gh run list --workflow pages.yml --limit 1

npm view @williamduong/kb version
npm view @williamduong/kb dist-tags --json
gh release view vX.Y.Z --json url,name,tagName,isDraft,isPrerelease
```

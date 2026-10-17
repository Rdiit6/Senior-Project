# PR & Git Rules

Applies to everyone, every change, including docs. These rules also produce our **Git documentation evidence (20% of the grade)**: clean history, linked issues, reviewed PRs.

> **Addendum A (§15)** adds our NIU personal branches and the `dev` branch. It *extends* §1–§14; it does not replace them. §15.1 lists the few places where it differs.

## 1. Principles

1. `main` is always deployable and always demo-able.
2. Every change goes through a PR. No direct pushes to `main`.
3. One PR = one issue = one reviewable idea.
4. Someone other than the author approves.
5. Docs are code: if behaviour or contract changes, the doc changes in the **same PR**.

## 2. Branch strategy — trunk-based, short-lived branches

`main` (protected) ← short-lived feature branches, merged within ~1–3 days.

| Option | Pros | Cons |
|--------|------|------|
| **Trunk-based (chosen)** | Simple for 3 beginners, few merge conflicts, `main` always integrated, matches weekly demos | Needs CI discipline; half-finished work must hide behind flags or stay in draft PRs |
| GitFlow (`develop` + `release/*`) | Clear release staging | Extra branches to sync, long-lived `develop` drifts, overkill for a 9-week PoC |
| Per-person long-lived branches | Feels safe, one obvious place to push | Painful merges, hides integration bugs until late. **Not the default**; allowed only as the NIU branch with the guard rules in §15. |

**Naming:** `<type>/<area>-<issue#>-<short-slug>`

```
feat/be-12-checkin-endpoint
feat/fe-21-mood-picker
fix/be-33-sync-duplicate-checkins
docs/all-04-api-contract-v1
chore/infra-02-azure-app-service
contract/all-07-add-days-query
```

- `type`: `feat | fix | docs | chore | refactor | test | ci | contract`
- `area`: `be | fe | ux | infra | all`
- Lowercase, hyphens, no spaces, no personal names or bare numbers **for these task branches**. The one exception is each member's NIU branch (e.g. Radit's `536801`), which is kept as described in §15.

## 3. Commits — Conventional Commits

```
<type>(<area>): <imperative summary, ≤ 72 chars>

<optional body: why, not what>

Refs #12
```

Examples: `feat(be): add POST /api/checkins with upsert per day`, `fix(fe): keep offline queue after tab reload`, `docs(all): freeze API contract v1.0`.

- Commit small and often on your branch; history is squashed on merge, so messy WIP commits are fine, but never commit secrets.
- Breaking contract changes: add `!` e.g. `feat(be)!: rename mood_value`.

## 4. Pull request rules

| Rule | Detail |
|------|--------|
| Link an issue | PR description contains `Closes #<n>`. No issue → create one first (even a 2-line issue). |
| Size | Target **≤ 400 changed lines** (excluding lockfiles, generated files, seed data). Larger → split or justify in the PR. |
| Draft early | Open a **Draft PR** after your first push so others can see direction. Mark *Ready for review* only when the checklist is complete. |
| Title | Same format as a commit: `feat(be): add POST /api/checkins`. It becomes the squash commit. |
| Evidence | UI changes: screenshot or short screen recording (mobile width). API changes: request/response example or test output. |
| Tests | New logic ships with tests (see §7). If not testable, say why. |
| Self-review | Read your own diff on GitHub before requesting review. |
| Conflicts | Author rebases/merges `main` into the branch and resolves conflicts. |
| Review SLA | Reviewer responds within **24 h on weekdays**. If blocked, post in the team chat. |

## 5. Review matrix (3-person team)

| PR touches | Author | Required reviewer(s) |
|------------|--------|----------------------|
| Backend / DB / Azure | Radit | Christania (reads for contract match and clarity) |
| Frontend | Christania | Radit (API usage, error handling) |
| UI design assets, tokens, copy | Arya | Christania (feasibility) |
| **API contract / shared types** (`contract-change`) | anyone | **Radit AND Christania**, plus Arya if user-facing copy changes |
| **Crisis keywords, crisis logic, resource contacts** (`safety`) | anyone | **All other two members** (2 approvals) |
| Docs only | anyone | any one other member |

Pros / cons of mandatory cross-review: it catches contract drift early and spreads knowledge (the bus-factor on Azure/backend is Radit alone otherwise), but it costs time and a non-expert reviewer may rubber-stamp. Mitigation: reviewer must answer the three checklist questions in §12, not just click Approve.

Review etiquette: comment on the code, not the person; label comments `nit:` (optional) vs `blocking:`; the author resolves threads.

## 6. Merging

- **Squash and merge** only. Title = conventional commit, body = PR summary + `Closes #n`.
- Delete the branch after merge.
- Author merges after approvals + green CI. Never merge red CI.
- Never force-push to `main`. Force-push on your own feature branch is OK before review starts.

| Merge style | Pros | Cons |
|-------------|------|------|
| **Squash (chosen)** | One clean commit per issue, easy to revert, readable history for grading | Loses intermediate commits |
| Merge commit | Keeps full history | Noisy graph for beginners |
| Rebase merge | Linear history | Rewrites commits, easier to mess up |

## 7. CI (required status checks)

Set up in Week 1 (`.github/workflows/ci.yml`). A PR cannot merge unless all pass:

| Check | Backend | Frontend |
|-------|---------|----------|
| Lint | ESLint | ESLint |
| Type check | `tsc --noEmit` | `tsc --noEmit` |
| Unit tests | Vitest/Jest (crisis check, insight rules, sync upsert) | Vitest + Testing Library (queue logic, key components) |
| Build | `npm run build` | `next build` |
| Contract check | Responses validated against `shared/contract.ts` shapes | Mock server data typed from the same file |
| Secret scan | gitleaks (or GitHub secret scanning + push protection) | same |

## 8. Contract-change process

The contract (`docs/API-CONTRACT.md`, `shared/contract.ts`) is frozen at v1.0. To change it:

1. Open an issue labelled `contract-change` describing the problem and the proposal.
2. Open a PR touching **both** the doc and `shared/contract.ts`; bump the version in the doc header and add a line to its changelog.
3. Both Radit and Christania approve. Merge. Announce in chat.
4. Both sides then update their code in follow-up PRs. Additive, optional fields are preferred over breaking changes.

## 9. Safety & security rules (non-negotiable)

- **Never commit** `.env`, API keys (OpenRouter), DB connection strings, tokens. Use `.env.example` with fake values; real values live in Azure App Service settings (and GitHub Actions secrets for CI).
- **Never log** `note_text`, `X-Anon-Token`, or the token hash. Log request id, route, status, latency only.
- **Never put real student notes** in tests, seeds, screenshots or issues. Use invented examples.
- Crisis keyword list and resource contacts are `safety`-labelled changes (2 approvals) and contacts must be verified against the official source (link in the PR).
- If a secret is committed: rotate it immediately, then clean history. Deleting the commit is not enough.

## 10. Hotfix (during/near demo)

1. Branch `fix/<area>-<issue#>-<slug>` from `main`.
2. Minimal change, 1 approval, CI must pass (no skipping).
3. Tag after merge. Post what changed in chat.

(Until the final merge, `main` holds no unreleased work, so a hotfix is just a normal PR into `dev`; see §15.6. Once `main` has received the final merge, a P0 fix goes through `dev` and is merged to `main` again.)

## 11. Labels, milestones, tags

- **Milestones** = weeks: `W1 … W9` (see PROJECT-PLAN.md).
- **Labels:** `area:be`, `area:fe`, `area:ux`, `area:infra`, `area:docs`; `type:feature`, `type:bug`, `type:chore`; `priority:P0/P1/P2`; `contract-change`; `safety`; `blocked`; `good-first-review`.
- **Tags:** at the end of each week: `week-1`, `week-2` … so the team can always roll back to the last good demo. Because `main` only receives the final merge (§15.6), weekly tags go on `dev`; the final one (`final`) goes on `main`.

## 12. Templates

### `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## What & why
<!-- 1–3 sentences. What changed and why. -->

Closes #

## Type
- [ ] feat  - [ ] fix  - [ ] docs  - [ ] chore  - [ ] refactor  - [ ] test  - [ ] contract-change  - [ ] safety

## How to test
<!-- Steps, curl, or screenshots. -->

## Checklist (author)
- [ ] Linked to an issue and milestone
- [ ] Self-reviewed my diff
- [ ] Tests added/updated, CI green
- [ ] Docs updated (API-CONTRACT / API-REFERENCE / SRD if behaviour changed)
- [ ] No secrets, tokens, or real note text in code, logs, tests, screenshots
- [ ] UI: screenshot at mobile width attached; support entry still visible
- [ ] Contract: matches `shared/contract.ts` (or labelled `contract-change`)
- [ ] Base branch is `dev` (only the final merge goes to `main`) and my NIU branch is synced with it (§15)

## Reviewer must answer (not just click Approve)
1. Does it do what the linked issue asks?
2. Does request/response match the contract exactly?
3. What is the worst thing that could happen if this is wrong (especially for crisis/safety)?
```

### Issue template (short)

```markdown
**Goal:** one sentence
**Acceptance criteria:**
- [ ] ...
**Area / owner / milestone:**
**Depends on:** #
```

## 13. Branch protection checklist (GitHub → Settings → Branches)

> **Team decision (§15.7): `main` is not protected.** Apply this checklist to `dev` instead (the per-branch table is in §15.7).

- [ ] Require a pull request before merging
- [ ] Require approvals: **1** (use CODEOWNERS or the review matrix for the 2-approval cases)
- [ ] Dismiss stale approvals when new commits are pushed
- [ ] Require status checks to pass (§7) and branches up to date
- [ ] Require conversation resolution before merging
- [ ] Do not allow force pushes or deletions
- [ ] Allow squash merging only; auto-delete head branches
- [ ] Enable secret scanning + push protection

(Settings for `dev` and NIU branches are in §15.7.)

## 14. Definition of Done (any issue)

1. Acceptance criteria met and demonstrated (screenshot, curl, or test).
2. PR reviewed, CI green, squash-merged into `dev` (see §15). `main` only receives the final merge.
3. Deployed to Azure staging/production **if** it affects the running app, and smoke-tested.
4. Docs updated. Issue closed automatically by `Closes #n`.
5. Works at mobile width with the support entry visible (FE) / never logs notes (BE).

---

# 15. Addendum A — NIU branches and `dev`

*Added 17 Oct 2026. Extends §1–§14. Nothing above is removed.*

## 15.1 What this adds, and what it does not change

| Topic | Rule in §1–§14 | With the addendum |
|-------|----------------|-------------------|
| Who has a branch | Short-lived task branches | **Each member keeps one personal branch named by their NIU** (Radit: `536801`). Nothing is renamed. Task branches (§2 naming) stay valid for anything else (hotfix, docs, a parallel task). |
| Where PRs go | `main` | **`dev`**. Nothing goes to `main` until the final merge. |
| `main` | Updated by every merged PR | Updated **once, at the end**, when `dev` is done and merged into it (§15.6). **Not protected** (team decision, §15.7). Weekly tags `week-N` go on `dev`. |
| Merge style | Squash only | **Unchanged for PRs into `dev` (squash).** One exception: the final `dev` → `main` merge uses "merge commit" (§15.5 P7). |
| Commits, PR rules, review matrix, CI, contract process, safety rules | §3–§5, §7–§9 | **Unchanged.** They apply to NIU branches exactly as before. |
| Issue link | Branch name carries the issue number | The NIU branch cannot carry it, so the link moves to commits `(#12)` and the PR `Closes #12` (R7). |

## 15.2 Branch map

```
 issue #12 (task)
     │  commits on your NIU branch, each ending with (#12)
     ▼
 536801  (your NIU branch)  ── PR, squash ──▶  dev  ── final merge, once, at the end ──▶  main
```

| Branch | Owner | Notes |
|--------|-------|-------|
| `main` | nobody, until the final merge | Final state only. **Not protected** (team decision), so keeping it clean is a team rule, not a GitHub setting (R8). |
| `dev` | nobody pushes directly | Integration + the live/demo app until the final merge. Protected. Created once from `main` (§15.7). |
| `536801` | Radit | NIU branch. Only the owner pushes. |
| `<NIU>` (Christania) | Christania | Fill in: `______` |
| `<NIU>` (Arya) | Arya | Fill in: `______` |
| `<NIU>-<type>-<issue#>-<slug>` | owner | Optional short-lived sub-branch, e.g. `536801-feat-13-sync-endpoint`. Use a **dash, not `/`**: git cannot have both `536801` and `536801/feat-13`. |

## 15.3 The flow (Radit's example; others use their own NIU)

```bash
# 0. start of every work session, and before starting a new issue
git fetch origin
git switch 536801
git merge origin/dev          # plain merge. NEVER rebase this branch.

# 1. work on ONE issue (say #12); small commits, each referencing the issue
git add -A
git commit -m "feat(be): validate mood_value on POST /api/checkins (#12)"
git push origin 536801

# 2. issue done: sync again, test, open the PR into dev
git merge origin/dev
npm test
gh pr create --base dev --head 536801 \
  --title "feat(be): add POST /api/checkins" --body "Closes #12"

# 3. review fixes: commit on 536801 and push (the same PR updates)

# 4. after the PR is squash-merged: sync IMMEDIATELY, before any new commit
git fetch origin
git switch 536801
git merge origin/dev          # merges cleanly: dev holds the same changes you already have
git push origin 536801
```

On github.com the same thing: **base = `dev`, compare = your NIU branch.**

### Keeping working while your PR is in review (optional sub-branch)

```bash
git switch -c 536801-feat-13-sync-endpoint 536801     # start the next issue off your NIU branch
git push -u origin 536801-feat-13-sync-endpoint       # backup + visible

# ...later, once PR #12 is merged and 536801 is synced (step 4):
git switch 536801-feat-13-sync-endpoint
git merge 536801                                       # resolve conflicts here
git switch 536801
git merge --ff-only 536801-feat-13-sync-endpoint       # NIU branch now holds #13 only
git push origin 536801
# open the PR for #13 as in step 2, then delete the sub-branch
git branch -d 536801-feat-13-sync-endpoint
git push origin --delete 536801-feat-13-sync-endpoint
```

## 15.4 Guard rules (these are what make a long-lived personal branch safe)

| # | Rule |
|---|------|
| R1 | **Sync before you work and before you open a PR**: `git merge origin/dev`. Merge, never rebase, never force-push your NIU branch. |
| R2 | **One issue per PR** (at most 3 small related ones). **One open PR per NIU branch.** |
| R3 | **Freeze rule:** while your PR is open, push only review fixes for it to your NIU branch. New issues go on a sub-branch (§15.3). |
| R4 | **Sync immediately after your PR merges**, before any new commit on the NIU branch (step 4). |
| R5 | Size limit from §4 still applies (≤ 400 lines). |
| R6 | Only the owner pushes to their NIU branch. Others comment on the PR or suggest changes. |
| R7 | **Traceability:** every commit message ends with `(#issue)`; every PR says `Closes #issue`. |
| R8 | **All PRs target `dev`.** Since `main` has no GitHub protection, the team itself guarantees: **nobody pushes, force-pushes, or opens PRs into `main` until the final merge (§15.6).** |

## 15.5 Problems this model can cause, and the fix

| # | Problem | Why | Fix |
|---|---------|-----|-----|
| P1 | **Phantom conflicts after a squash** | Squash rewrites your commits into one new commit in `dev`; if you keep committing on your branch before syncing, git sees two different edits to the same lines | R3 + R4. If it still happens: `git merge origin/dev`, and for files that belong to the PR already merged, take dev's version: `git checkout --theirs <file>` (in a merge, *theirs* = incoming `dev`), then `git add` and commit. |
| P2 | **An open PR grows** (new commits join it, approvals go stale) | A PR follows its branch | R3 (freeze) + "dismiss stale approvals" (§15.7). |
| P3 | **Branch drifts from `dev`**, big conflicts | Three people merging in parallel | R1 + "require up to date" on `dev` (§15.7). |
| P4 | **PRs get too big** | Issues pile up on one branch | R2, R5, and open the PR as soon as the issue is done. |
| P5 | **`Closes #n` does not close the issue** | GitHub only auto-closes on PRs merged into the **default branch** | **Set `dev` as the default branch** (Settings → General). Fallback: keep `main` as default and close issues by hand at each Friday checkpoint. (Also useful here: with `main` untouched until the end, a default of `main` would show an empty-looking repo to visitors.) |
| P6 | **Branch name no longer shows which task it is** | NIU is a person, not a task | R7, plus the PR title in conventional format and milestone/issue links. |
| P7 | **Final merge goes wrong, or `main` gets touched by accident** | `main` has no protection, so a stray push, force-push or squash is possible; squashing all of `dev` into one commit would also throw away the per-PR history | The final `dev` → `main` uses **"Create a merge commit"** (keeps history, no rewrite). Until then R8. Only Radit does the final merge. If a second merge is needed later (P0 fix after the final merge), repeat the same way. |
| P8 | **Hotfix** | Before the final merge `main` has nothing unreleased | Hotfix = a normal PR into `dev` (§10). After the final merge, fix via `dev`, then merge to `main` again. No back-merge needed. |
| P9 | **Shared files collide** (`shared/contract.ts`, lockfiles, docs) | Several branches edit them | `CODEOWNERS`; contract changes only as their own small PR (§8, target `dev`); on a lockfile conflict take `dev`'s version and run `npm install`, never hand-edit it. |
| P10 | **Review bottleneck** | Three people | 24 h SLA (§4), review matrix (§5), draft PRs for early feedback, sub-branches so nobody is blocked while waiting. |
| P11 | **Wrong base branch or direct push** | Beginner slip | Branch protection (§15.7), checkbox in the PR template, recovery in §15.9. |

## 15.6 Friday checkpoint (every week) and the final merge to `main` (once)

**Every Friday, on `dev` (Radit tags; no PR to `main`):**

1. Smoke-test the running app built from `dev`: `/health`, check-in, crisis path, offline sync.
2. Tag the checkpoint so we can roll back to the last good demo:
   ```bash
   git fetch origin
   git tag -a week-3 origin/dev -m "Week 3 demo: dashboard + insights live"
   git push origin week-3
   ```
3. Everyone syncs their NIU branch (R1).

**Final merge (Radit), only when `dev` is finished:** planned for the code freeze (Fri 11 Dec, see PROJECT-PLAN).

1. Run the acceptance tests (SRD §9) on the app built from `dev`.
2. Open PR **`dev` → `main`** titled `final: MindMeter v1.0`; another member checks it; Radit merges with **"Create a merge commit"** (not squash, P7).
3. Tag `final` on `main`: `git fetch origin && git tag -a final origin/main -m "Final submission" && git push origin final`.
4. If a P0 bug is found afterwards (W9 buffer): fix through your NIU branch → `dev`, then repeat steps 2–3 with a new tag (`final-1`).

**Deployment:** because `main` stays untouched until the end, the live app deploys from **`dev`** throughout the project. After the final merge, point the deployment at `main` (or leave it on `dev` if it is identical). An Azure staging slot is optional (needs a tier that supports slots; verify with the department account).

## 15.7 Settings

**One-time setup (Radit, Week 1):**

```bash
git switch main && git pull
git switch -c dev
git push -u origin dev
# GitHub → Settings → General → Default branch → dev
```

Pull request merge methods (Settings → General): enable **squash** (used for NIU branch → `dev`) **and merge commit** (used only for the final merge into `main`).

**`main` is intentionally left without GitHub branch protection (team decision).** It is safe only because of R8: nobody touches it until the final merge. See §15.8 for the trade-off and a free, optional safeguard.

| Setting | `main` | `dev` | NIU branches |
|---------|:------:|:-------------:|:------------:|
| Branch protection | **none** (R8 instead) | ✅ | none |
| Require a pull request | no | ✅ | no |
| Approvals | n/a | 1 (2 for `safety`, §5) | n/a |
| Dismiss stale approvals on new commits | n/a | ✅ | n/a |
| Require status checks (§7) | n/a | ✅ | CI runs on every push, not required |
| Require branch up to date | n/a | ✅ ("Update branch" button; relax in W7–W8 if it blocks) | n/a |
| Require conversation resolution | n/a | ✅ | n/a |
| Block force pushes | n/a | ✅ | not needed (R1: never force-push) |
| Block deletion | n/a | ✅ | n/a |
| Auto-delete head branches | n/a | n/a | **off** (NIU branches live on; delete sub-branches by hand) |

CI (§7) runs on every pull request and on pushes to `dev` and `main` (see `.github/workflows/ci.yml`); it does not run on plain pushes to NIU branches, so open the PR early to get CI feedback. The `deploy-azure` job should trigger on push to `dev` (PROJECT-PLAN MM-103). `CODEOWNERS`: `backend/` and `.github/` → Radit; `frontend/` → Christania; design docs/assets → Arya; `shared/` and `docs/API-*.md` → Radit + Christania.

## 15.8 Pros and cons of this addendum

| Pros | Cons |
|------|------|
| Keeps everything you already agreed: your NIU branches, squash, one PR per issue, review matrix | Long-lived branches need the discipline in R1–R4 |
| `dev` is the single integration branch; `main` stays a clean "final" snapshot with one merge to do | GitHub's `Closes #n` quirk (P5) needs the default-branch setting |
| No process overhead on `main`: no release PRs, no weekly merge ceremony; weekly progress is shown with tags on `dev` | **`main` has no technical protection**: one accidental push, force-push, or deletion could damage the branch that is graded as final. We rely on R8. |
| If it hurts by Week 4, drop the NIU branch step: use §2 task branches straight into `dev` | `main` looks empty/stale until the end; mitigated by making `dev` the default branch |

**Optional safeguard that adds no process:** a branch rule on `main` that only blocks force-push and deletion (no PR requirement, no approvals, so it does not slow anyone). It is not enabled by default because the team decided against protecting `main`; Radit can turn it on in one minute if the team agrees.

## 15.9 Recovery cheat-sheet

| Situation | Fix |
|-----------|-----|
| Committed a new issue on my NIU branch while my PR is open (not pushed) | `git branch 536801-feat-13-x` (keeps the commit), then `git reset --hard origin/536801`; continue on the sub-branch. If it is already pushed, tell the team; don't force-push alone. |
| Conflicts when syncing | `git merge origin/dev`, fix files, `git add`, `git commit`. Files from my already-merged PR: `git checkout --theirs <file>`. Lockfile: take dev's and `npm install`. Contract files: stop and ask the owners. |
| PR shows commits/files from a second issue | The freeze rule was skipped. Ask in chat; usually move the extra work to a sub-branch before review continues. |
| Opened the PR into `main` by mistake | PR page → Edit (next to the title) → change base to `dev`. |
| Push to `dev`/`main` was rejected | The protection worked. Push to your NIU branch and open a PR. |
| Secret committed | §9: rotate first, then clean history with the team. |

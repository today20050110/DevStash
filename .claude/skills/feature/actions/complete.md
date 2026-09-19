# Complete Action

The main branch of this repo is `master`, not `main`.

0. Show the user the commit message and the branch/merge plan, and **wait for their
   approval before running any git command** (see `context/ai-interaction.md`:
   "Ask before committing"). Do not proceed on assumed consent.
1. Stage all changes and commit with a descriptive message
   (conventional commits, no "Generated With Claude" line)
2. Switch to `master` and merge with `git merge --ff-only <branch>` (no push yet).
   This repo keeps a linear history — never create a merge commit, so no `--no-ff`
   and no bare `git merge` that could fall back to one. If `--ff-only` is refused
   because `master` moved ahead, rebase the feature branch onto `master` first,
   then fast-forward.
3. Ask before deleting the local feature branch, then delete it
4. Reset current-feature.md:
   - Change H1 back to `# Current Feature`
   - Clear Goals and Notes sections (keep placeholder comments)
   - Set Status back to `Not Started`
   - Add feature summary to the END of History, matching the detail level of the
     existing entries (what changed, why, verification result, known issues)
5. Commit the reset: `chore: reset current-feature.md after completing [feature]`
6. Push `master` to origin ONCE (single push with all changes)
7. If feature branch was previously pushed, delete it from origin

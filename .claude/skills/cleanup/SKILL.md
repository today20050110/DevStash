---
name: cleanup
description: Clean up project housekeeping tasks (add "run" to execute fixes)
argument-hint: run|check
---

Review the codebase for cleanup tasks:

1. Make sure that the history in @context/current-feature.md is in order from oldest to newest
2. Find unnecessary console.log statements in src/
3. Find unused imports
4. Check for stale TODO comments
5. Find orphaned/unused files
6. Check that context files match actual project state
7. Check that `.env.production` has the same variable NAMES as `.env` (values
   differ by design). `NEON_BRANCH` is expected to be missing from
   `.env.production` — it only feeds the banner in `npm run test:db`. A missing key
   matters: local `build`/`start` load `.env.production` over `.env`, so any key it
   lacks silently falls back to the Development value from `.env`. Also flag it if
   `.env.local` exists: Next.js would load it over both files. Report anything else
   that is missing, and never print values.
8. Find `@ts-ignore` comments that might be stale

**Mode: $ARGUMENTS**

If no argument or argument is "check":

- Only report findings, don't modify anything
- List what WOULD be cleaned up

If the argument is "run" or "fix":

- First, report all findings with numbered items
- Then ask: "Which items would you like me to fix? (enter numbers like 1,3,5 or 'all' or 'none')"
- Wait for user response before making any changes
- Only fix the items the user specifies
- Report what you changed

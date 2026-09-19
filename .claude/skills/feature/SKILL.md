---
name: feature
description: Manage current feature workflow - load, start, review, explain, test or complete
argument-hint: load|start|review|explain|test|complete
---

# Feature Workflow

Manages the full lifecycle of a feature from spec to merge.
The main branch of this repo is `master`, not `main`.

## Working File

@context/current-feature.md

### File Structure

current-feature.md has these sections:

- `# Current Feature` - H1 heading with feature name when active
- `## Status` - Not Started | In Progress | Complete (English only, even though the rest of the file is written in Traditional Chinese)
- `## Goals` - Bullet points of what success looks like
- `## Notes` - Additional context, constraints, or details from spec
- `## History` - Completed features (append only)

## Task

Execute the requested action: $ARGUMENTS

| Action | Description |
|--------|-------------|
| `load` | Load a feature spec or inline description |
| `start` | Begin implementation, create branch |
| `review` | Check goals met, code quality |
| `explain` | Document what changed and why |
| `test` | Add unit tests for the feature's actions and utilities |
| `complete` | Commit, push, merge, reset (asks before any git command) |

See [actions/](actions/) for detailed instructions.

If no action provided, explain the available options.
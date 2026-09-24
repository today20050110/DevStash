# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Commands

- **Dev server**: `npm run dev` (runs on http://localhost:3000)
- **Build**: `npm run build`
- **Production server**: `npm run start`
- **Lint**: `npm run lint`

## Neon Database Safety

Whenever using the Neon MCP server or Neon CLI:

- **Project**: always `devstash` (project ID `shiny-voice-93414835`, org `org-polished-salad-91637654`). Never operate on any other project.
- **Branch**: always the `Development` branch (branch ID `br-broad-pine-b312blp9`, compute endpoint `ep-lucky-frost-b3c82uje`). Pass `project_id` and `branch_id` explicitly on every call; Neon MCP tools take the branch ID, not the name. Never rely on the default branch, which is `production`.
- **Production is off-limits** (`production` branch, branch ID `br-calm-boat-b3wjd64b`, endpoint `ep-sparkling-field-b3cf2urc`). Do not read, query, migrate, reset, or delete anything on it unless I explicitly say "production" in the current request. Permission given once does not carry over to later requests.
- Before running any SQL or any write operation, state the project and branch you are about to use. If a tool result shows a different branch or endpoint than expected, stop and tell me.
- If the Neon MCP fails to connect, do not fall back to connection strings from `.env.production.bak`. Use `.env` (Development) or ask me.

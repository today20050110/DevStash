/**
 * Single source of truth for dashboard mock data.
 *
 * Temporary stand-in until Prisma + Neon are wired up. Shapes mirror the
 * planned schema (see context/project-overview.md) so swapping in real
 * queries later is a drop-in change.
 *
 * Dates are ISO strings so the data can cross the server/client boundary
 * without serialisation warnings.
 */

export type ItemKind = "TEXT" | "URL" | "FILE";
export type Plan = "FREE" | "PRO";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  plan: Plan;
}

export interface ItemType {
  id: string;
  name: string;
  slug: string;
  kind: ItemKind;
  /** lucide-react icon name */
  icon: string;
  color: string;
  /** Sidebar badge count. Display-only — not derived from `items`. */
  itemCount: number;
}

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  isFavorite: boolean;
  /** Card count. Display-only — not derived from `items`. */
  itemCount: number;
  /** Types present in this collection. First one drives the card accent colour. */
  typeIds: string[];
}

export interface Item {
  id: string;
  title: string;
  description: string;
  typeId: string;
  /** TEXT kind */
  content: string | null;
  /** URL kind */
  url: string | null;
  /** FILE kind */
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  /** Syntax highlighting hint for TEXT items */
  language: string | null;
  tags: string[];
  collectionIds: string[];
  isFavorite: boolean;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const currentUser: User = {
  id: "user_1",
  name: "John Doe",
  email: "john@example.com",
  avatarUrl: null,
  plan: "PRO",
};

export const itemTypes: ItemType[] = [
  {
    id: "type_snippet",
    name: "Snippets",
    slug: "snippets",
    kind: "TEXT",
    icon: "Code",
    color: "#3b82f6",
    itemCount: 24,
  },
  {
    id: "type_prompt",
    name: "Prompts",
    slug: "prompts",
    kind: "TEXT",
    icon: "Sparkles",
    color: "#8b5cf6",
    itemCount: 18,
  },
  {
    id: "type_command",
    name: "Commands",
    slug: "commands",
    kind: "TEXT",
    icon: "Terminal",
    color: "#f97316",
    itemCount: 15,
  },
  {
    id: "type_note",
    name: "Notes",
    slug: "notes",
    kind: "TEXT",
    icon: "StickyNote",
    color: "#fde047",
    itemCount: 12,
  },
  {
    id: "type_file",
    name: "Files",
    slug: "files",
    kind: "FILE",
    icon: "File",
    color: "#6b7280",
    itemCount: 5,
  },
  {
    id: "type_image",
    name: "Images",
    slug: "images",
    kind: "FILE",
    icon: "Image",
    color: "#ec4899",
    itemCount: 3,
  },
  {
    id: "type_link",
    name: "Links",
    slug: "links",
    kind: "URL",
    icon: "Link",
    color: "#10b981",
    itemCount: 8,
  },
];

export const collections: Collection[] = [
  {
    id: "col_react_patterns",
    name: "React Patterns",
    slug: "react-patterns",
    description: "Common React patterns and hooks",
    isFavorite: true,
    itemCount: 12,
    typeIds: ["type_snippet", "type_file", "type_link"],
  },
  {
    id: "col_python_snippets",
    name: "Python Snippets",
    slug: "python-snippets",
    description: "Useful Python code snippets",
    isFavorite: false,
    itemCount: 8,
    typeIds: ["type_snippet", "type_note"],
  },
  {
    id: "col_context_files",
    name: "Context Files",
    slug: "context-files",
    description: "AI context files for projects",
    isFavorite: true,
    itemCount: 5,
    typeIds: ["type_file", "type_note"],
  },
  {
    id: "col_interview_prep",
    name: "Interview Prep",
    slug: "interview-prep",
    description: "Technical interview preparation",
    isFavorite: false,
    itemCount: 24,
    typeIds: ["type_note", "type_snippet", "type_link", "type_prompt"],
  },
  {
    id: "col_git_commands",
    name: "Git Commands",
    slug: "git-commands",
    description: "Frequently used git commands",
    isFavorite: true,
    itemCount: 15,
    typeIds: ["type_command", "type_file"],
  },
  {
    id: "col_ai_prompts",
    name: "AI Prompts",
    slug: "ai-prompts",
    description: "Curated AI prompts for coding",
    isFavorite: false,
    itemCount: 18,
    typeIds: ["type_prompt", "type_snippet", "type_note"],
  },
];

export const items: Item[] = [
  {
    id: "item_use_auth_hook",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    typeId: "type_snippet",
    content: `import { useContext } from 'react'
import { AuthContext } from './AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}`,
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: "typescript",
    tags: ["react", "auth", "hooks"],
    collectionIds: ["col_react_patterns"],
    isFavorite: true,
    pinnedAt: "2024-01-15T09:00:00.000Z",
    createdAt: "2024-01-15T09:00:00.000Z",
    updatedAt: "2024-01-15T09:00:00.000Z",
  },
  {
    id: "item_api_error_handling",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    typeId: "type_snippet",
    content: `export async function fetchWithRetry(url: string, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const res = await fetch(url)
    if (res.ok) return res.json()
    await new Promise((r) => setTimeout(r, 2 ** attempt * 250))
  }
  throw new Error(\`Request failed after \${retries} attempts\`)
}`,
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: "typescript",
    tags: ["api", "error-handling", "fetch"],
    collectionIds: ["col_react_patterns", "col_interview_prep"],
    isFavorite: false,
    pinnedAt: "2024-01-12T14:20:00.000Z",
    createdAt: "2024-01-12T14:20:00.000Z",
    updatedAt: "2024-01-12T14:20:00.000Z",
  },
  {
    id: "item_code_review_prompt",
    title: "Code Review Prompt",
    description: "Thorough review prompt covering security and edge cases",
    typeId: "type_prompt",
    content:
      "Review the following diff. Focus on security holes, missing auth checks, unhandled edge cases, and N+1 queries. Quote the exact line for each finding and suggest a concrete fix.",
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: null,
    tags: ["review", "ai", "quality"],
    collectionIds: ["col_ai_prompts"],
    isFavorite: true,
    pinnedAt: null,
    createdAt: "2024-01-10T11:05:00.000Z",
    updatedAt: "2024-01-11T08:40:00.000Z",
  },
  {
    id: "item_git_undo_commit",
    title: "Undo Last Commit",
    description: "Keep the changes staged, drop the commit",
    typeId: "type_command",
    content: "git reset --soft HEAD~1",
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: "bash",
    tags: ["git", "undo"],
    collectionIds: ["col_git_commands"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-09T16:30:00.000Z",
    updatedAt: "2024-01-09T16:30:00.000Z",
  },
  {
    id: "item_git_prune_branches",
    title: "Prune Merged Branches",
    description: "Delete every local branch already merged into main",
    typeId: "type_command",
    content: "git branch --merged main | grep -v main | xargs git branch -d",
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: "bash",
    tags: ["git", "cleanup"],
    collectionIds: ["col_git_commands"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-08T10:15:00.000Z",
    updatedAt: "2024-01-08T10:15:00.000Z",
  },
  {
    id: "item_postgres_index_notes",
    title: "Postgres Index Notes",
    description: "When GIN beats B-tree, and why partial indexes matter",
    typeId: "type_note",
    content:
      "B-tree covers equality and range. GIN is for containment: full-text search, jsonb, trgm. Partial indexes are the fix when a column is mostly NULL — Postgres treats every NULL as distinct, so a plain unique index will not stop duplicates.",
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: null,
    tags: ["postgres", "performance"],
    collectionIds: ["col_interview_prep"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-07T19:45:00.000Z",
    updatedAt: "2024-01-14T07:20:00.000Z",
  },
  {
    id: "item_project_context_md",
    title: "project-context.md",
    description: "Baseline context file handed to the AI on every session",
    typeId: "type_file",
    content: null,
    url: null,
    fileName: "project-context.md",
    mimeType: "text/markdown",
    fileSize: 8420,
    language: null,
    tags: ["ai", "context"],
    collectionIds: ["col_context_files"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-06T13:00:00.000Z",
    updatedAt: "2024-01-06T13:00:00.000Z",
  },
  {
    id: "item_architecture_diagram",
    title: "Architecture Diagram",
    description: "Current service topology, exported from Excalidraw",
    typeId: "type_image",
    content: null,
    url: null,
    fileName: "architecture-v2.png",
    mimeType: "image/png",
    fileSize: 214_600,
    language: null,
    tags: ["architecture", "diagram"],
    collectionIds: ["col_context_files"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-05T09:30:00.000Z",
    updatedAt: "2024-01-05T09:30:00.000Z",
  },
  {
    id: "item_prisma_docs",
    title: "Prisma 7 Upgrade Guide",
    description: "Breaking changes for generator, datasource and client init",
    typeId: "type_link",
    content: null,
    url: "https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7",
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: null,
    tags: ["prisma", "docs"],
    collectionIds: ["col_react_patterns"],
    isFavorite: true,
    pinnedAt: null,
    createdAt: "2024-01-04T15:10:00.000Z",
    updatedAt: "2024-01-04T15:10:00.000Z",
  },
  {
    id: "item_python_dedupe",
    title: "Dedupe While Preserving Order",
    description: "One-liner using dict key ordering",
    typeId: "type_snippet",
    content: `def dedupe(items):
    return list(dict.fromkeys(items))`,
    url: null,
    fileName: null,
    mimeType: null,
    fileSize: null,
    language: "python",
    tags: ["python", "utils"],
    collectionIds: ["col_python_snippets"],
    isFavorite: false,
    pinnedAt: null,
    createdAt: "2024-01-03T12:00:00.000Z",
    updatedAt: "2024-01-03T12:00:00.000Z",
  },
];

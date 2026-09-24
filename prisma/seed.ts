import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import "dotenv/config";

import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import type { ItemKind } from "../src/generated/prisma/enums";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL_UNPOOLED / DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// demo 使用者的密碼是公開的，絕不能出現在 production —— 必須明確開啟
const SEED_DEMO = process.env.SEED_DEMO === "1";

const BCRYPT_ROUNDS = 12;

interface SystemItemType {
  name: string;
  slug: string;
  kind: ItemKind;
  /** lucide-react icon name */
  icon: string;
  color: string;
  isProOnly: boolean;
}

/**
 * 7 種系統型別。色碼與圖示對應 project-overview.md §8 的型別視覺對照表。
 * Free 方案不含 file / image（§6），故這兩者 isProOnly = true。
 */
const SYSTEM_ITEM_TYPES: SystemItemType[] = [
  {
    name: "Snippets",
    slug: "snippets",
    kind: "TEXT",
    icon: "Code",
    color: "#3b82f6",
    isProOnly: false,
  },
  {
    name: "Prompts",
    slug: "prompts",
    kind: "TEXT",
    icon: "Sparkles",
    color: "#8b5cf6",
    isProOnly: false,
  },
  {
    name: "Commands",
    slug: "commands",
    kind: "TEXT",
    icon: "Terminal",
    color: "#f97316",
    isProOnly: false,
  },
  {
    name: "Notes",
    slug: "notes",
    kind: "TEXT",
    icon: "StickyNote",
    color: "#fde047",
    isProOnly: false,
  },
  {
    name: "Files",
    slug: "files",
    kind: "FILE",
    icon: "File",
    color: "#6b7280",
    isProOnly: true,
  },
  {
    name: "Images",
    slug: "images",
    kind: "FILE",
    icon: "Image",
    color: "#ec4899",
    isProOnly: true,
  },
  {
    name: "Links",
    slug: "links",
    kind: "URL",
    icon: "Link",
    color: "#10b981",
    isProOnly: false,
  },
];

const DEMO_USER = {
  email: "demo@devstash.io",
  name: "Demo User",
  password: "12345678",
};

interface DemoItem {
  title: string;
  description: string;
  /** 對應 SYSTEM_ITEM_TYPES 的 slug */
  typeSlug: string;
  /** TEXT kind */
  content?: string;
  /** URL kind */
  url?: string;
  language?: string;
  /** 標籤名稱，slug 由名稱正規化而來 */
  tags: string[];
  /** 釘選時間依在 DEMO_COLLECTIONS 中出現的順序遞減 */
  pinned?: boolean;
}

interface DemoCollection {
  name: string;
  slug: string;
  description: string;
  isFavorite?: boolean;
  items: DemoItem[];
}

const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    name: "React Patterns",
    slug: "react-patterns",
    isFavorite: true,
    description: "Reusable React patterns and hooks",
    items: [
      {
        title: "useDebounce & useLocalStorage",
        tags: ["react", "hooks"],
        pinned: true,
        description: "Debounce a fast-changing value and persist state to localStorage",
        typeSlug: "snippets",
        language: "typescript",
        content: `import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}`,
      },
      {
        title: "Context provider with guarded hook",
        tags: ["react", "context", "typescript"],
        description: "Typed context that throws when used outside its provider",
        typeSlug: "snippets",
        language: "typescript",
        content: `import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}`,
      },
      {
        title: "cn, formatBytes & sleep",
        tags: ["utils", "typescript"],
        description: "Small utility functions used across most projects",
        typeSlug: "snippets",
        language: "typescript",
        content: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return \`\${(bytes / 1024 ** i).toFixed(decimals)} \${units[i]}\`;
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));`,
      },
    ],
  },
  {
    name: "AI Workflows",
    slug: "ai-workflows",
    isFavorite: true,
    description: "AI prompts and workflow automations",
    items: [
      {
        title: "Code review",
        tags: ["ai", "code-review"],
        pinned: true,
        description: "Structured review focused on bugs, security and readability",
        typeSlug: "prompts",
        content: `You are a senior software engineer reviewing a pull request.

Review the code below and report findings grouped by severity (critical, major, minor).
For each finding include:
- the file and line
- what is wrong and why it matters
- a concrete suggested fix

Focus on correctness, security (auth checks, input validation), performance
(N+1 queries, unnecessary re-renders) and readability. Do not comment on
formatting that a linter would catch. If the code looks good, say so briefly.

Code:
{{code}}`,
      },
      {
        title: "Documentation generation",
        tags: ["ai", "docs"],
        description: "Generate README-style docs for a module",
        typeSlug: "prompts",
        content: `Write developer documentation for the module below.

Include:
1. A one-paragraph overview of what the module does and when to use it
2. Installation or setup steps, if any
3. The public API: every exported function, its parameters, return value and errors
4. Two or three short usage examples covering the common cases
5. Known limitations or gotchas

Write for a developer who has never seen this codebase. Be concise and use
Markdown headings. Do not invent behaviour that is not in the code.

Module:
{{code}}`,
      },
      {
        title: "Refactoring assistant",
        tags: ["ai", "refactoring"],
        description: "Refactor for clarity without changing behaviour",
        typeSlug: "prompts",
        content: `Refactor the code below to improve readability and maintainability.

Constraints:
- Preserve the existing behaviour and public API exactly
- Keep functions under 50 lines where possible
- Remove duplication and dead code
- Prefer descriptive names over comments
- Do not add new dependencies

First list the problems you found, then show the refactored code, then explain
each change in one sentence. If a change carries risk, call it out explicitly.

Code:
{{code}}`,
      },
    ],
  },
  {
    name: "DevOps",
    slug: "devops",
    description: "Infrastructure and deployment resources",
    items: [
      {
        title: "Next.js multi-stage Dockerfile",
        tags: ["docker", "nextjs"],
        description: "Small production image using Next.js standalone output",
        typeSlug: "snippets",
        language: "dockerfile",
        content: `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]`,
      },
      {
        title: "Deploy to Vercel with migrations",
        tags: ["vercel", "prisma", "deploy"],
        pinned: true,
        description: "Apply pending Prisma migrations, then ship a prebuilt deployment",
        typeSlug: "commands",
        language: "bash",
        content: `#!/usr/bin/env bash
set -euo pipefail

npm ci
npx prisma migrate deploy
vercel build --prod
vercel deploy --prebuilt --prod`,
      },
      {
        title: "Docker documentation",
        tags: ["docker", "docs"],
        description: "Official Docker docs: Dockerfile reference, Compose and more",
        typeSlug: "links",
        url: "https://docs.docker.com/",
      },
      {
        title: "GitHub Actions documentation",
        tags: ["ci", "github-actions"],
        description: "Workflow syntax, runners and CI/CD guides",
        typeSlug: "links",
        url: "https://docs.github.com/en/actions",
      },
    ],
  },
  {
    name: "Terminal Commands",
    slug: "terminal-commands",
    description: "Useful shell commands for everyday development",
    items: [
      {
        title: "Git: undo and inspect",
        tags: ["git"],
        description: "Undo the last commit safely and view branch history",
        typeSlug: "commands",
        language: "bash",
        content: `# Undo the last commit but keep the changes staged
git reset --soft HEAD~1

# Compact history graph of all branches
git log --oneline --graph --decorate --all

# Delete local branches already merged into the current branch
git branch --merged | grep -v '\\*' | xargs -n 1 git branch -d`,
      },
      {
        title: "Docker: logs, shell and cleanup",
        tags: ["docker", "debugging"],
        description: "Everyday container debugging and disk cleanup",
        typeSlug: "commands",
        language: "bash",
        content: `# Follow the last 100 log lines of a compose service
docker compose logs -f --tail=100 web

# Open a shell inside a running container
docker exec -it <container> sh

# Remove stopped containers, unused images and build cache
docker system prune -af`,
      },
      {
        title: "Free up a port",
        tags: ["shell", "networking"],
        description: "Find and kill the process listening on a port",
        typeSlug: "commands",
        language: "bash",
        content: `# macOS / Linux
lsof -ti :3000 | xargs kill -9

# Any OS with Node installed
npx kill-port 3000`,
      },
      {
        title: "npm: dependencies",
        tags: ["npm"],
        description: "Explain, update and reinstall packages",
        typeSlug: "commands",
        language: "bash",
        content: `# Why is this package installed?
npm explain <package>

# Interactively pick dependency upgrades
npx npm-check-updates -i

# Clean reinstall from the lockfile
rm -rf node_modules && npm ci`,
      },
    ],
  },
  {
    name: "Design Resources",
    slug: "design-resources",
    description: "UI/UX resources and references",
    items: [
      {
        title: "Tailwind CSS documentation",
        tags: ["css", "tailwind"],
        description: "Utility class reference and v4 theme configuration",
        typeSlug: "links",
        url: "https://tailwindcss.com/docs",
      },
      {
        title: "shadcn/ui",
        tags: ["react", "ui"],
        description: "Accessible, copy-paste components built on Radix and Tailwind",
        typeSlug: "links",
        url: "https://ui.shadcn.com",
      },
      {
        title: "Material Design 3",
        tags: ["design-system"],
        description: "Google's design system: foundations, styles and components",
        typeSlug: "links",
        url: "https://m3.material.io",
      },
      {
        title: "Lucide icons",
        tags: ["icons", "ui"],
        description: "Open-source icon library used by DevStash",
        typeSlug: "links",
        url: "https://lucide.dev/icons",
      },
    ],
  },
];

async function seedSystemItemTypes(): Promise<Map<string, string>> {
  // 系統型別的 userId 為 null，而 Prisma 的 @@unique([userId, slug]) 複合唯一
  // 輸入不接受 null，所以無法用 upsert —— 改以 findFirst 判斷後 create/update。
  // 真正擋重複的是 migration 裡的 partial unique index ItemType_slug_system_key。
  const typeIds = new Map<string, string>();
  let created = 0;
  let updated = 0;

  for (const type of SYSTEM_ITEM_TYPES) {
    const existing = await prisma.itemType.findFirst({
      where: { slug: type.slug, userId: null },
      select: { id: true },
    });

    const saved = existing
      ? await prisma.itemType.update({
          where: { id: existing.id },
          data: { ...type, isSystem: true },
          select: { id: true },
        })
      : await prisma.itemType.create({
          data: { ...type, isSystem: true, userId: null },
          select: { id: true },
        });

    typeIds.set(type.slug, saved.id);
    if (existing) updated += 1;
    else created += 1;
  }

  console.log(`system item types — created: ${created}, updated: ${updated}`);
  return typeIds;
}

async function seedDemoUser(): Promise<string> {
  const passwordHash = await hash(DEMO_USER.password, BCRYPT_ROUNDS);
  const profile = {
    name: DEMO_USER.name,
    passwordHash,
    emailVerified: new Date(),
    plan: "FREE" as const,
  };

  const user = await prisma.user.upsert({
    where: { email: DEMO_USER.email },
    update: profile,
    create: { email: DEMO_USER.email, ...profile },
    select: { id: true },
  });

  console.log(`demo user — ${DEMO_USER.email}`);
  return user.id;
}

function resolveTypeId(typeIds: Map<string, string>, slug: string): string {
  const id = typeIds.get(slug);
  if (!id) {
    throw new Error(`Unknown system item type: ${slug}`);
  }
  return id;
}

/** 標籤名稱正規化為 slug：「React Hooks」與「react hooks」視為同一個標籤 */
function toTagSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

function resolveTagId(tagIds: Map<string, string>, name: string): string {
  const id = tagIds.get(toTagSlug(name));
  if (!id) {
    throw new Error(`Unknown demo tag: ${name}`);
  }
  return id;
}

/** 依在 DEMO_COLLECTIONS 中出現的順序給釘選時間，越前面越新，排序結果穩定 */
function buildPinnedAt(now: Date): Map<string, Date> {
  const pinned = DEMO_COLLECTIONS.flatMap((c) => c.items).filter(
    (item) => item.pinned,
  );
  return new Map(
    pinned.map((item, index) => [
      item.title,
      new Date(now.getTime() - index * 60_000),
    ]),
  );
}

async function createDemoTags(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<Map<string, string>> {
  const bySlug = new Map<string, string>();
  for (const item of DEMO_COLLECTIONS.flatMap((c) => c.items)) {
    for (const name of item.tags) bySlug.set(toTagSlug(name), name);
  }

  const tags = await tx.tag.createManyAndReturn({
    data: [...bySlug].map(([slug, name]) => ({ userId, name, slug })),
    select: { id: true, slug: true },
  });
  return new Map(tags.map((tag) => [tag.slug, tag.id]));
}

async function seedDemoCollections(
  userId: string,
  typeIds: Map<string, string>,
): Promise<void> {
  const pinnedAt = buildPinnedAt(new Date());

  // Item 沒有自然唯一鍵可 upsert：清掉 demo 使用者名下的內容後重建，
  // 包在同一個 transaction 裡，失敗時不會留下半套資料
  const tagCount = await prisma.$transaction(
    async (tx) => {
      await tx.item.deleteMany({ where: { userId } });
      await tx.collection.deleteMany({ where: { userId } });
      await tx.tag.deleteMany({ where: { userId } });
      // item 以 unchecked input（userId / itemTypeId 純量）建立，
      // 無法巢狀 connectOrCreate tag —— 先建好 tags 再以 tagId 連結
      const tagIds = await createDemoTags(tx, userId);

      for (const { items, ...collection } of DEMO_COLLECTIONS) {
        await tx.collection.create({
          data: {
            ...collection,
            userId,
            items: {
              create: items.map(({ typeSlug, tags, pinned, ...item }, position) => ({
                position,
                item: {
                  create: {
                    ...item,
                    userId,
                    itemTypeId: resolveTypeId(typeIds, typeSlug),
                    pinnedAt: pinned ? pinnedAt.get(item.title) : undefined,
                    tags: {
                      create: tags.map((name) => ({
                        tagId: resolveTagId(tagIds, name),
                      })),
                    },
                  },
                },
              })),
            },
          },
        });
      }
      return tagIds.size;
    },
    { timeout: 30_000 },
  );

  const itemCount = DEMO_COLLECTIONS.reduce((sum, c) => sum + c.items.length, 0);
  const favoriteCount = DEMO_COLLECTIONS.filter((c) => c.isFavorite).length;
  console.log(
    `demo content — collections: ${DEMO_COLLECTIONS.length} (favorites: ${favoriteCount}), items: ${itemCount}, tags: ${tagCount}, pinned: ${pinnedAt.size}`,
  );
}

async function main(): Promise<void> {
  const typeIds = await seedSystemItemTypes();

  if (!SEED_DEMO) {
    console.log("demo data skipped — set SEED_DEMO=1 to seed it");
    return;
  }

  const userId = await seedDemoUser();
  await seedDemoCollections(userId, typeIds);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

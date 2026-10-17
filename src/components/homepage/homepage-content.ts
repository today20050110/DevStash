import {
  AppWindow,
  Bookmark,
  Code,
  File,
  FileText,
  Folder,
  Search,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { ComponentType } from "react";

import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { NotionIcon, SlackIcon, VSCodeIcon } from "@/components/homepage/BrandIcons";

export type HomeAccent = "snippet" | "prompt" | "command" | "note" | "file" | "image" | "url";

interface AccentClasses {
  text: string;
  dot: string;
  softBg: string;
  topBorder: string;
  hoverRing: string;
}

// Tailwind 只認得原始碼裡完整出現的 class 名稱，所以每個型別的 class 都要逐字列出
export const ACCENT_CLASSES: Record<HomeAccent, AccentClasses> = {
  snippet: {
    text: "text-home-snippet",
    dot: "bg-home-snippet",
    softBg: "bg-home-snippet/15",
    topBorder: "border-t-home-snippet",
    hoverRing: "hover:ring-home-snippet/55",
  },
  prompt: {
    text: "text-home-prompt",
    dot: "bg-home-prompt",
    softBg: "bg-home-prompt/15",
    topBorder: "border-t-home-prompt",
    hoverRing: "hover:ring-home-prompt/55",
  },
  command: {
    text: "text-home-command",
    dot: "bg-home-command",
    softBg: "bg-home-command/15",
    topBorder: "border-t-home-command",
    hoverRing: "hover:ring-home-command/55",
  },
  note: {
    text: "text-home-note",
    dot: "bg-home-note",
    softBg: "bg-home-note/15",
    topBorder: "border-t-home-note",
    hoverRing: "hover:ring-home-note/55",
  },
  file: {
    text: "text-home-file",
    dot: "bg-home-file",
    softBg: "bg-home-file/15",
    topBorder: "border-t-home-file",
    hoverRing: "hover:ring-home-file/55",
  },
  image: {
    text: "text-home-image",
    dot: "bg-home-image",
    softBg: "bg-home-image/15",
    topBorder: "border-t-home-image",
    hoverRing: "hover:ring-home-image/55",
  },
  url: {
    text: "text-home-url",
    dot: "bg-home-url",
    softBg: "bg-home-url/15",
    topBorder: "border-t-home-url",
    hoverRing: "hover:ring-home-url/55",
  },
};

export interface HomeLink {
  label: string;
  href: string;
}

export interface NavAction extends HomeLink {
  variant: "primary" | "ghost";
}

export interface HomeLinks {
  navActions: NavAction[];
  start: HomeLink;
  planHref: string;
  account: HomeLink[];
}

const DASHBOARD: HomeLink = { label: "Dashboard", href: "/dashboard" };
const SIGN_IN: HomeLink = { label: "Sign In", href: "/sign-in" };
const REGISTER: HomeLink = { label: "Get Started", href: "/register" };

// 登入與否只在這裡分支，各區塊拿到的都是已決定好的連結
export function getHomeLinks(isSignedIn: boolean): HomeLinks {
  if (isSignedIn) {
    return {
      navActions: [{ ...DASHBOARD, variant: "primary" }],
      start: { label: "Go to Dashboard", href: DASHBOARD.href },
      planHref: DASHBOARD.href,
      account: [DASHBOARD],
    };
  }
  return {
    navActions: [
      { ...SIGN_IN, variant: "ghost" },
      { ...REGISTER, variant: "primary" },
    ],
    start: { label: "Get Started Free", href: REGISTER.href },
    planHref: REGISTER.href,
    account: [SIGN_IN, REGISTER],
  };
}

export const SECTION_LINKS: HomeLink[] = [
  { label: "Features", href: "#features" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
];

export const NAV_SECTION_LINKS = SECTION_LINKS.filter((link) => link.label !== "AI");

export interface ChaosIcon {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
}

export const CHAOS_ICONS: ChaosIcon[] = [
  { label: "Notion", Icon: NotionIcon, color: "text-neutral-100" },
  { label: "GitHub", Icon: GitHubIcon, color: "text-slate-300" },
  { label: "Slack", Icon: SlackIcon, color: "text-rose-500" },
  { label: "VS Code", Icon: VSCodeIcon, color: "text-sky-400" },
  { label: "Browser tabs", Icon: AppWindow, color: "text-amber-400" },
  { label: "Terminal", Icon: Terminal, color: "text-green-400" },
  { label: "Text file", Icon: FileText, color: "text-indigo-300" },
  { label: "Bookmarks", Icon: Bookmark, color: "text-red-400" },
];

export const PREVIEW_NAV: { label: string; accent: HomeAccent }[] = [
  { label: "Snippets", accent: "snippet" },
  { label: "Prompts", accent: "prompt" },
  { label: "Commands", accent: "command" },
  { label: "Notes", accent: "note" },
  { label: "Files", accent: "file" },
  { label: "Images", accent: "image" },
  { label: "Links", accent: "url" },
];

export const PREVIEW_CARDS: { title: string; accent: HomeAccent }[] = [
  { title: "useDebounce hook", accent: "snippet" },
  { title: "Code review prompt", accent: "prompt" },
  { title: "git reset --soft", accent: "command" },
  { title: "Deploy checklist", accent: "note" },
  { title: "Architecture.png", accent: "image" },
  { title: "Tailwind docs", accent: "url" },
];

export interface Feature {
  title: string;
  description: string;
  Icon: LucideIcon;
  accent: HomeAccent;
}

export const FEATURES: Feature[] = [
  {
    title: "Code Snippets",
    description: "Store reusable code with syntax highlighting for every language you write.",
    Icon: Code,
    accent: "snippet",
  },
  {
    title: "AI Prompts",
    description: "Keep your best prompts, system messages and context blocks ready to paste.",
    Icon: Sparkles,
    accent: "prompt",
  },
  {
    title: "Instant Search",
    description: "One keystroke searches titles, content, tags and types across your whole stash.",
    Icon: Search,
    accent: "url",
  },
  {
    title: "Commands",
    description: "Never dig through shell history again. Save the commands you always forget.",
    Icon: Terminal,
    accent: "command",
  },
  {
    title: "Files & Docs",
    description: "Upload config files, templates and docs next to the snippets that use them.",
    Icon: File,
    accent: "file",
  },
  {
    title: "Collections",
    description: "Group related items by project or topic and keep any item in many collections.",
    Icon: Folder,
    accent: "image",
  },
];

export const AI_CAPABILITIES = [
  "Auto-generated tags for every item",
  "One-click summaries of long notes and files",
  "Plain-English explanations of code snippets",
  "Prompt optimization for clearer AI results",
];

export const AI_TAGS = ["react", "hooks", "typescript", "debounce", "performance"];

export const FREE_PLAN = {
  name: "Free",
  price: "$0",
  period: "/forever",
  note: "For trying DevStash out.",
  cta: "Get Started",
  features: [
    "50 items",
    "3 collections",
    "All text types: snippets, prompts, commands, notes, links",
    "Instant search",
  ],
};

export const PRO_PLAN = {
  name: "Pro",
  cta: "Upgrade to Pro",
  prices: {
    monthly: { price: "$8", period: "/month", note: "Billed monthly. Cancel anytime." },
    yearly: { price: "$72", period: "/year", note: "Just $6/month, billed yearly." },
  },
  features: [
    "Unlimited items",
    "Unlimited collections",
    "File & image uploads",
    "AI tags, summaries & explanations",
    "JSON / ZIP export",
    "Priority support",
  ],
};

export type BillingPeriod = keyof typeof PRO_PLAN.prices;

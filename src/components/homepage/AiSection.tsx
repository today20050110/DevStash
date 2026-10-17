import { Sparkles } from "lucide-react";

import { CheckList } from "@/components/homepage/CheckList";
import { AI_CAPABILITIES, AI_TAGS } from "@/components/homepage/homepage-content";
import { Reveal } from "@/components/homepage/Reveal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// 標籤在編輯器淡入後依序出現；Tailwind 需要完整的 class 名稱，所以逐一列出
const TAG_DELAYS = ["delay-500", "delay-700", "delay-900", "delay-1100", "delay-1300"];

const CODE_SAMPLE = `export function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}`;

function EditorMockup() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2 border-b bg-muted px-4 py-3">
        <span className="size-2.75 rounded-full bg-[#ff5f57]" />
        <span className="size-2.75 rounded-full bg-[#febc2e]" />
        <span className="size-2.75 rounded-full bg-[#28c840]" />
        <span className="ml-2 font-mono text-xs text-muted-foreground">useDebounce.ts</span>
      </div>
      <pre className="scrollbar-subtle m-0 overflow-x-auto p-5 font-mono text-[13px] leading-relaxed text-foreground/85">
        <code>{CODE_SAMPLE}</code>
      </pre>
      <div className="border-t px-5 pt-4 pb-5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-home-prompt">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI Generated Tags
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {AI_TAGS.map((tag, index) => (
            <span
              key={tag}
              className={cn(
                "translate-y-1.5 scale-95 rounded-full border bg-muted px-2.5 py-0.5 font-mono text-xs opacity-0 transition-[opacity,translate,scale] duration-300",
                "group-data-[visible=true]/reveal:translate-y-0 group-data-[visible=true]/reveal:scale-100 group-data-[visible=true]/reveal:opacity-100",
                "motion-reduce:translate-y-0 motion-reduce:scale-100 motion-reduce:opacity-100",
                TAG_DELAYS[index],
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AiSection() {
  return (
    <section id="ai" className="scroll-mt-16 border-y bg-card/40 py-18 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
        <Reveal className="min-w-0">
          <Badge className="mb-4 h-auto border-home-prompt/35 bg-home-prompt/12 px-3 py-1 tracking-wide text-home-prompt uppercase">
            Pro Feature
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Let AI do the filing</h2>
          <p className="mt-4 text-[17px] text-muted-foreground">
            DevStash reads what you save and keeps it organized, so you can stay in flow.
          </p>
          <CheckList items={AI_CAPABILITIES} className="mt-7" />
        </Reveal>
        {/* min-w-0：讓 <pre> 的長行在框內捲動，而不是把 grid 欄位撐寬 */}
        <Reveal className="min-w-0">
          <EditorMockup />
        </Reveal>
      </div>
    </section>
  );
}

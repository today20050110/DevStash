import { ACCENT_CLASSES, FEATURES } from "@/components/homepage/homepage-content";
import { Reveal } from "@/components/homepage/Reveal";
import { SectionHeading } from "@/components/homepage/SectionHeading";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FeaturesSection() {
  return (
    <section id="features" className="scroll-mt-16 py-18 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="Everything you reach for, in one place"
            subtitle="Save it once. Find it again in three seconds."
          />
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ title, description, Icon, accent }) => {
            const colors = ACCENT_CLASSES[accent];
            return (
              <Reveal key={title}>
                <Card
                  className={cn(
                    "h-full gap-0 px-7 py-7 transition-[translate,box-shadow] duration-300 hover:-translate-y-0.75",
                    colors.hoverRing,
                  )}
                >
                  <div
                    className={cn(
                      "mb-5 grid size-11 place-items-center rounded-lg",
                      colors.softBg,
                      colors.text,
                    )}
                  >
                    <Icon className="size-5.5" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-2.5 text-[15px] text-muted-foreground">{description}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

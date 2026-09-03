import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  body,
  center = true,
  light = false,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className="eyebrow">{eyebrow}</p>
      <h2
        className={cn(
          "mt-3 font-display text-3xl font-semibold sm:text-4xl",
          light ? "text-ivory" : "text-foreground",
        )}
      >
        {title}
      </h2>
      {body && (
        <p className={cn("mt-4 text-sm leading-relaxed", light ? "text-ivory/70" : "text-muted-foreground")}>
          {body}
        </p>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "success" | "held" | "danger" | "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tone === "neutral" && "bg-muted text-ink-soft",
        tone === "success" && "bg-mint text-mint-ink",
        tone === "held" && "bg-amber text-amber-ink",
        tone === "danger" && "bg-[#fdecea] text-danger",
        tone === "primary" && "bg-[#E8EEF8] text-primary",
        className,
      )}
      {...props}
    />
  );
}

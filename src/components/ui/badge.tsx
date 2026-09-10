import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: "neutral" | "success" | "held" | "danger" | "primary" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold tracking-wide uppercase",
        tone === "neutral" && "bg-muted text-muted-foreground",
        tone === "success" && "bg-[#e8f5ee] text-success",
        tone === "held" && "bg-[#fff4ed] text-held",
        tone === "danger" && "bg-[#fdecea] text-danger",
        tone === "primary" && "bg-[#e6f3ef] text-primary",
        className,
      )}
      {...props}
    />
  );
}

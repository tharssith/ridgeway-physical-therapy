import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-[18px] border border-line bg-card text-ink", className)}
      {...props}
    />
  );
}

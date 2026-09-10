import { initials } from "@/lib/utils";
import { cn } from "@/lib/utils";

export function TherapistAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#dcebe6] font-semibold text-primary",
        size === "sm" && "h-10 w-10 text-sm",
        size === "md" && "h-14 w-14 text-base",
        size === "lg" && "h-20 w-20 text-xl",
      )}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

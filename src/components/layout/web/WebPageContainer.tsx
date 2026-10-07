import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type WebPageContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: "default" | "wide" | "narrow" | "full";
};

const sizeClassName = {
  default: "max-w-6xl",
  wide: "max-w-[1600px]",
  narrow: "max-w-4xl",
  full: "max-w-none",
};

export function WebPageContainer({
  children,
  className,
  size = "wide",
  ...props
}: WebPageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full min-w-0 max-w-full space-y-6 px-4 py-5 sm:px-6 sm:py-6", sizeClassName[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}

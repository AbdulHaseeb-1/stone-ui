import * as React from "react";
import { cn } from "../utils/cn";

export type NeonBorderProps = React.HTMLAttributes<HTMLDivElement> & {
  glowColor?: string;
};

export const NeonBorder = React.forwardRef<HTMLDivElement, NeonBorderProps>(
  ({ className, glowColor = "#6ee7ff", style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("stone-neon-border", className)}
        style={{ ...style, ["--stone-neon-color" as const]: glowColor }}
        {...props}
      />
    );
  }
);

NeonBorder.displayName = "NeonBorder";

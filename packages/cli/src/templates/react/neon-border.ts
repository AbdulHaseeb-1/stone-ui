export function neonBorderTemplate(language: "ts" | "js"): string {
  if (language === "js") {
    return `import * as React from "react";

import { cn } from "../../utils/cn";

const NeonBorder = React.forwardRef(function NeonBorder({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "stone-neon-border relative rounded-xl border border-transparent bg-white p-6 shadow-lg",
        className
      )}
      {...props}
    />
  );
});

NeonBorder.displayName = "NeonBorder";

export { NeonBorder };
`;
  }

  return `import * as React from "react";

import { cn } from "../../utils/cn";

export type NeonBorderProps = React.HTMLAttributes<HTMLDivElement>;

const NeonBorder = React.forwardRef<HTMLDivElement, NeonBorderProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "stone-neon-border relative rounded-xl border border-transparent bg-white p-6 shadow-lg",
        className
      )}
      {...props}
    />
  );
});

NeonBorder.displayName = "NeonBorder";

export { NeonBorder };
`;
}

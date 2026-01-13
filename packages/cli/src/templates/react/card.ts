export function cardTemplate(language: "ts" | "js"): string {
  if (language === "js") {
    return `import * as React from "react";

import { cn } from "../../utils/cn";

const Card = React.forwardRef(function Card({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={cn("stone-card rounded-lg border bg-white p-6 shadow-sm", className)}
      {...props}
    />
  );
});

Card.displayName = "Card";

export { Card };
`;
  }

  return `import * as React from "react";

import { cn } from "../../utils/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("stone-card rounded-lg border bg-white p-6 shadow-sm", className)}
      {...props}
    />
  );
});

Card.displayName = "Card";

export { Card };
`;
}

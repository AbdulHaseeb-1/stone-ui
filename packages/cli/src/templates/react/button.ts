export function buttonTemplate(language: "ts" | "js"): string {
  if (language === "js") {
    return `import * as React from "react";

import { cn } from "../../utils/cn";

const Button = React.forwardRef(function Button({ className, ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "stone-button inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button };
`;
  }

  return `import * as React from "react";

import { cn } from "../../utils/cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "stone-button inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
        className
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button };
`;
}

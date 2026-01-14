import * as React from "react";
import { cn } from "../utils/cn";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "solid", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "stone-button",
          variant === "outline" && "stone-button--outline",
          variant === "ghost" && "stone-button--ghost",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

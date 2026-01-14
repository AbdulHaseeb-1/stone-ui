import * as React from "react";
import { cn } from "../utils/cn";

export const Button = React.forwardRef(function Button(
  { className, variant = "solid", ...props },
  ref
) {
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
});

Button.displayName = "Button";

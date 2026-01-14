import * as React from "react";
import { cn } from "../utils/cn";

export const Card = React.forwardRef(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-slate-800 bg-slate-950 text-slate-100 p-5 shadow-sm",
        className
      )}
      {...props}
    />
  );
});

Card.displayName = "Card";

export const CardHeader = React.forwardRef(function CardHeader(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("text-lg font-semibold", className)} {...props} />
  );
});

CardHeader.displayName = "CardHeader";

export const CardBody = React.forwardRef(function CardBody(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("text-slate-200/80", className)} {...props} />
  );
});

CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef(function CardFooter(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("mt-4 flex flex-wrap gap-2", className)} {...props} />
  );
});

CardFooter.displayName = "CardFooter";

import * as React from "react";
import { cn } from "../utils/cn";

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("stone-card", className)} {...props} />;
  }
);

Card.displayName = "Card";

export type CardSectionProps = React.HTMLAttributes<HTMLDivElement>;

export const CardHeader = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("stone-card__header", className)} {...props} />
    );
  }
);

CardHeader.displayName = "CardHeader";

export const CardBody = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("stone-card__body", className)} {...props} />
    );
  }
);

CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef<HTMLDivElement, CardSectionProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("stone-card__footer", className)} {...props} />
    );
  }
);

CardFooter.displayName = "CardFooter";

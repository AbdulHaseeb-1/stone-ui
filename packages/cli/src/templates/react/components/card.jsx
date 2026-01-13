import * as React from "react";
import { cn } from "../utils/cn";

export const Card = React.forwardRef(function Card(
  { className, ...props },
  ref
) {
  return <div ref={ref} className={cn("stone-card", className)} {...props} />;
});

Card.displayName = "Card";

export const CardHeader = React.forwardRef(function CardHeader(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("stone-card__header", className)} {...props} />
  );
});

CardHeader.displayName = "CardHeader";

export const CardBody = React.forwardRef(function CardBody(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("stone-card__body", className)} {...props} />
  );
});

CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef(function CardFooter(
  { className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn("stone-card__footer", className)} {...props} />
  );
});

CardFooter.displayName = "CardFooter";

// packages/core/src/components/button/ButtonBlueprint.ts
import { ComponentBlueprint, type RenderContext } from "../blueprints/ComponentBlueprint.js";
import { h, type Node } from "../composition/Node.js";

export type ButtonProps = {
  intent?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;

  // Recommended additions for usability:
  className?: string;
  children?: Array<Node | string> | string;
};

export class ButtonBlueprint extends ComponentBlueprint<ButtonProps> {
  readonly name = "Button";

  readonly variants = {
    intent: ["primary", "outline"],
    size: ["sm", "md", "lg"],
  } as const;

  readonly defaultProps: Partial<ButtonProps> = {
    intent: "primary",
    size: "md",
  };

  render(rawProps: ButtonProps, _ctx: RenderContext): Node {
    const p = this.resolveProps(rawProps);

    const base =
      "inline-flex items-center justify-center rounded-md font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

    const intentClass: Record<NonNullable<ButtonProps["intent"]>, string> = {
      primary: "bg-black text-white hover:bg-black/90",
      outline: "border border-neutral-300 hover:bg-neutral-100",
    };

    const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    const className = [
      base,
      intentClass[p.intent ?? "primary"],
      sizeClass[p.size ?? "md"],
      p.className,
    ]
      .filter(Boolean)
      .join(" ");

    const children =
      typeof p.children === "string"
        ? [p.children]
        : Array.isArray(p.children) && p.children.length > 0
          ? p.children
          : ["Button"];

    return h(
      "button",
      {
        type: "button",
        className,
        disabled: Boolean(p.disabled),
      },
      children,
      { slot: "root", name: "ButtonRoot" }
    );
  }
}

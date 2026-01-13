// packages/core/src/blueprint/ComponentBlueprint.ts
import type { Node, Props } from "../composition/Node.js";

export type VariantMap = Record<string, string | number | boolean | undefined>;
export type RenderContext = {
  /**
   * Space for tokens, theme, direction, density, motion prefs, etc.
   */
  tokens?: Record<string, unknown>;
};

export abstract class ComponentBlueprint<TProps extends Props = Props> {
  abstract readonly name: string;

  /**
   * Optional: allowed variants (size, intent, etc.). Kept minimal here.
   */
  readonly variants?: Record<string, readonly string[]>;

  /**
   * Optional: default props.
   */
  readonly defaultProps?: Partial<TProps>;

  /**
   * Build a framework-agnostic Node tree.
   * React/Vue/Svelte adapters will render this Node tree.
   */
  abstract render(props: TProps, ctx: RenderContext): Node;

  /**
   * Merge props with defaults (basic utility).
   */
  resolveProps(props: TProps): TProps {
    return { ...(this.defaultProps ?? {}), ...(props ?? {}) } as TProps;
  }
}

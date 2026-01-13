// packages/core/src/composition/Node.ts
export type Props = Record<string, unknown>;

export type NodeType =
  | "element"      // a host element, like "button" / "div" (framework-agnostic tag)
  | "component"    // a named component (optional; often you only need "element")
  | "fragment";    // group of children

export interface Node {
  type: NodeType;

  /**
   * For type="element": tag = "button" | "div" | ...
   * For type="component": tag = a component key/name (resolved by adapter if you want)
   * For type="fragment": tag is unused
   */
  tag?: string;

  props?: Props;

  /**
   * "slots" help you attach structure without hardcoding children positions.
   * Minimal version: treat it as children, and wrappers can wrap root slot.
   */
  children?: Array<Node | string>;

  /**
   * Metadata useful for wrappers / debugging / ordering.
   */
  meta?: {
    id?: string;
    name?: string;
    slot?: string; // e.g. "root"
  };
}

export const h = (
  tag: string,
  props: Props = {},
  children: Array<Node | string> = [],
  meta: Node["meta"] = {}
): Node => ({
  type: "element",
  tag,
  props,
  children,
  meta,
});

export const fragment = (children: Array<Node | string> = []): Node => ({
  type: "fragment",
  children,
});

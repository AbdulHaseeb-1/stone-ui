import * as React from "react";
import type { Node } from "@oxitron-ui/core";

export interface ReactHostAdapter {
  toReactNode(node: Node | string): React.ReactNode;
}

export class DefaultReactHostAdapter implements ReactHostAdapter {
  toReactNode(node: Node | string): React.ReactNode {
    if (typeof node === "string") return node;

    // Convert children first
    const children = (node.children ?? []).map((c) => this.toReactNode(c));

    if (node.type === "fragment") {
      return React.createElement(React.Fragment, null, ...children);
    }

    // For minimal v1: treat "element" and "component" as host elements by tag
    const tag = node.tag ?? "div";
    const props = normalizeProps(node.props ?? {}, node);

    return React.createElement(tag, props, ...children);
  }
}

/**
 * Normalizes core props to React props:
 * - class -> className (if user accidentally sets class)
 * - onClick, etc passed through as-is
 * - attaches a stable key when present in meta.id (optional)
 */
function normalizeProps(
  raw: Record<string, unknown>,
  node: Node
): Record<string, unknown> {
  const props: Record<string, unknown> = { ...raw };

  // Normalize class/className
  if (props.class && !props.className) {
    props.className = props.class;
    delete props.class;
  }

  // Optional: key support (React uses it only in arrays)
  if (node.meta?.id && props.key == null) {
    props.key = node.meta.id;
  }

  // Optional: data attributes / debug
  if (node.meta?.name && props["data-stone"] == null) {
    props["data-stone"] = node.meta.name;
  }

  return props;
}

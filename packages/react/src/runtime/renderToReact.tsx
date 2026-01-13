import * as React from "react";
import { ComponentBlueprint, RenderContext, Node } from "@stone-ui/core";
import { DefaultReactHostAdapter, type ReactHostAdapter } from "../adapter/ReactHostAdapter.js";

// Optional wrapper support (future-ready). If you already have wrappers, keep this.
// export type WrapperUse<TOptions = unknown> = {
//   // wrapper: WrapperDecorator<TOptions>;
//   // options: TOptions;
//   // For now keep placeholder to avoid coupling until you add wrappers in react package.
// };

export type RenderOptions = {
  ctx?: RenderContext;
  // wrappers?: Array<WrapperUse>;
  adapter?: ReactHostAdapter;
};

/**
 * Render a core blueprint into React nodes.
 * This is the "bridge" between @stone-ui/core and React.
 */
export function renderToReact<TProps extends Record<string, unknown>>(
  blueprint: ComponentBlueprint<TProps>,
  props: TProps,
  options: RenderOptions = {}
): React.ReactNode {
  const ctx = options.ctx ?? {};
  const adapter = options.adapter ?? new DefaultReactHostAdapter();

  // 1) Core render -> Node tree
  let node: Node = blueprint.render(blueprint.resolveProps(props), ctx);

  // 2) Wrappers pipeline (add later)
  // if (options.wrappers?.length) {
  //   const wrappers = options.wrappers.slice().sort((a, b) => a.wrapper.priority - b.wrapper.priority);
  //   for (const w of wrappers) {
  //     if (w.wrapper.isCompatible(node)) {
  //       node = w.wrapper.wrap(node, w.options, { tokens: ctx.tokens });
  //     }
  //   }
  // }

  // 3) Node -> React
  return adapter.toReactNode(node);
}

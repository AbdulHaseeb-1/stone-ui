import * as React from "react";
import { ButtonBlueprint, type ButtonProps } from "@store-uii/core";
import { renderToReact } from "../runtime/renderToReact.js";

const blueprint = new ButtonBlueprint();

export function Button(props: ButtonProps): React.ReactElement {
  return renderToReact(blueprint, props) as React.ReactElement;
}

export type { ButtonProps };

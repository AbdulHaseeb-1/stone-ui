# Stone UI

Framework-agnostic component blueprints with a React adapter.

## Packages
- `@store-uii/core`: blueprint definitions and node composition utilities.
- `@store-uii/react`: React renderer and primitives.

## Install
```bash
pnpm add @store-uii/react @store-uii/styles
```

## Usage (React)
```tsx
import "@store-uii/styles/dist/stone.css";
import { Button } from "@store-uii/react";

export function Example() {
  return (
    <Button intent="outline" size="lg">
      Click me
    </Button>
  );
}
```

## Usage (Blueprint -> React)
```tsx
import * as React from "react";
import { ButtonBlueprint } from "@store-uii/core";
import { renderToReact } from "@store-uii/react";

const blueprint = new ButtonBlueprint();

export function Example() {
  return renderToReact(blueprint, { intent: "primary", children: "Save" });
}
```

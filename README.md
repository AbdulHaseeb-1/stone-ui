# Stone UI

Framework-agnostic component blueprints with a React adapter.

## Packages
- `@stone-ui/core`: blueprint definitions and node composition utilities.
- `@stone-ui/react`: React renderer and primitives.

## Install
```bash
pnpm add @stone-ui/react @stone-ui/styles
```

## Usage (React)
```tsx
import "@stone-ui/styles/dist/stone.css";
import { Button } from "@stone-ui/react";

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
import { ButtonBlueprint } from "@stone-ui/core";
import { renderToReact } from "@stone-ui/react";

const blueprint = new ButtonBlueprint();

export function Example() {
  return renderToReact(blueprint, { intent: "primary", children: "Save" });
}
```

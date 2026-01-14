# Brick UI (Stone UI)

Framework-agnostic component blueprints with a React adapter and Tailwind-first styling.

Brick UI lets you compose UI from blueprints in any runtime, then render them through the adapter of your choice. Today, React is supported out of the box.

## Highlights
- Blueprint-driven primitives with predictable variants.
- React adapter with ergonomic components.
- Tailwind utility classes for styling (no runtime CSS package).
- CLI for scaffolding components into existing apps.

## Packages
- `@brick-ui/core`: blueprint definitions and node composition utilities.
- `@brick-ui/react`: React renderer and primitives.
- `@brick-ui/cli`: project initializer and component generator.

## Requirements
- React 18+ (for the React adapter).
- Tailwind CSS configured in your app (components use Tailwind classes).

## Install
```bash
pnpm add @brick-ui/react
```

## Quick Start (React)
```tsx
import { Button } from "@brick-ui/react";

export function Example() {
  return (
    <Button intent="outline" size="lg">
      Click me
    </Button>
  );
}
```

## Tailwind Setup
Ensure Tailwind is installed and your global CSS imports it:
```css
@import "tailwindcss";
```

Typical file locations:
- Next.js App Router: `app/globals.css`
- Next.js Pages Router: `styles/globals.css`
- Vite / CRA: `src/index.css`

## CLI (ShadCN-style)
Initialize and add components to an existing project:
```bash
npx @brick-ui/cli init
npx @brick-ui/cli add button
npx @brick-ui/cli add card
npx @brick-ui/cli add neon-border
```

## Examples

### Button
```tsx
import { Button } from "@brick-ui/react";

export function Example() {
  return (
    <div className="flex gap-3">
      <Button intent="primary">Save</Button>
      <Button intent="outline">Cancel</Button>
    </div>
  );
}
```

### Card
```tsx
import { Card, CardBody, CardFooter, CardHeader } from "@brick-ui/react";

export function Example() {
  return (
    <Card className="max-w-md">
      <CardHeader>Project Alpha</CardHeader>
      <CardBody>Ship quality components with predictable APIs.</CardBody>
      <CardFooter>
        <Button intent="primary">Open</Button>
        <Button intent="outline">Archive</Button>
      </CardFooter>
    </Card>
  );
}
```

### Neon Border Wrapper
```tsx
import { NeonBorder } from "@brick-ui/react";

export function Example() {
  return (
    <NeonBorder glowColor="#38bdf8">
      <div className="text-sm">Highlight a feature or status.</div>
    </NeonBorder>
  );
}
```

## Blueprint Usage (Core -> React)
```tsx
import * as React from "react";
import { ButtonBlueprint } from "@brick-ui/core";
import { renderToReact } from "@brick-ui/react";

const blueprint = new ButtonBlueprint();

export function Example() {
  return renderToReact(blueprint, { intent: "primary", children: "Save" });
}
```

## Contributing
PRs are welcome. If you are adding a component:
1) Update the manifest in `packages/cli/src/registry/manifest.ts`.
2) Add TSX and JSX templates in `packages/cli/src/templates/react/components`.
3) Add coverage in `__tests__/react/react-test`.

## License
ISC

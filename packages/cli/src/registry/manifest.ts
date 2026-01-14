export type Framework = "react";
export type ComponentKind = "primitive" | "wrapper";
export type Language = "ts" | "js";

export type ComponentTemplate = {
  tsx: string;
  jsx: string;
};

export type ComponentManifestEntry = {
  name: string;
  description: string;
  framework: Framework;
  kind: ComponentKind;
  templates: ComponentTemplate;
  requires: Array<"cn">;
  exports: {
    values: string[];
    types: string[];
  };
};

export const componentManifest: ComponentManifestEntry[] = [
  {
    name: "button",
    description: "Accessible button primitive with variants.",
    framework: "react",
    kind: "primitive",
    templates: {
      tsx: "components/button.tsx",
      jsx: "components/button.jsx",
    },
    requires: ["cn"],
    exports: {
      values: ["Button"],
      types: ["ButtonProps"],
    },
  },
  {
    name: "card",
    description: "Card primitive with header/body/footer slots.",
    framework: "react",
    kind: "primitive",
    templates: {
      tsx: "components/card.tsx",
      jsx: "components/card.jsx",
    },
    requires: ["cn"],
    exports: {
      values: ["Card", "CardHeader", "CardBody", "CardFooter"],
      types: ["CardProps", "CardSectionProps"],
    },
  },
  {
    name: "neon-border",
    description: "Neon border wrapper for emphasis.",
    framework: "react",
    kind: "wrapper",
    templates: {
      tsx: "components/neon-border.tsx",
      jsx: "components/neon-border.jsx",
    },
    requires: ["cn"],
    exports: {
      values: ["NeonBorder"],
      types: ["NeonBorderProps"],
    },
  },
];

export const componentManifestByName = new Map(
  componentManifest.map((entry) => [entry.name, entry])
);

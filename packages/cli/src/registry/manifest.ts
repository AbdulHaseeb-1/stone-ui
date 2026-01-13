import type { Framework } from "../commands/init.js";
import { barrelTemplate } from "../templates/react/barrel.js";
import { buttonTemplate } from "../templates/react/button.js";
import { cardTemplate } from "../templates/react/card.js";
import { cnTemplate } from "../templates/react/cn.js";
import { neonBorderTemplate } from "../templates/react/neon-border.js";

export type Language = "ts" | "js";

export type RegistryFile = {
  path: string;
  template: (language: Language) => string;
};

export type RegistryComponent = {
  name: string;
  exportName: string;
  kind: "primitive" | "wrapper";
  description: string;
  requiresCn: boolean;
  files: RegistryFile[];
};

export type Registry = {
  framework: Framework;
  components: Record<string, RegistryComponent>;
  barrelTemplate: (exportsList: string[]) => string;
  cnTemplate: (language: Language) => string;
};

export function getRegistry(framework: Framework): Registry {
  if (framework !== "react") {
    throw new Error(`Framework ${framework} is not supported yet.`);
  }

  return {
    framework,
    barrelTemplate,
    cnTemplate,
    components: {
      button: {
        name: "button",
        exportName: "Button",
        kind: "primitive",
        description: "Primary button primitive",
        requiresCn: true,
        files: [
          {
            path: "primitives/button/index.tsx",
            template: buttonTemplate,
          },
        ],
      },
      card: {
        name: "card",
        exportName: "Card",
        kind: "primitive",
        description: "Surface container",
        requiresCn: true,
        files: [
          {
            path: "primitives/card/index.tsx",
            template: cardTemplate,
          },
        ],
      },
      "neon-border": {
        name: "neon-border",
        exportName: "NeonBorder",
        kind: "wrapper",
        description: "Neon border wrapper",
        requiresCn: true,
        files: [
          {
            path: "wrappers/neon-border/index.tsx",
            template: neonBorderTemplate,
          },
        ],
      },
    },
  };
}

import * as fssync from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export function resolveTemplateRoot(importMetaUrl: string): string {
  const currentDir = path.dirname(fileURLToPath(importMetaUrl));
  const candidates = [
    path.resolve(currentDir, "../templates/react"),
    path.resolve(currentDir, "../../templates/react"),
    path.resolve(currentDir, "templates/react"),
  ];

  for (const candidate of candidates) {
    if (fssync.existsSync(candidate)) return candidate;
  }

  throw new Error(
    "Oxitron UI templates not found. Ensure templates are packaged with oxitron-ui."
  );
}

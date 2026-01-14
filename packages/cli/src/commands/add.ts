import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { componentManifestByName, type ComponentManifestEntry } from "../registry/manifest.js";
import { createProgress, log } from "../utils/terminal.js";
import { resolveTemplateRoot } from "../utils/templates.js";

type AddOptions = {
  cwd?: string;
  overwrite?: boolean;
  yes?: boolean;
  components: string[];
};

type StoneConfig = {
  schema: string;
  framework: string;
  language: "ts" | "js";
  paths: {
    outputDir: string;
    barrelFile: string;
    primitivesDir?: string;
    wrappersDir?: string;
    utilsDir?: string;
  };
};

const CONFIG_FILE = "brick-ui.config.json";

const TEMPLATE_ROOT = resolveTemplateRoot(import.meta.url);

export async function addCommand(options: AddOptions): Promise<void> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const progress = createProgress(4);
  const config = await loadConfig(cwd);
  progress.step("Loaded Stone UI config");

  if (config.framework !== "react") {
    throw new Error(
      `Unsupported framework "${config.framework}". Only React is supported today.`
    );
  }

  const language = config.language ?? (detectTS(cwd) ? "ts" : "js");
  const requested = Array.from(
    new Set(options.components.map((name) => name.trim()).filter(Boolean))
  );

  if (requested.length === 0) {
    throw new Error("Provide at least one component to add (e.g. button).");
  }

  const entries = resolveComponents(requested);
  progress.step("Resolved component manifest");

  const outputDir = config.paths.outputDir;
  const primitivesDir = config.paths.primitivesDir ?? path.posix.join(outputDir, "primitives");
  const wrappersDir = config.paths.wrappersDir ?? path.posix.join(outputDir, "wrappers");
  const utilsDir = config.paths.utilsDir ?? path.posix.join(outputDir, "utils");
  const barrelFile =
    config.paths.barrelFile ??
    path.posix.join(outputDir, `index.${language === "ts" ? "ts" : "js"}`);

  await ensureDirs(cwd, [outputDir, primitivesDir, wrappersDir, utilsDir]);
  progress.step("Ensured component directories");

  const overwrite = Boolean(options.overwrite);
  const componentExt = language === "ts" ? "tsx" : "jsx";
  const utilExt = language === "ts" ? "ts" : "js";

  const writtenFiles: string[] = [];
  const skippedFiles: string[] = [];

  const needsCn = entries.some((entry) => entry.requires.includes("cn"));
  if (needsCn) {
    const cnTemplate = readTemplate(
      path.join(TEMPLATE_ROOT, "utils", `cn.${utilExt}`)
    );
    const cnTarget = path.join(cwd, normalizeFs(utilsDir), `cn.${utilExt}`);
    await writeFileSafe(
      cwd,
      cnTarget,
      cnTemplate,
      overwrite,
      writtenFiles,
      skippedFiles
    );
  }

  for (const entry of entries) {
    const template = readTemplate(
      path.join(
        TEMPLATE_ROOT,
        entry.templates[language === "ts" ? "tsx" : "jsx"]
      )
    );
    const targetDir =
      entry.kind === "primitive" ? primitivesDir : wrappersDir;
    const targetFile = path.join(
      cwd,
      normalizeFs(targetDir),
      `${entry.name}.${componentExt}`
    );
    await writeFileSafe(
      cwd,
      targetFile,
      template,
      overwrite,
      writtenFiles,
      skippedFiles
    );
  }

  await updateBarrel(path.join(cwd, normalizeFs(barrelFile)), entries, language);
  progress.step("Updated barrel exports");

  progress.done("Completed");

  log.success("");
  log.success("[brick-ui:add] Done.");
  if (writtenFiles.length) {
    log.info("Created:");
    writtenFiles.forEach((file) => log.muted(`  - ${file}`));
  }
  if (skippedFiles.length) {
    log.warn("Skipped (already existed):");
    skippedFiles.forEach((file) => log.muted(`  - ${file}`));
    if (!overwrite) {
      log.warn("Re-run with --overwrite to replace existing files.");
    }
  }
}

async function loadConfig(cwd: string): Promise<StoneConfig> {
  const configPath = path.join(cwd, CONFIG_FILE);
  if (!fssync.existsSync(configPath)) {
    throw new Error(
      `Missing ${CONFIG_FILE}. Run "npx @brick-ui/cli init" first.`
    );
  }
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as StoneConfig;
}

function resolveComponents(names: string[]): ComponentManifestEntry[] {
  const missing = new Set<string>();
  const resolved = names.map((name) => {
    const entry = componentManifestByName.get(name);
    if (!entry) {
      missing.add(name);
      return null;
    }
    return entry;
  });

  if (missing.size > 0) {
    const available = Array.from(componentManifestByName.keys()).sort().join(", ");
    throw new Error(
      `Unknown component(s): ${Array.from(missing).join(", ")}. Available: ${available}`
    );
  }

  return resolved.filter((entry): entry is ComponentManifestEntry => entry !== null);
}

function detectTS(cwd: string): boolean {
  return fssync.existsSync(path.join(cwd, "tsconfig.json"));
}

async function ensureDirs(cwd: string, dirs: string[]): Promise<void> {
  for (const dir of dirs) {
    const abs = path.join(cwd, normalizeFs(dir));
    await fs.mkdir(abs, { recursive: true });
  }
}

function readTemplate(templatePath: string): string {
  return fssync.readFileSync(templatePath, "utf8");
}

async function writeFileSafe(
  cwd: string,
  targetPath: string,
  contents: string,
  overwrite: boolean,
  written: string[],
  skipped: string[]
): Promise<void> {
  if (fssync.existsSync(targetPath) && !overwrite) {
    skipped.push(path.relative(cwd, targetPath));
    return;
  }
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, contents, "utf8");
  written.push(path.relative(cwd, targetPath));
}

async function updateBarrel(
  barrelPath: string,
  entries: ComponentManifestEntry[],
  language: "ts" | "js"
): Promise<void> {
  const templatePath = path.join(
    TEMPLATE_ROOT,
    "barrel",
    `index.${language === "ts" ? "ts" : "js"}`
  );
  const baseTemplate = readTemplate(templatePath);

  const exportLines: string[] = [];
  for (const entry of entries) {
    const segment = entry.kind === "primitive" ? "primitives" : "wrappers";
    const rel = `./${segment}/${entry.name}`;
    entry.exports.values.forEach((name) => {
      exportLines.push(`export { ${name} } from "${rel}";`);
    });
    if (language === "ts") {
      entry.exports.types.forEach((name) => {
        exportLines.push(`export type { ${name} } from "${rel}";`);
      });
    }
  }

  const existing = fssync.existsSync(barrelPath)
    ? await fs.readFile(barrelPath, "utf8")
    : "";
  const existingLines = new Set(existing.split(/\r?\n/).map((line) => line.trim()));

  const newLines = exportLines.filter((line) => !existingLines.has(line.trim()));
  if (existing && newLines.length === 0) {
    return;
  }

  const mergedExports = existing
    ? `${existing.trimEnd()}\n${newLines.join("\n")}\n`
    : baseTemplate.replace("{{exports}}", newLines.join("\n")) + "\n";

  await fs.mkdir(path.dirname(barrelPath), { recursive: true });
  await fs.writeFile(barrelPath, mergedExports, "utf8");
}

function normalizeFs(p: string): string {
  return p.replace(/\//g, path.sep);
}

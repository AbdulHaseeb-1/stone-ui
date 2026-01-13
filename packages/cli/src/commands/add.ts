import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { createInterface } from "node:readline";
import type { StoneConfig } from "./init.js";
import { getRegistry, type Language } from "../registry/manifest.js";

type AddOptions = {
  cwd?: string;
  components: string[];
  overwrite?: boolean;
  yes?: boolean;
};

const CONFIG_FILE = "stone-ui.config.json";

const colors = {
  blue: (text: string) => `\u001b[34m${text}\u001b[0m`,
  green: (text: string) => `\u001b[32m${text}\u001b[0m`,
  yellow: (text: string) => `\u001b[33m${text}\u001b[0m`,
  red: (text: string) => `\u001b[31m${text}\u001b[0m`,
  gray: (text: string) => `\u001b[90m${text}\u001b[0m`,
};

function progressBar(step: number, total: number): string {
  const width = 20;
  const filled = Math.round((step / total) * width);
  const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
  return colors.blue(`[${bar}] ${step}/${total}`);
}

function logStep(step: number, total: number, message: string): void {
  console.log(`${progressBar(step, total)} ${message}`);
}

function logInfo(message: string): void {
  console.log(colors.gray(message));
}

function logSuccess(message: string): void {
  console.log(colors.green(message));
}

function logWarning(message: string): void {
  console.log(colors.yellow(message));
}

function logError(message: string): void {
  console.log(colors.red(message));
}

async function promptBoolean(question: string, defaultValue: boolean): Promise<boolean> {
  if (!process.stdin.isTTY) return defaultValue;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? "Y/n" : "y/N";
  const answer = await new Promise<string>((resolve) => {
    rl.question(`${question} (${suffix}) `, resolve);
  });
  rl.close();
  const normalized = answer.trim().toLowerCase();
  if (!normalized) return defaultValue;
  return normalized === "y" || normalized === "yes";
}

export async function addCommand(opts: AddOptions): Promise<void> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const yes = Boolean(opts.yes);
  const overwriteAll = Boolean(opts.overwrite);

  const config = await readConfig(cwd);
  const registry = getRegistry(config.framework);

  const requested = opts.components.map((component) => component.trim().toLowerCase());
  const unknown = requested.filter((name) => !registry.components[name]);

  if (unknown.length > 0) {
    throw new Error(`Unknown components: ${unknown.join(", ")}`);
  }

  const language: Language = config.eject.language;
  const outputDir = resolveFromCwd(cwd, config.paths.outputDir);
  const barrelFile = resolveFromCwd(cwd, config.paths.barrelFile);
  const utilsDir = resolveFromCwd(
    cwd,
    config.paths.utilsDir ?? `${config.paths.outputDir.replace(/\\/g, "/")}/utils`
  );

  const steps = 3;
  logStep(1, steps, "Preparing component generation");
  logInfo(`Output: ${normalizeToPosix(outputDir)}`);

  logStep(2, steps, "Writing component files");
  const exportStatements: string[] = [];
  let needsCn = false;

  for (const name of requested) {
    const component = registry.components[name];
    needsCn = needsCn || component.requiresCn;

    for (const file of component.files) {
      const relativePath = replaceExtension(file.path, language);
      const fullPath = path.join(outputDir, relativePath);
      const shouldWrite = await shouldWriteFile(fullPath, overwriteAll, yes);

      if (!shouldWrite) {
        logWarning(`Skipped existing file: ${normalizeToPosix(fullPath)}`);
        continue;
      }

      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file.template(language), "utf8");
      logSuccess(`Wrote ${normalizeToPosix(fullPath)}`);
    }

    exportStatements.push(`export { ${component.exportName} } from "./${component.kind}s/${component.name}";`);
  }

  if (needsCn) {
    const cnPath = path.join(utilsDir, `cn.${language === "ts" ? "ts" : "js"}`);
    const shouldWriteCn = await shouldWriteFile(cnPath, overwriteAll, yes);
    if (shouldWriteCn) {
      await fs.mkdir(path.dirname(cnPath), { recursive: true });
      await fs.writeFile(cnPath, registry.cnTemplate(language), "utf8");
      logSuccess(`Wrote ${normalizeToPosix(cnPath)}`);
    } else {
      logWarning(`Skipped existing file: ${normalizeToPosix(cnPath)}`);
    }
  }

  logStep(3, steps, "Updating barrel exports");
  await updateBarrel(barrelFile, exportStatements, registry.barrelTemplate);
  logSuccess("Stone UI add complete.");
}

async function readConfig(cwd: string): Promise<StoneConfig> {
  const configPath = path.join(cwd, CONFIG_FILE);
  if (!fssync.existsSync(configPath)) {
    throw new Error(`Missing ${CONFIG_FILE}. Run \"npx @stone-ui/cli init\" first.`);
  }
  const raw = await fs.readFile(configPath, "utf8");
  return JSON.parse(raw) as StoneConfig;
}

function resolveFromCwd(cwd: string, target: string): string {
  const segments = target.split("/");
  return path.join(cwd, ...segments);
}

function replaceExtension(filePath: string, language: Language): string {
  if (language === "js") {
    if (filePath.endsWith(".tsx")) return filePath.replace(/\.tsx$/, ".jsx");
    if (filePath.endsWith(".ts")) return filePath.replace(/\.ts$/, ".js");
  }
  return filePath;
}

async function shouldWriteFile(fullPath: string, overwriteAll: boolean, yes: boolean): Promise<boolean> {
  if (!fssync.existsSync(fullPath)) return true;
  if (overwriteAll) return true;
  if (!process.stdin.isTTY) return false;
  if (yes) return false;
  const allowOverwrite = await promptBoolean(`File exists at ${normalizeToPosix(fullPath)}. Overwrite?`, false);
  return allowOverwrite;
}

async function updateBarrel(
  barrelPath: string,
  exportStatements: string[],
  barrelTemplate: (exportsList: string[]) => string
): Promise<void> {
  const normalizedExports = exportStatements.sort();
  if (!fssync.existsSync(barrelPath)) {
    await fs.mkdir(path.dirname(barrelPath), { recursive: true });
    await fs.writeFile(barrelPath, barrelTemplate(normalizedExports), "utf8");
    logSuccess(`Created barrel: ${normalizeToPosix(barrelPath)}`);
    return;
  }

  const existing = await fs.readFile(barrelPath, "utf8");
  const lines = new Set(existing.split(/\r?\n/).map((line) => line.trim()).filter(Boolean));
  const next = [...lines];
  let updated = false;

  for (const statement of normalizedExports) {
    if (!lines.has(statement)) {
      next.push(statement);
      updated = true;
    }
  }

  if (updated) {
    const content = `${next.join("\n")}\n`;
    await fs.writeFile(barrelPath, content, "utf8");
    logSuccess(`Updated barrel: ${normalizeToPosix(barrelPath)}`);
  } else {
    logInfo("Barrel exports already up to date.");
  }
}

function normalizeToPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

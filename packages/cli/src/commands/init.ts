import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
export type Framework = "react" | "vue" | "svelte";
export type Mode = "runtime" | "hybrid";

export type ProjectType =
  | "next-app-router"
  | "next-pages-router"
  | "vite-react"
  | "cra"
  | "unknown";

type InitOptions = {
  cwd?: string;
  yes?: boolean;
  pm?: string;
  mode?: Mode;
  install?: boolean;
  patch?: boolean;
  overwriteConfig?: boolean;
};

export type StoneConfig = {
  schema: "stone-ui@1";
  mode: Mode;
  framework: Framework;
  projectType: ProjectType;
  paths: {
    outputDir: string;
    barrelFile: string;
    utilsDir: string;
  };
  styles: {
    strategy: "runtime" | "local";
    runtimeImport: string;
    localFile?: string;
    entryFile?: string;
  };
  eject: {
    language: "ts" | "js";
    includeUtils: boolean;
    includeWrappers: boolean;
    format: "prettier" | "none";
  };
  packageManager: PackageManager;
};

const CONFIG_FILE = "stone-ui.config.json";
const RUNTIME_DEPS = ["@stone-ui/styles"];
const STYLES_IMPORT = `import "@stone-ui/styles/dist/stone.css";`;

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

/**
 * Main initialization command that sets up Stone UI in a project
 */
export async function initCommand(opts: InitOptions): Promise<void> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const yes = Boolean(opts.yes);
  const mode: Mode = opts.mode === "hybrid" ? "hybrid" : "runtime";

  const pkgJsonPath = path.join(cwd, "package.json");

  if (!fssync.existsSync(pkgJsonPath)) {
    throw new Error(`No package.json found in ${cwd}. Run this inside a project root.`);
  }

  const pm = normalizePackageManager(opts.pm) ?? detectPackageManager(cwd);
  const framework = detectFramework(cwd);
  const projectType = detectProjectType(cwd, framework);
  const language = detectTS(cwd) ? "ts" : "js";

  const stylesEntry = detectStylesEntry(cwd, projectType, language);
  const styleStrategy: "runtime" | "local" = stylesEntry ? "runtime" : "local";
  const outputDir = "src/components/stone-ui";
  const utilsDir = path.posix.join(outputDir.replace(/\\/g, "/"), "utils");
  const barrelExt = language === "ts" ? "ts" : "js";
  const barrelFile = path.posix.join(outputDir.replace(/\\/g, "/"), `index.${barrelExt}`);
  const localStylesFile =
    styleStrategy === "local"
      ? path.posix.join(outputDir.replace(/\\/g, "/"), "stone-ui.css")
      : undefined;

  const config: StoneConfig = {
    schema: "stone-ui@1",
    mode,
    framework,
    projectType,
    paths: {
      outputDir,
      barrelFile,
      utilsDir,
    },
    styles: {
      strategy: styleStrategy,
      runtimeImport: "@stone-ui/styles/dist/stone.css",
      localFile: localStylesFile,
      entryFile: stylesEntry ? normalizeToPosix(stylesEntry) : undefined,
    },
    eject: {
      language,
      includeUtils: true,
      includeWrappers: true,
      format: "prettier",
    },
    packageManager: pm,
  };

  const steps = 4;
  logStep(1, steps, "Detecting project settings");
  logInfo(`Framework: ${framework}`);
  logInfo(`Project: ${projectType}`);
  logInfo(`Language: ${language}`);
  logInfo(`Package manager: ${pm}`);

  logStep(2, steps, "Writing Stone UI config");
  await writeConfig(cwd, config, Boolean(opts.overwriteConfig));
  if (config.styles.strategy === "local" && config.styles.localFile) {
    await ensureLocalStylesFile(cwd, config.styles.localFile);
  }

  const shouldInstall = opts.install !== false && (yes || (await promptBoolean("Install @stone-ui/styles?", true)));
  const shouldPatch = opts.patch !== false && (yes || (await promptBoolean("Patch entry file with CSS import?", true)));

  logStep(3, steps, "Installing dependencies");
  if (shouldInstall) {
    await installRuntimeDeps(cwd, pm, RUNTIME_DEPS);
  } else {
    logWarning("Skipped dependency install.");
  }

  logStep(4, steps, "Applying CSS import");
  if (shouldPatch) {
    if (!stylesEntry) {
      logWarning("Could not auto-detect entry file for CSS import.");
      printManualCssInstructions(projectType, config.styles.localFile);
    } else {
      const patched = await ensureStylesImport(cwd, stylesEntry);
      if (!patched) {
        logInfo(`Styles import already present: ${normalizeToPosix(stylesEntry)}`);
      } else {
        logSuccess(`Added styles import to: ${normalizeToPosix(stylesEntry)}`);
      }
    }
  } else {
    logWarning("Skipping patch. Showing manual CSS instructions.");
    printManualCssInstructions(projectType, config.styles.localFile);
  }

  console.log("");
  logSuccess("Stone UI init complete.");
  console.log(`- Mode: ${mode}`);
  console.log(`- Project: ${projectType}`);
  console.log(`- Package manager: ${pm}`);
  console.log(`- Config: ${CONFIG_FILE}`);
  console.log("");
  console.log("Next:");
  console.log("  npx @stone-ui/cli add button");
  console.log(`  // CSS: ${STYLES_IMPORT}`);
}

function normalizePackageManager(value?: string): PackageManager | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "pnpm" || v === "npm" || v === "yarn" || v === "bun") return v;
  return null;
}

function detectPackageManager(cwd: string): PackageManager {
  if (fssync.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fssync.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fssync.existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  if (fssync.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}

function detectTS(cwd: string): boolean {
  return fssync.existsSync(path.join(cwd, "tsconfig.json"));
}

function detectFramework(cwd: string): Framework {
  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) } as Record<string, string>;
    if (deps["vue"]) return "vue";
    if (deps["svelte"]) return "svelte";
  } catch (err) {
    logWarning(`Could not parse package.json: ${err}`);
  }
  return "react";
}

function detectProjectType(cwd: string, framework: Framework): ProjectType {
  if (framework !== "react") return "unknown";

  const hasNextConfig =
    fssync.existsSync(path.join(cwd, "next.config.js")) ||
    fssync.existsSync(path.join(cwd, "next.config.mjs")) ||
    fssync.existsSync(path.join(cwd, "next.config.ts"));

  if (hasNextConfig || fssync.existsSync(path.join(cwd, "node_modules", "next"))) {
    const hasAppDir =
      fssync.existsSync(path.join(cwd, "app")) ||
      fssync.existsSync(path.join(cwd, "src", "app"));
    if (hasAppDir) return "next-app-router";
    return "next-pages-router";
  }

  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) } as Record<string, string>;

    if (deps["vite"] && deps["react"]) return "vite-react";
    if (deps["react-scripts"]) return "cra";
  } catch (err) {
    logWarning(`Could not parse package.json: ${err}`);
  }

  return "unknown";
}

function detectStylesEntry(cwd: string, projectType: ProjectType, lang: "ts" | "js"): string | null {
  if (projectType === "next-app-router") {
    const candidates = [
      path.join(cwd, "app", `layout.${lang}x`),
      path.join(cwd, "src", "app", `layout.${lang}x`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  if (projectType === "next-pages-router") {
    const candidates = [
      path.join(cwd, "pages", `_app.${lang}x`),
      path.join(cwd, "src", "pages", `_app.${lang}x`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  if (projectType === "vite-react") {
    const candidates = [
      path.join(cwd, "src", `main.${lang}x`),
      path.join(cwd, "src", `main.${lang}`),
      path.join(cwd, "src", `index.${lang}x`),
      path.join(cwd, "src", `index.${lang}`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  if (projectType === "cra") {
    const candidates = [
      path.join(cwd, "src", `index.${lang}x`),
      path.join(cwd, "src", `index.${lang}`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  const common = [
    path.join(cwd, "src", `main.${lang}x`),
    path.join(cwd, "src", `index.${lang}x`),
    path.join(cwd, "src", `app.${lang}x`),
    path.join(cwd, "src", `main.${lang}`),
    path.join(cwd, "src", `index.${lang}`),
  ];
  return common.find((p) => fssync.existsSync(p)) ?? null;
}

async function writeConfig(cwd: string, config: StoneConfig, overwrite: boolean): Promise<void> {
  const filePath = path.join(cwd, CONFIG_FILE);
  const exists = fssync.existsSync(filePath);

  if (exists && !overwrite) {
    logWarning(`Config already exists: ${CONFIG_FILE}`);
    logInfo("Use --overwrite-config to replace it.");
    return;
  }

  const json = JSON.stringify(config, null, 2) + "\n";
  await fs.writeFile(filePath, json, "utf8");
  logSuccess(`${exists ? "Overwrote" : "Wrote"} ${CONFIG_FILE}`);
}

async function installRuntimeDeps(cwd: string, pm: PackageManager, deps: string[]): Promise<void> {
  if (deps.length === 0) return;
  const args = installArgs(pm, deps);

  logInfo(`Installing runtime deps: ${deps.join(", ")}`);

  const res = spawnSync(args.cmd, args.args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (res.status !== 0) {
    throw new Error(`Dependency installation failed with ${pm}. Exit code: ${res.status}`);
  }
}

function installArgs(pm: PackageManager, deps: string[]): { cmd: string; args: string[] } {
  switch (pm) {
    case "pnpm":
      return { cmd: "pnpm", args: ["add", ...deps] };
    case "yarn":
      return { cmd: "yarn", args: ["add", ...deps] };
    case "bun":
      return { cmd: "bun", args: ["add", ...deps] };
    case "npm":
    default:
      return { cmd: "npm", args: ["install", ...deps] };
  }
}

async function ensureStylesImport(cwd: string, entryAbsPath: string): Promise<boolean> {
  const fullPath = path.isAbsolute(entryAbsPath) ? entryAbsPath : path.join(cwd, entryAbsPath);

  let src: string;
  try {
    src = await fs.readFile(fullPath, "utf8");
  } catch (err) {
    logError(`Failed to read entry file: ${err}`);
    return false;
  }

  if (src.includes("@stone-ui/styles/dist/stone.css")) {
    return false;
  }

  const patched = patchImportAtTop(src, STYLES_IMPORT);

  try {
    await fs.writeFile(fullPath, patched, "utf8");
    return true;
  } catch (err) {
    logError(`Failed to write entry file: ${err}`);
    return false;
  }
}

function patchImportAtTop(source: string, importLine: string): string {
  const lines = source.split(/\r?\n/);

  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();

    if (l === "" || l.startsWith("//") || l.startsWith("/*")) {
      continue;
    }

    if (
      l.startsWith("import ") ||
      l.startsWith("import{") ||
      l.startsWith('import"') ||
      l.startsWith("import'")
    ) {
      lastImportIndex = i;
    } else if (lastImportIndex !== -1) {
      break;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join("\n");
  }

  return `${importLine}\n${source}`;
}

async function ensureLocalStylesFile(cwd: string, localFile: string): Promise<void> {
  const fullPath = path.join(cwd, ...localFile.split("/"));
  if (fssync.existsSync(fullPath)) {
    logInfo(`Local styles file already exists: ${normalizeToPosix(fullPath)}`);
    return;
  }
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const content = `@import \"@stone-ui/styles/dist/stone.css\";\\n`;
  await fs.writeFile(fullPath, content, "utf8");
  logSuccess(`Created local styles file: ${normalizeToPosix(fullPath)}`);
}

function printManualCssInstructions(projectType: ProjectType, localFile?: string): void {
  console.log("");
  logWarning("Manual step (CSS import):");
  console.log("Add this line near the top of your app entry file:");
  console.log(`  ${STYLES_IMPORT}`);
  console.log("");

  switch (projectType) {
    case "next-app-router":
      console.log("Typical file: app/layout.tsx (or src/app/layout.tsx)");
      break;
    case "next-pages-router":
      console.log("Typical file: pages/_app.tsx (or src/pages/_app.tsx)");
      break;
    case "vite-react":
      console.log("Typical file: src/main.tsx");
      break;
    case "cra":
      console.log("Typical file: src/index.tsx");
      break;
    default:
      console.log("Typical file: src/index.tsx or src/main.tsx");
  }
  if (localFile) {
    console.log("");
    console.log("Local CSS fallback:");
    console.log(`  Import or copy ${localFile} into your global styles if your bundler can't import node_modules CSS.`);
  }
  console.log("");
}

function normalizeToPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

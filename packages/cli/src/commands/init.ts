import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { confirm, createProgress, log } from "../utils/terminal.js";
import { resolveTemplateRoot } from "../utils/templates.js";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

type Framework = "react" | "vue" | "svelte" | "unknown";

type ProjectType =
  | "next-app-router"
  | "next-pages-router"
  | "vite-react"
  | "cra"
  | "unknown";

type StyleStrategy = "runtime" | "local";

type InitOptions = {
  cwd?: string;
  yes?: boolean;
  pm?: string;
  install?: boolean;
  patch?: boolean;
  overwriteConfig?: boolean;
};

type StoneConfig = {
  schema: "stone-ui@1";
  framework: Framework;
  projectType: ProjectType;
  language: "ts" | "js";
  packageManager: PackageManager;
  paths: {
    outputDir: string;
    primitivesDir: string;
    wrappersDir: string;
    utilsDir: string;
    barrelFile: string;
    stylesEntry?: string;
    localStylesFile?: string;
  };
  styles: {
    strategy: StyleStrategy;
    importPath: string;
  };
};

const CONFIG_FILE = "stone-ui.config.json";
const RUNTIME_STYLE_DEP = "@stone-ui/styles";
const STYLES_IMPORT = `import "@stone-ui/styles/stone.css";`;

const TEMPLATE_ROOT = resolveTemplateRoot(import.meta.url);

/**
 * Main initialization command that sets up Stone UI in a project
 * @param opts - Configuration options for initialization
 */
export async function initCommand(opts: InitOptions): Promise<void> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const yes = Boolean(opts.yes);

  const pkgJsonPath = path.join(cwd, "package.json");

  if (!fssync.existsSync(pkgJsonPath)) {
    throw new Error(
      `No package.json found in ${cwd}. Run this inside a project root.`
    );
  }

  const pm = normalizePackageManager(opts.pm) ?? detectPackageManager(cwd);
  const framework = detectFramework(cwd);
  const projectType = detectProjectType(cwd);
  const language = detectTS(cwd) ? "ts" : "js";

  if (framework !== "react") {
    throw new Error(
      `Unsupported framework: ${framework}. Stone UI CLI currently supports React.`
    );
  }

  const supportsCssImports = detectCssSupport(cwd, projectType);
  const stylesEntry = supportsCssImports
    ? detectStylesEntry(cwd, projectType, language)
    : null;
  const outputDir = "src/components/stone-ui";
  const primitivesDir = path.posix.join(outputDir, "primitives");
  const wrappersDir = path.posix.join(outputDir, "wrappers");
  const utilsDir = path.posix.join(outputDir, "utils");
  const barrelFile = path.posix.join(
    outputDir.replace(/\\/g, "/"),
    `index.${language === "ts" ? "ts" : "js"}`
  );

  const styleStrategy: StyleStrategy = supportsCssImports ? "runtime" : "local";
  const localStylesFile =
    styleStrategy === "local"
      ? path.posix.join(outputDir, "stone-ui.css")
      : undefined;

  const config: StoneConfig = {
    schema: "stone-ui@1",
    framework,
    projectType,
    language,
    packageManager: pm,
    paths: {
      outputDir,
      primitivesDir,
      wrappersDir,
      utilsDir,
      barrelFile,
      stylesEntry: stylesEntry ? normalizeToPosix(stylesEntry) : undefined,
      localStylesFile,
    },
    styles: {
      strategy: styleStrategy,
      importPath: "@stone-ui/styles/stone.css",
    },
  };

  const progress = createProgress(3);

  await writeConfig(cwd, config, Boolean(opts.overwriteConfig));
  progress.step("Wrote stone-ui.config.json");

  const shouldInstall = opts.install !== false;
  const shouldPatch = opts.patch !== false;

  if (styleStrategy === "runtime") {
    if (shouldInstall) {
      const ok = yes
        ? true
        : await confirm(
            "Install @stone-ui/styles for runtime CSS import now?",
            true
          );
      if (ok) {
        await installRuntimeDeps(cwd, pm, [RUNTIME_STYLE_DEP]);
      } else {
        log.warn("[stone-ui:init] Skipped install by user choice.");
      }
    } else {
      log.warn("[stone-ui:init] Skipping install (--no-install).");
    }
    progress.step("Handled style dependency");

    if (shouldPatch) {
      if (!stylesEntry) {
        log.warn(
          "[stone-ui:init] Could not auto-detect entry file for CSS import."
        );
        printManualCssInstructions(projectType);
      } else {
        const patched = await ensureStylesImport(cwd, stylesEntry);
        if (!patched) {
          log.info(
            `[stone-ui:init] Styles import already present: ${normalizeToPosix(
              stylesEntry
            )}`
          );
        } else {
          log.success(
            `[stone-ui:init] Added styles import to: ${normalizeToPosix(
              stylesEntry
            )}`
          );
        }
      }
    } else {
      log.warn("[stone-ui:init] Skipping patch (--no-patch).");
      printManualCssInstructions(projectType);
    }
    progress.step("Handled CSS import");
  } else {
    await writeLocalStyles(cwd, localStylesFile ?? "");
    progress.step("Generated local CSS file");
    log.warn(
      "[stone-ui:init] CSS imports were not detected. Using a local CSS file instead."
    );
    printLocalCssInstructions(localStylesFile ?? "");
    progress.step("Reviewed local CSS instructions");
  }

  progress.done("Initialization complete");

  log.success("");
  log.success("[stone-ui:init] Complete.");
  log.info(`- Framework: ${framework}`);
  log.info(`- Project: ${projectType}`);
  log.info(`- Package manager: ${pm}`);
  log.info(`- Config: ${CONFIG_FILE}`);
  log.info("");
  log.info("Next:");
  log.info(`  npx @stone-ui/cli add button`);
}

/**
 * Normalizes package manager string input
 * @param value - Raw package manager string
 * @returns Normalized PackageManager type or null
 */
function normalizePackageManager(value?: string): PackageManager | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "pnpm" || v === "npm" || v === "yarn" || v === "bun") return v;
  return null;
}

/**
 * Detects the package manager from lockfiles in project directory
 * @param cwd - Current working directory
 * @returns Detected PackageManager
 */
function detectPackageManager(cwd: string): PackageManager {
  if (fssync.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fssync.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fssync.existsSync(path.join(cwd, "bun.lockb"))) return "bun";
  if (fssync.existsSync(path.join(cwd, "package-lock.json"))) return "npm";
  return "npm";
}

/**
 * Checks if TypeScript is configured in the project
 * @param cwd - Current working directory
 * @returns true if tsconfig.json exists
 */
function detectTS(cwd: string): boolean {
  return fssync.existsSync(path.join(cwd, "tsconfig.json"));
}

function detectFramework(cwd: string): Framework {
  const pkgPath = path.join(cwd, "package.json");
  try {
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps.react) return "react";
    if (deps.vue) return "vue";
    if (deps.svelte) return "svelte";
  } catch (err) {
    log.warn(`[stone-ui:init] Could not parse package.json: ${err}`);
  }
  return "unknown";
}

/**
 * Detects the type of React project based on structure and dependencies
 * @param cwd - Current working directory
 * @returns Detected ProjectType
 */
function detectProjectType(cwd: string): ProjectType {
  const hasNextConfig =
    fssync.existsSync(path.join(cwd, "next.config.js")) ||
    fssync.existsSync(path.join(cwd, "next.config.mjs")) ||
    fssync.existsSync(path.join(cwd, "next.config.ts"));

  if (
    hasNextConfig ||
    fssync.existsSync(path.join(cwd, "node_modules", "next"))
  ) {
    const hasAppDir =
      fssync.existsSync(path.join(cwd, "app")) ||
      fssync.existsSync(path.join(cwd, "src", "app"));
    if (hasAppDir) return "next-app-router";
    return "next-pages-router";
  }

  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    if (deps.vite && deps.react) return "vite-react";
    if (deps["react-scripts"]) return "cra";
  } catch (err) {
    log.warn(`[stone-ui:init] Could not parse package.json: ${err}`);
  }

  return "unknown";
}

function detectCssSupport(cwd: string, projectType: ProjectType): boolean {
  if (projectType !== "unknown") return true;
  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return Boolean(
      deps.vite ||
        deps.webpack ||
        deps.parcel ||
        deps.rollup ||
        deps.next ||
        deps["react-scripts"] ||
        deps.postcss ||
        deps.tailwindcss
    );
  } catch {
    return false;
  }
}

/**
 * Detects the main entry file where CSS should be imported
 * @param cwd - Current working directory
 * @param projectType - Type of React project
 * @param lang - Language (ts or js)
 * @returns Path to entry file or null
 */
function detectStylesEntry(
  cwd: string,
  projectType: ProjectType,
  lang: "ts" | "js"
): string | null {
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

/**
 * Writes the Stone UI configuration file
 * @param cwd - Current working directory
 * @param config - Configuration object
 * @param overwrite - Whether to overwrite existing config
 */
async function writeConfig(
  cwd: string,
  config: StoneConfig,
  overwrite: boolean
): Promise<void> {
  const filePath = path.join(cwd, CONFIG_FILE);
  const exists = fssync.existsSync(filePath);

  if (exists && !overwrite) {
    log.warn(`[stone-ui:init] Config already exists: ${CONFIG_FILE}`);
    log.warn(`[stone-ui:init] Use --overwrite-config to replace it.`);
    return;
  }

  const json = JSON.stringify(config, null, 2) + "\n";
  await fs.writeFile(filePath, json, "utf8");
  log.success(
    `[stone-ui:init] ${exists ? "Overwrote" : "Wrote"} ${CONFIG_FILE}`
  );
}

/**
 * Installs runtime dependencies using the detected package manager
 * @param cwd - Current working directory
 * @param pm - Package manager to use
 * @param deps - Array of dependency names
 */
async function installRuntimeDeps(
  cwd: string,
  pm: PackageManager,
  deps: string[]
): Promise<void> {
  const args = installArgs(pm, deps);

  log.info(`[stone-ui:init] Installing deps: ${deps.join(", ")}`);

  const res = spawnSync(args.cmd, args.args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (res.status !== 0) {
    throw new Error(
      `Dependency installation failed with ${pm}. Exit code: ${res.status}`
    );
  }
}

/**
 * Generates install command arguments for different package managers
 * @param pm - Package manager type
 * @param deps - Array of dependency names
 * @returns Command and arguments object
 */
function installArgs(
  pm: PackageManager,
  deps: string[]
): { cmd: string; args: string[] } {
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

/**
 * Ensures styles import is present in the entry file
 * @param cwd - Current working directory
 * @param entryAbsPath - Path to entry file (absolute or relative)
 * @returns true if import was added, false if already present
 */
async function ensureStylesImport(
  cwd: string,
  entryAbsPath: string
): Promise<boolean> {
  const fullPath = path.isAbsolute(entryAbsPath)
    ? entryAbsPath
    : path.join(cwd, entryAbsPath);

  let src: string;
  try {
    src = await fs.readFile(fullPath, "utf8");
  } catch (err) {
    log.error(`[stone-ui:init] Failed to read entry file: ${err}`);
    return false;
  }

  if (src.includes("@stone-ui/styles/stone.css")) {
    return false;
  }

  const patched = patchImportAtTop(src, STYLES_IMPORT);

  try {
    await fs.writeFile(fullPath, patched, "utf8");
    return true;
  } catch (err) {
    log.error(`[stone-ui:init] Failed to write entry file: ${err}`);
    return false;
  }
}

async function writeLocalStyles(cwd: string, relativePath: string): Promise<void> {
  if (!relativePath) return;
  const templatePath = path.join(TEMPLATE_ROOT, "styles", "stone.css");
  const css = await fs.readFile(templatePath, "utf8");
  const abs = path.join(cwd, relativePath.replace(/\//g, path.sep));
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, css, "utf8");
}

/**
 * Patches source code to add import at the top (after existing imports)
 * @param source - Original source code
 * @param importLine - Import statement to add
 * @returns Patched source code
 */
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

/**
 * Prints manual instructions for adding CSS import
 * @param projectType - Type of React project
 */
function printManualCssInstructions(projectType: ProjectType): void {
  log.info("");
  log.info("[stone-ui:init] Manual step (CSS import):");
  log.info(`Add this line near the top of your app entry file:`);
  log.info(`  ${STYLES_IMPORT}`);
  log.info("Rollback: remove the import line if needed.");
  log.info("");

  switch (projectType) {
    case "next-app-router":
      log.info("Typical file: app/layout.tsx (or src/app/layout.tsx)");
      break;
    case "next-pages-router":
      log.info("Typical file: pages/_app.tsx (or src/pages/_app.tsx)");
      break;
    case "vite-react":
      log.info("Typical file: src/main.tsx");
      break;
    case "cra":
      log.info("Typical file: src/index.tsx");
      break;
    default:
      log.info("Typical file: src/index.tsx or src/main.tsx");
  }
  log.info("");
}

function printLocalCssInstructions(localStylesFile: string): void {
  log.info("");
  log.info("[stone-ui:init] Manual step (local CSS):");
  log.info(`Add this file to your app HTML or bundler entry:`);
  log.info(`  ${localStylesFile}`);
  log.info("Rollback: remove the link/import if needed.");
  log.info("");
}

/**
 * Normalizes Windows paths to POSIX format
 * @param p - Path to normalize
 * @returns POSIX-formatted path
 */
function normalizeToPosix(p: string): string {
  return p.replace(/\\/g, "/");
}

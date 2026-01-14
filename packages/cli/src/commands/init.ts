import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { createProgress, log } from "../utils/terminal.js";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

type Framework = "react" | "vue" | "svelte" | "unknown";

type ProjectType =
  | "next-app-router"
  | "next-pages-router"
  | "vite-react"
  | "cra"
  | "unknown";

type StyleStrategy = "tailwind";

type InitOptions = {
  cwd?: string;
  pm?: string;
  overwriteConfig?: boolean;
};

type StoneConfig = {
  schema: "brick-ui@1";
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
  };
  styles: {
    strategy: StyleStrategy;
  };
};

const CONFIG_FILE = "brick-ui.config.json";

/**
 * Main initialization command that sets up Stone UI in a project
 * @param opts - Configuration options for initialization
 */
export async function initCommand(opts: InitOptions): Promise<void> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());

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

  const outputDir = "src/components/brick-ui";
  const primitivesDir = path.posix.join(outputDir, "primitives");
  const wrappersDir = path.posix.join(outputDir, "wrappers");
  const utilsDir = path.posix.join(outputDir, "utils");
  const barrelFile = path.posix.join(
    outputDir.replace(/\\/g, "/"),
    `index.${language === "ts" ? "ts" : "js"}`
  );

  const config: StoneConfig = {
    schema: "brick-ui@1",
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
    },
    styles: {
      strategy: "tailwind",
    },
  };

  const progress = createProgress(2);

  await writeConfig(cwd, config, Boolean(opts.overwriteConfig));
  progress.step("Wrote brick-ui.config.json");

  const hasTailwind = detectTailwind(cwd);
  if (hasTailwind) {
    log.success("[brick-ui:init] Tailwind CSS detected.");
  } else {
    log.warn(
      "[brick-ui:init] Tailwind CSS not detected. Components use Tailwind classes."
    );
    printTailwindInstructions(projectType);
  }
  progress.step("Checked Tailwind CSS setup");

  progress.done("Initialization complete");

  log.success("");
  log.success("[brick-ui:init] Complete.");
  log.info(`- Framework: ${framework}`);
  log.info(`- Project: ${projectType}`);
  log.info(`- Package manager: ${pm}`);
  log.info(`- Config: ${CONFIG_FILE}`);
  log.info("");
  log.info("Next:");
  log.info(`  npx @brick-ui/cli add button`);
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

function detectTailwind(cwd: string): boolean {
  const pkgPath = path.join(cwd, "package.json");
  try {
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return Boolean(deps.tailwindcss);
  } catch {
    return false;
  }
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
    log.warn(`[brick-ui:init] Could not parse package.json: ${err}`);
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
    log.warn(`[brick-ui:init] Could not parse package.json: ${err}`);
  }

  return "unknown";
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
    log.warn(`[brick-ui:init] Config already exists: ${CONFIG_FILE}`);
    log.warn(`[brick-ui:init] Use --overwrite-config to replace it.`);
    return;
  }

  const json = JSON.stringify(config, null, 2) + "\n";
  await fs.writeFile(filePath, json, "utf8");
  log.success(
    `[brick-ui:init] ${exists ? "Overwrote" : "Wrote"} ${CONFIG_FILE}`
  );
}

function printTailwindInstructions(projectType: ProjectType): void {
  log.info("");
  log.info("[brick-ui:init] Tailwind CSS setup:");
  log.info("Install tailwindcss and follow the setup guide for your framework.");
  log.info('Ensure your global CSS includes: @import "tailwindcss";');
  log.info("");

  switch (projectType) {
    case "next-app-router":
      log.info("Typical file: app/globals.css (or src/app/globals.css)");
      break;
    case "next-pages-router":
      log.info("Typical file: styles/globals.css (or src/styles/globals.css)");
      break;
    case "vite-react":
    case "cra":
      log.info("Typical file: src/index.css");
      break;
    default:
      log.info("Typical file: src/index.css or src/main.css");
  }
  log.info("");
}

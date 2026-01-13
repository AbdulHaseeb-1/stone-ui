import * as fs from "node:fs/promises";
import * as fssync from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";
type Mode = "runtime" | "hybrid";

type ProjectType =
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

type StoneConfig = {
  schema: string;
  mode: Mode;
  framework: "react";
  projectType: ProjectType;
  paths: {
    outputDir: string;
    barrelFile: string;
    stylesEntry?: string;
  };
  imports: {
    runtime: {
      react: string;
      styles: string;
    };
  };
  eject: {
    language: "ts" | "js";
    styleStrategy: "tailwind-cva";
    includeUtils: boolean;
    includeWrappers: boolean;
    format: "prettier" | "none";
  };
  packageManager: PackageManager;
};

const CONFIG_FILE = "store-uii.config.json";
const RUNTIME_DEPS = ["@store-uii/react", "@store-uii/styles"];
const STYLES_IMPORT = `import "@store-uii/styles/dist/stone.css";`;

/**
 * Main initialization command that sets up Store-UII in a project
 * @param opts - Configuration options for initialization
 */
export async function initCommand(opts: InitOptions): Promise<void> {
  const cwd = path.resolve(opts.cwd ?? process.cwd());
  const yes = Boolean(opts.yes);
  const mode: Mode = opts.mode === "hybrid" ? "hybrid" : "runtime";

  const pkgJsonPath = path.join(cwd, "package.json");

  if (!fssync.existsSync(pkgJsonPath)) {
    throw new Error(
      `No package.json found in ${cwd}. Run this inside a project root.`
    );
  }

  const pm = normalizePackageManager(opts.pm) ?? detectPackageManager(cwd);
  const projectType = detectProjectType(cwd);
  const language = detectTS(cwd) ? "ts" : "js";

  const stylesEntry = detectStylesEntry(cwd, projectType, language);
  const outputDir = "src/components/store-uii";
  const barrelFile = path.posix.join(
    outputDir.replace(/\\/g, "/"),
    "index.ts"
  );

  const config: StoneConfig = {
    schema: "store-uii@1",
    mode,
    framework: "react",
    projectType,
    paths: {
      outputDir,
      barrelFile,
      stylesEntry: stylesEntry ? normalizeToPosix(stylesEntry) : undefined,
    },
    imports: {
      runtime: {
        react: "@store-uii/react",
        styles: "@store-uii/styles/dist/stone.css",
      },
    },
    eject: {
      language,
      styleStrategy: "tailwind-cva",
      includeUtils: true,
      includeWrappers: true,
      format: "prettier",
    },
    packageManager: pm,
  };

  await writeConfig(cwd, config, Boolean(opts.overwriteConfig));

  const shouldInstall = opts.install !== false;
  const shouldPatch = opts.patch !== false;

  if (shouldInstall) {
    await installRuntimeDeps(cwd, pm, RUNTIME_DEPS);
  } else {
    console.log(`[store-uii:init] Skipping install (--no-install).`);
  }

  if (shouldPatch) {
    if (!stylesEntry) {
      console.log(
        `[store-uii:init] Could not auto-detect entry file for CSS import.`
      );
      printManualCssInstructions(projectType);
    } else {
      const patched = await ensureStylesImport(cwd, stylesEntry);
      if (!patched) {
        console.log(
          `[store-uii:init] Styles import already present: ${normalizeToPosix(
            stylesEntry
          )}`
        );
      } else {
        console.log(
          `[store-uii:init] Added styles import to: ${normalizeToPosix(
            stylesEntry
          )}`
        );
      }
    }
  } else {
    console.log(`[store-uii:init] Skipping patch (--no-patch).`);
    printManualCssInstructions(projectType);
  }

  console.log("");
  console.log(`[store-uii:init] Complete.`);
  console.log(`- Mode: ${mode}`);
  console.log(`- Project: ${projectType}`);
  console.log(`- Package manager: ${pm}`);
  console.log(`- Config: ${CONFIG_FILE}`);
  console.log("");
  console.log(`Next:`);
  console.log(`  import { Button } from "@store-uii/react";`);
  console.log(`  // CSS: ${STYLES_IMPORT}`);
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
  // Priority order: pnpm > yarn > bun > npm
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

/**
 * Detects the type of React project based on structure and dependencies
 * @param cwd - Current working directory
 * @returns Detected ProjectType
 */
function detectProjectType(cwd: string): ProjectType {
  // Check for Next.js configuration files
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

  // Check package.json for dependencies
  try {
    const pkgPath = path.join(cwd, "package.json");
    const pkg = JSON.parse(fssync.readFileSync(pkgPath, "utf8"));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

    if (deps["vite"] && deps["react"]) return "vite-react";
    if (deps["react-scripts"]) return "cra";
  } catch (err) {
    console.warn(`[store-uii:init] Could not parse package.json: ${err}`);
  }

  return "unknown";
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
  // Next App Router: app/layout.(ts|js)x
  if (projectType === "next-app-router") {
    const candidates = [
      path.join(cwd, "app", `layout.${lang}x`),
      path.join(cwd, "src", "app", `layout.${lang}x`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  // Next Pages Router: pages/_app.(ts|js)x
  if (projectType === "next-pages-router") {
    const candidates = [
      path.join(cwd, "pages", `_app.${lang}x`),
      path.join(cwd, "src", "pages", `_app.${lang}x`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  // Vite: src/main.(ts|js)x or src/main.(ts|js)
  if (projectType === "vite-react") {
    const candidates = [
      path.join(cwd, "src", `main.${lang}x`),
      path.join(cwd, "src", `main.${lang}`),
      path.join(cwd, "src", `index.${lang}x`),
      path.join(cwd, "src", `index.${lang}`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  // CRA: src/index.(ts|js)x
  if (projectType === "cra") {
    const candidates = [
      path.join(cwd, "src", `index.${lang}x`),
      path.join(cwd, "src", `index.${lang}`),
    ];
    return candidates.find((p) => fssync.existsSync(p)) ?? null;
  }

  // Unknown: common entry points
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
 * Writes the Store-UII configuration file
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
    console.log(`[store-uii:init] Config already exists: ${CONFIG_FILE}`);
    console.log(`[store-uii:init] Use --overwrite-config to replace it.`);
    return;
  }

  const json = JSON.stringify(config, null, 2) + "\n";
  await fs.writeFile(filePath, json, "utf8");
  console.log(
    `[store-uii:init] ${exists ? "Overwrote" : "Wrote"} ${CONFIG_FILE}`
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

  console.log(`[store-uii:init] Installing runtime deps: ${deps.join(", ")}`);
  
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
    console.error(`[store-uii:init] Failed to read entry file: ${err}`);
    return false;
  }

  if (src.includes(`@store-uii/styles/dist/stone.css`)) {
    return false; // already present
  }

  const patched = patchImportAtTop(src, STYLES_IMPORT);
  
  try {
    await fs.writeFile(fullPath, patched, "utf8");
    return true;
  } catch (err) {
    console.error(`[store-uii:init] Failed to write entry file: ${err}`);
    return false;
  }
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
  let foundNonImport = false;

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();

    // Skip empty lines and comments at the top
    if (l === "" || l.startsWith("//") || l.startsWith("/*")) {
      continue;
    }

    // Track import statements
    if (l.startsWith("import ") || l.startsWith("import{") || l.startsWith('import"') || l.startsWith("import'")) {
      lastImportIndex = i;
      foundNonImport = false;
    } else if (lastImportIndex !== -1) {
      // Found non-import after imports, stop scanning
      foundNonImport = true;
      break;
    }
  }

  // Insert after last import or at the beginning
  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
    return lines.join("\n");
  }

  // No imports found, add at the top
  return `${importLine}\n${source}`;
}

/**
 * Prints manual instructions for adding CSS import
 * @param projectType - Type of React project
 */
function printManualCssInstructions(projectType: ProjectType): void {
  console.log("");
  console.log("[store-uii:init] Manual step (CSS import):");
  console.log(`Add this line near the top of your app entry file:`);
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
  console.log("");
}

/**
 * Normalizes Windows paths to POSIX format
 * @param p - Path to normalize
 * @returns POSIX-formatted path
 */
function normalizeToPosix(p: string): string {
  return p.replace(/\\/g, "/");
}
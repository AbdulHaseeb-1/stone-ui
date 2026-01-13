#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version?: string };
const VERSION = pkg.version ?? "0.0.0";

export type GlobalOptions = {
  cwd?: string;
};

async function main(argv: string[]) {
  const program = new Command();

  program
    .name("stone-ui")
    .description("Stone UI CLI (manifest-driven component generator)")
    .version(VERSION)
    .option("--cwd <path>", "Run as if Stone UI was invoked in this directory");

  program
    .command("init")
    .description("Initialize Stone UI (detect project, install deps, write config)")
    .option("--yes", "Run non-interactively using defaults", false)
    .option("--pm <pm>", "Package manager: pnpm | npm | yarn | bun")
    .option("--no-install", "Do not install dependencies (only writes config/prints instructions)")
    .option("--no-patch", "Do not patch app entry files for CSS import (only prints instructions)")
    .option("--overwrite-config", "Overwrite existing stone-ui.config.json if present", false)
    .action(async (opts) => {
      const globals = program.opts<GlobalOptions>();
      await initCommand({
        ...opts,
        cwd: globals.cwd,
      });
    });

  program
    .command("add")
    .description("Add Stone UI components to your project")
    .argument("<components...>", "Component names (e.g., button neon-border)")
    .option("--overwrite", "Overwrite existing files", false)
    .option("--yes", "Skip prompts and use defaults", false)
    .action(async (components: string[], opts) => {
      const globals = program.opts<GlobalOptions>();
      await addCommand({
        ...opts,
        components,
        cwd: globals.cwd,
      });
    });

  program
    .command("list")
    .description("List available primitives/wrappers")
    .action(() => {
      console.log("Not implemented yet: list");
      process.exitCode = 1;
    });

  program
    .command("doctor")
    .description("Validate installation and configuration")
    .action(() => {
      console.log("Not implemented yet: doctor");
      process.exitCode = 1;
    });

  await program.parseAsync(argv);
}

main(process.argv).catch((err) => {
  console.error("[stone-ui] Fatal error:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

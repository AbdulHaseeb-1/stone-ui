import { cp, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(here, "../src/templates");
const distDir = resolve(here, "../dist/templates");

await mkdir(distDir, { recursive: true });
await cp(srcDir, distDir, { recursive: true });

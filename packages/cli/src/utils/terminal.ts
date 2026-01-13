import * as readline from "node:readline/promises";

type ColorName = "cyan" | "green" | "yellow" | "red" | "gray" | "magenta";

const COLORS: Record<ColorName, string> = {
  cyan: "\u001b[36m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  red: "\u001b[31m",
  gray: "\u001b[90m",
  magenta: "\u001b[35m",
};

const RESET = "\u001b[0m";

export function colorize(color: ColorName, message: string): string {
  return `${COLORS[color]}${message}${RESET}`;
}

export const log = {
  info(message: string) {
    console.log(colorize("cyan", message));
  },
  success(message: string) {
    console.log(colorize("green", message));
  },
  warn(message: string) {
    console.log(colorize("yellow", message));
  },
  error(message: string) {
    console.error(colorize("red", message));
  },
  muted(message: string) {
    console.log(colorize("gray", message));
  },
};

export function createProgress(total: number) {
  let current = 0;

  const render = (label: string) => {
    const width = 24;
    const ratio = Math.min(1, Math.max(0, current / total));
    const filled = Math.round(width * ratio);
    const bar = `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
    const percent = Math.round(ratio * 100);
    const line = `${colorize("magenta", `[${bar}]`)} ${percent}% ${label}`;
    process.stdout.write(`${line}\n`);
  };

  return {
    step(label: string) {
      current = Math.min(total, current + 1);
      render(label);
    },
    done(label: string) {
      current = total;
      render(label);
    },
  };
}

export async function confirm(question: string, defaultValue = true): Promise<boolean> {
  const prompt = `${question} ${defaultValue ? "[Y/n]" : "[y/N]"} `;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = (await rl.question(prompt)).trim().toLowerCase();
    if (!answer) return defaultValue;
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    return defaultValue;
  } finally {
    rl.close();
  }
}

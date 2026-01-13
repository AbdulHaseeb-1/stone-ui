export function cnTemplate(language: "ts" | "js"): string {
  if (language === "js") {
    return `function appendClass(list, value) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendClass(list, item));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, condition]) => {
      if (condition) list.push(key);
    });
    return;
  }
  list.push(String(value));
}

export function cn(...inputs) {
  const list = [];
  inputs.forEach((input) => appendClass(list, input));
  return list.join(" ");
}
`;
  }

  return `export type ClassValue =
  | string
  | number
  | null
  | undefined
  | boolean
  | { [key: string]: boolean | undefined | null }
  | ClassValue[];

function appendClass(list: string[], value: ClassValue): void {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendClass(list, item));
    return;
  }
  if (typeof value === "object") {
    Object.entries(value).forEach(([key, condition]) => {
      if (condition) list.push(key);
    });
    return;
  }
  list.push(String(value));
}

export function cn(...inputs: ClassValue[]): string {
  const list: string[] = [];
  inputs.forEach((input) => appendClass(list, input));
  return list.join(" ");
}
`;
}

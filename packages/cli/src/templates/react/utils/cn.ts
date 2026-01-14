type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassDictionary
  | ClassArray;

type ClassDictionary = Record<string, boolean>;
type ClassArray = ClassValue[];

function toValue(value: ClassValue): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toValue).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key)
      .join(" ");
  }
  return "";
}

export function cn(...inputs: ClassValue[]): string {
  return inputs.map(toValue).filter(Boolean).join(" ");
}

function toValue(value) {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(toValue).filter(Boolean).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .filter((entry) => entry[1])
      .map((entry) => entry[0])
      .join(" ");
  }
  return "";
}

export function cn() {
  return Array.from(arguments).map(toValue).filter(Boolean).join(" ");
}

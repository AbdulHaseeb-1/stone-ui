export function barrelTemplate(exportsList: string[]): string {
  const content = exportsList.join("\n");
  return `${content}\n`;
}

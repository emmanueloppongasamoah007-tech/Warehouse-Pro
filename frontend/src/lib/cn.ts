export function cn(...classes: (string | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Sort NPC-like entities by display name (Russian collation). */
export function sortNpcsByName<T extends { name?: string | null }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) =>
    (a.name ?? "").localeCompare(b.name ?? "", "ru", { sensitivity: "base" })
  );
}

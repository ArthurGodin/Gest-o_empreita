export function rankCatalogSuggestions<T extends { id: string }>(
  prefixMatches: T[],
  substringMatches: T[],
  limit = 5,
): T[] {
  const seen = new Set<string>();
  return [...prefixMatches, ...substringMatches]
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, limit);
}

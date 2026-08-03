export const PROJECT_CREATION_SOURCES = [
  "quote",
  "direct",
  "demo",
  "legacy",
] as const;

export type ProjectCreationSource =
  (typeof PROJECT_CREATION_SOURCES)[number];

export function normalizeProjectCreationSource(
  value: unknown,
): ProjectCreationSource {
  return typeof value === "string" &&
    PROJECT_CREATION_SOURCES.includes(value as ProjectCreationSource)
    ? (value as ProjectCreationSource)
    : "legacy";
}


export interface TopographyCapabilityInput {
  viewportWidth: number;
  hasWebGl2: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
  effectiveConnectionType?: string;
  hardwareConcurrency?: number;
  deviceMemoryGb?: number;
}

const BLOCKED_CONNECTION_TYPES = new Set(["slow-2g", "2g"]);

export function canUseTopographyAnimation({
  viewportWidth,
  hasWebGl2,
  prefersReducedMotion,
  saveData,
  effectiveConnectionType,
  hardwareConcurrency,
  deviceMemoryGb,
}: TopographyCapabilityInput) {
  if (viewportWidth < 1024 || !hasWebGl2 || prefersReducedMotion || saveData) {
    return false;
  }

  if (
    effectiveConnectionType &&
    BLOCKED_CONNECTION_TYPES.has(effectiveConnectionType.toLowerCase())
  ) {
    return false;
  }

  if (hardwareConcurrency !== undefined && hardwareConcurrency <= 2) {
    return false;
  }

  if (deviceMemoryGb !== undefined && deviceMemoryGb <= 2) {
    return false;
  }

  return true;
}

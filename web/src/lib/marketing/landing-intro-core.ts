export interface LandingIntroCapability {
  hasBeenSeen: boolean;
  prefersReducedMotion: boolean;
  saveData: boolean;
}

export function shouldShowLandingIntro({
  hasBeenSeen,
  prefersReducedMotion,
  saveData,
}: LandingIntroCapability) {
  return !hasBeenSeen && !prefersReducedMotion && !saveData;
}

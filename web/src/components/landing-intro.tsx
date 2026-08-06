"use client";

import { HardHat } from "lucide-react";
import { useEffect, useLayoutEffect, useState } from "react";
import { shouldShowLandingIntro } from "@/lib/marketing/landing-intro-core";

const SESSION_KEY = "prumo:landing-intro-seen";
const FAILSAFE_DURATION_MS = 1_500;

interface NavigatorConnection {
  saveData?: boolean;
}

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function LandingIntro() {
  const [isMounted, setIsMounted] = useState(true);
  const [shouldScheduleRemoval, setShouldScheduleRemoval] = useState(false);

  useBrowserLayoutEffect(() => {
    let hasBeenSeen = true;

    try {
      hasBeenSeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // Restricted storage should never leave a decorative layer on screen.
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const connection = (
      navigator as Navigator & { connection?: NavigatorConnection }
    ).connection;
    const canShow = shouldShowLandingIntro({
      hasBeenSeen,
      prefersReducedMotion,
      saveData: connection?.saveData ?? false,
    });

    if (!canShow) {
      setIsMounted(false);
      return;
    }

    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // The CSS animation still has its own non-blocking exit.
    }

    setShouldScheduleRemoval(true);
  }, []);

  useEffect(() => {
    if (!shouldScheduleRemoval) return;

    const failsafe = window.setTimeout(
      () => setIsMounted(false),
      FAILSAFE_DURATION_MS,
    );
    return () => window.clearTimeout(failsafe);
  }, [shouldScheduleRemoval]);

  if (!isMounted) return null;

  return (
    <div className="landing-intro" aria-hidden="true" data-testid="landing-intro">
      <div className="landing-intro-panel landing-intro-panel-top" />
      <div className="landing-intro-panel landing-intro-panel-bottom" />

      <div className="landing-intro-brand">
        <span className="landing-intro-mark">
          <HardHat className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <span className="landing-intro-wordmark">
          <span>Prumo</span>
          <small>Gestão de projetos</small>
        </span>
        <span className="landing-intro-rule" />
      </div>
    </div>
  );
}

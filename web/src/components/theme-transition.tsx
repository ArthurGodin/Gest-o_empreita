"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";

export const themePreferences = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof themePreferences)[number];

type ThemeTransitionContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  isTransitioning: boolean;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
};

const ThemeTransitionContext = createContext<ThemeTransitionContextValue | null>(
  null,
);

const COVER_DURATION_MS = 450;
const REVEAL_DURATION_MS = 450;
const THEME_SETTLE_DELAY_MS = 32;

function resolveSystemTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function ThemeTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const [curtainState, setCurtainState] = useState<
    "idle" | "covering" | "revealing"
  >("idle");
  const [curtainTheme, setCurtainTheme] = useState<"light" | "dark">(
    "light",
  );
  const busyRef = useRef(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frameRef = useRef<number | null>(null);

  const preference = themePreferences.includes(theme as ThemePreference)
    ? (theme as ThemePreference)
    : "system";
  const safeResolvedTheme = resolvedTheme === "dark" ? "dark" : "light";

  const clearTimers = useCallback(() => {
    for (const timer of timersRef.current) {
      clearTimeout(timer);
    }
    timersRef.current = [];

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const setPreference = useCallback(
    (nextPreference: ThemePreference) => {
      if (busyRef.current || nextPreference === preference) {
        return;
      }

      if (reduceMotion) {
        setTheme(nextPreference);
        return;
      }

      const nextResolvedTheme =
        nextPreference === "system" ? resolveSystemTheme() : nextPreference;

      clearTimers();
      busyRef.current = true;
      setCurtainTheme(nextResolvedTheme);
      setCurtainState("covering");

      const coverTimer = setTimeout(() => {
        setTheme(nextPreference);

        const settleTimer = setTimeout(() => {
          frameRef.current = requestAnimationFrame(() => {
            frameRef.current = null;
            setCurtainState("revealing");

            const revealTimer = setTimeout(() => {
              setCurtainState("idle");
              busyRef.current = false;
            }, REVEAL_DURATION_MS);
            timersRef.current.push(revealTimer);
          });
        }, THEME_SETTLE_DELAY_MS);
        timersRef.current.push(settleTimer);
      }, COVER_DURATION_MS);

      timersRef.current.push(coverTimer);
    }, [clearTimers, preference, reduceMotion, setTheme],
  );

  const toggleTheme = useCallback(() => {
    setPreference(safeResolvedTheme === "dark" ? "light" : "dark");
  }, [safeResolvedTheme, setPreference]);

  const value = useMemo<ThemeTransitionContextValue>(
    () => ({
      preference,
      resolvedTheme: safeResolvedTheme,
      isTransitioning: curtainState !== "idle",
      setPreference,
      toggleTheme,
    }),
    [curtainState, preference, safeResolvedTheme, setPreference, toggleTheme],
  );

  return (
    <ThemeTransitionContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className="theme-curtain"
        data-state={curtainState}
        data-theme={curtainTheme}
      />
    </ThemeTransitionContext.Provider>
  );
}

export function usePrumoTheme() {
  const context = useContext(ThemeTransitionContext);

  if (!context) {
    throw new Error(
      "usePrumoTheme precisa ser usado dentro de ThemeTransitionProvider.",
    );
  }

  return context;
}

"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { canUseTopographyAnimation } from "@/lib/marketing/topography-capability";

const DynamicTopographyCanvas = dynamic(
  () =>
    import("./prumo-topography-canvas").then(
      (module) => module.PrumoTopographyCanvas,
    ),
  { ssr: false },
);

interface PrumoTopographyHeroProps {
  className?: string;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: "change", listener: () => void) => void;
  removeEventListener?: (type: "change", listener: () => void) => void;
}

type NavigatorWithDeviceHints = Navigator & {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
};

interface IdleCallbackApi {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions,
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
}

function supportsWebGl2() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl2", {
    failIfMajorPerformanceCaveat: true,
  });
  context?.getExtension("WEBGL_lose_context")?.loseContext();
  return Boolean(context);
}

export function PrumoTopographyHero({
  className,
}: PrumoTopographyHeroProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deviceNavigator = navigator as NavigatorWithDeviceHints;
    const connection = deviceNavigator.connection;
    const idleApi = window as unknown as IdleCallbackApi;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const cancelScheduledLoad = () => {
      if (idleHandle !== null) {
        idleApi.cancelIdleCallback?.(idleHandle);
        idleHandle = null;
      }
      if (timeoutHandle !== null) {
        window.clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
    };

    const evaluateCapability = () => {
      cancelScheduledLoad();
      const eligible = canUseTopographyAnimation({
        viewportWidth: window.innerWidth,
        hasWebGl2: supportsWebGl2(),
        prefersReducedMotion: motionQuery.matches,
        saveData: connection?.saveData ?? false,
        effectiveConnectionType: connection?.effectiveType,
        hardwareConcurrency: deviceNavigator.hardwareConcurrency || undefined,
        deviceMemoryGb: deviceNavigator.deviceMemory,
      });

      if (!desktopQuery.matches || !eligible) {
        setCanAnimate(false);
        return;
      }

      const enableAnimation = () => {
        cancelScheduledLoad();
        setCanAnimate(true);
      };
      const supportsIdleCallback = Boolean(idleApi.requestIdleCallback);
      if (idleApi.requestIdleCallback) {
        idleHandle = idleApi.requestIdleCallback(enableAnimation, {
          timeout: 1200,
        });
      }
      timeoutHandle = window.setTimeout(
        enableAnimation,
        supportsIdleCallback ? 900 : 450,
      );
    };

    evaluateCapability();
    desktopQuery.addEventListener("change", evaluateCapability);
    motionQuery.addEventListener("change", evaluateCapability);
    connection?.addEventListener?.("change", evaluateCapability);

    return () => {
      cancelScheduledLoad();
      desktopQuery.removeEventListener("change", evaluateCapability);
      motionQuery.removeEventListener("change", evaluateCapability);
      connection?.removeEventListener?.("change", evaluateCapability);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry?.isIntersecting ?? false),
      { rootMargin: "120px 0px", threshold: 0.02 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-prumo-scene-active={active}
      data-prumo-scene-motion={canAnimate}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      <div className="absolute -bottom-10 -right-10 h-52 w-52 opacity-40 min-[360px]:-bottom-12 min-[360px]:-right-12 min-[360px]:h-60 min-[360px]:w-60 sm:-bottom-16 sm:-right-16 sm:h-80 sm:w-80 lg:inset-y-0 lg:right-[-5%] lg:h-auto lg:w-[62%] lg:opacity-50">
        <Image
          src="/hero/prumo-topography.png"
          alt=""
          fill
          priority
          sizes="(max-width: 359px) 208px, (max-width: 639px) 240px, (max-width: 1023px) 320px, 62vw"
          className="object-contain object-bottom grayscale lg:object-center"
          draggable={false}
        />
      </div>

      {canAnimate ? (
        <HeroSceneBoundary>
          <div className="pointer-events-auto absolute inset-y-0 right-0 hidden w-[62%] lg:block">
            <DynamicTopographyCanvas active={active} />
          </div>
        </HeroSceneBoundary>
      ) : null}
    </div>
  );
}

class HeroSceneBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === "development") {
      console.warn("Prumo 3D hero fallback activated.", error, info);
    }
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

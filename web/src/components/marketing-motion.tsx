"use client";

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MarketingMotion({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const revealItems = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (
      shouldReduceMotion ||
      typeof IntersectionObserver === "undefined"
    ) {
      delete root.dataset.motionReady;
      revealItems.forEach((item) => {
        item.dataset.revealed = "true";
      });
      return;
    }

    root.dataset.motionReady = "true";
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const item = entry.target as HTMLElement;
          item.dataset.revealed = "true";
          observer.unobserve(item);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      },
    );

    revealItems.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [shouldReduceMotion]);

  return (
    <div ref={rootRef} className="contents">
      {children}
    </div>
  );
}

export function PricingCardFrame({
  children,
  className,
  featured,
  index,
}: {
  children: ReactNode;
  className?: string;
  featured: boolean;
  index: number;
}) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const shouldReduceMotion = useReducedMotion();
  const spotlightBackground = useMotionTemplate`radial-gradient(360px circle at ${mouseX}px ${mouseY}px, ${
    featured ? "rgba(52, 211, 153, 0.14)" : "rgba(5, 150, 105, 0.09)"
  }, transparent 72%)`;

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    mouseX.set(event.clientX - bounds.left);
    mouseY.set(event.clientY - bounds.top);
  }

  return (
    <motion.article
      initial={false}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onPointerMove={handlePointerMove}
      className={cn("pricing-card-enter group", className)}
      style={
        {
          "--pricing-delay": `${index * 70}ms`,
        } as CSSProperties
      }
    >
      <motion.div
        aria-hidden="true"
        className="pricing-card-spotlight"
        style={{ background: spotlightBackground }}
      />
      {children}
    </motion.article>
  );
}

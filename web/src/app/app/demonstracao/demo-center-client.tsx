"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackProductEvent } from "@/lib/product-analytics";
import type {
  DemoWorkspaceStep,
  DemoWorkspaceStepId,
} from "@/lib/demo-workspace";

export function DemoCenterTracker() {
  useEffect(() => {
    trackProductEvent("demo_center_opened");
  }, []);

  return null;
}

export function DemoStepAction({
  step,
}: {
  step: Pick<DemoWorkspaceStep, "id" | "href" | "external">;
}) {
  if (!step.href) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        Prepare o cenário
      </Button>
    );
  }

  const content = (
    <>
      Abrir
      {step.external ? (
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
      ) : (
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
      )}
    </>
  );
  const trackStep = () =>
    trackProductEvent("demo_step_opened", {
      step: step.id satisfies DemoWorkspaceStepId,
      external: step.external,
    });

  return (
    <Button asChild variant="outline" size="sm">
      {step.external ? (
        <a
          href={step.href}
          target="_blank"
          rel="noreferrer"
          onClick={trackStep}
        >
          {content}
        </a>
      ) : (
        <Link href={step.href} onClick={trackStep}>
          {content}
        </Link>
      )}
    </Button>
  );
}

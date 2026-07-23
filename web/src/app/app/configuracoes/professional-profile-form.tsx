"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BusinessSegmentPicker } from "@/components/business-segment-picker";
import { Button } from "@/components/ui/button";
import {
  getBusinessSegmentOption,
  type BusinessSegment,
} from "@/lib/business-segment";
import { trackProductEvent } from "@/lib/product-analytics";
import { updateBusinessSegmentAction } from "./actions";

interface ProfessionalProfileFormProps {
  initialSegment: BusinessSegment;
  onDirtyChange: (dirty: boolean) => void;
}

export function ProfessionalProfileForm({
  initialSegment,
  onDirtyChange,
}: ProfessionalProfileFormProps) {
  const router = useRouter();
  const [segment, setSegment] = useState(initialSegment);
  const [savedSegment, setSavedSegment] = useState(initialSegment);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dirty = segment !== savedSegment;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange(false);
  }, [onDirtyChange]);

  function save() {
    if (!dirty || pending) return;
    setError(null);

    startTransition(async () => {
      const result = await updateBusinessSegmentAction({
        business_segment: segment,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      trackProductEvent("business_segment_changed", {
        from_segment: savedSegment,
        to_segment: segment,
      });
      setSavedSegment(segment);
      router.refresh();
    });
  }

  return (
    <form
      className="space-y-4 rounded-lg border bg-card p-4 sm:p-5"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <BusinessSegmentPicker
        idPrefix="settings-segment"
        value={segment}
        onValueChange={(value) => {
          setSegment(value);
          setError(null);
        }}
        legend="Perfil profissional"
        description="Adapta nomes, exemplos e modelos. Propostas, projetos e cobranças existentes não são modificados."
        disabled={pending}
        error={error ?? undefined}
      />

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Selecionado:{" "}
          <span className="font-semibold text-foreground">
            {getBusinessSegmentOption(segment).label}
          </span>
        </p>
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Salvando..." : "Salvar perfil"}
        </Button>
      </div>
    </form>
  );
}

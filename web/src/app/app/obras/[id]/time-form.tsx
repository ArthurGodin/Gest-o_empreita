"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Plus } from "lucide-react";
import { ConfirmDiscardDialog } from "@/components/forms/confirm-discard-dialog";
import { ProtectedFormNavigation } from "@/components/forms/protected-form-navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayBR } from "@/lib/dates";
import { addTimeEntryAction, workerNamesAutocompleteAction } from "./actions";
import {
  projectCommandSignature,
  validateTimeDraft,
  type TimeDraft,
} from "./project-command-draft";

function nowHHMM(): string {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

interface GeoState {
  lat: number;
  lng: number;
  accuracy: number;
}

interface TimeFormProps {
  projectId: string;
  defaultRole?: string;
  triggerLabel?: string;
}

export function TimeForm({
  projectId,
  defaultRole = "peão",
  triggerLabel = "Bater ponto",
}: TimeFormProps) {
  const router = useRouter();
  const createInitialDraft = (role = defaultRole): TimeDraft => ({
    workerName: "",
    workerRole: role,
    startedAt: nowHHMM(),
    endedAt: "",
    workedOn: todayBR(),
    notes: "",
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimeDraft>(() => createInitialDraft());
  const [savedSignature, setSavedSignature] = useState(() =>
    projectCommandSignature(createInitialDraft()),
  );
  const [geo, setGeo] = useState<GeoState | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validationErrors = useMemo(() => validateTimeDraft(draft), [draft]);
  const currentSignature = projectCommandSignature(draft);
  const isDirty = currentSignature !== savedSignature || geo !== null;
  const visibleErrors = showValidationErrors ? validationErrors : {};
  const visibleSuggestions =
    showSuggestions && draft.workerName.trim().length >= 2 ? suggestions : [];

  useEffect(() => {
    const query = draft.workerName.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2 || !showSuggestions) return;

    debounceRef.current = setTimeout(async () => {
      try {
        const names = await workerNamesAutocompleteAction(query);
        setSuggestions(
          names.filter((name) => name.toLowerCase() !== query.toLowerCase()),
        );
      } catch {
        setSuggestions([]);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [draft.workerName, showSuggestions]);

  useEffect(() => {
    if (!focusTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(focusTarget);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", inline: "nearest" });
      setFocusTarget(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusTarget]);

  useEffect(
    () => () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    },
    [],
  );

  function updateDraft(patch: Partial<TimeDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
    setSuccess(false);
  }

  function resetDraft(preserveRole: boolean) {
    const initial = createInitialDraft(
      preserveRole ? draft.workerRole : defaultRole,
    );
    setDraft(initial);
    setSavedSignature(projectCommandSignature(initial));
    setGeo(null);
    setGeoError(null);
    setGeoLoading(false);
    setError(null);
    setShowValidationErrors(false);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function resetAndClose() {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccess(false);
    resetDraft(false);
    setOpen(false);
  }

  function requestClose() {
    if (pending) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    resetAndClose();
  }

  function captureGeo() {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada neste dispositivo.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeo({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
        });
        setGeoLoading(false);
      },
      (geoFailure) => {
        setGeoError(
          geoFailure.code === geoFailure.PERMISSION_DENIED
            ? "Permissão de localização negada."
            : "Não foi possível obter a localização.",
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5_000, maximumAge: 60_000 },
    );
  }

  function submit() {
    setError(null);
    setSuccess(false);
    setShowValidationErrors(true);
    const firstError = validationErrors.workerName
      ? "time-worker-name"
      : validationErrors.workerRole
        ? "time-worker-role"
        : validationErrors.startedAt
          ? "time-started-at"
          : validationErrors.endedAt
            ? "time-ended-at"
            : validationErrors.workedOn
              ? "time-worked-on"
              : validationErrors.notes
                ? "time-notes"
                : null;
    if (firstError) {
      setFocusTarget(firstError);
      return;
    }

    startTransition(async () => {
      try {
        const result = await addTimeEntryAction(projectId, {
          worker_name: draft.workerName.trim(),
          worker_role: draft.workerRole.trim(),
          started_at: draft.startedAt,
          ended_at: draft.endedAt || undefined,
          worked_on: draft.workedOn,
          gps_lat: geo?.lat ?? null,
          gps_lng: geo?.lng ?? null,
          gps_accuracy_m: geo?.accuracy ?? null,
          notes: draft.notes.trim(),
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }

        setSuccess(true);
        setShowValidationErrors(false);
        router.refresh();
        successTimerRef.current = setTimeout(() => {
          resetDraft(true);
          setSuccess(false);
        }, 800);
      } catch {
        setError(
          "Não foi possível registrar o ponto agora. Verifique sua conexão e tente novamente.",
        );
      }
    });
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) setOpen(true);
          else requestClose();
        }}
      >
        <Button type="button" size="sm" className="h-10" onClick={() => setOpen(true)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {triggerLabel}
        </Button>

        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-lg overflow-y-auto p-4 sm:p-6">
          <ProtectedFormNavigation dirty={isDirty} contentLabel="neste ponto" />
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="text-base">Registrar ponto</DialogTitle>
            <DialogDescription>
              Registre horário, função e localização opcional da equipe.
            </DialogDescription>
          </DialogHeader>

          <form
            id="time-entry-form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="time-worker-name">Nome do profissional</Label>
              <div className="relative">
                <Input
                  id="time-worker-name"
                  name="time-worker-name"
                  autoFocus
                  autoComplete="off"
                  value={draft.workerName}
                  onChange={(event) => {
                    updateDraft({ workerName: event.target.value });
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    window.setTimeout(() => setShowSuggestions(false), 150)
                  }
                  placeholder="Ex: João da Silva"
                  maxLength={100}
                  disabled={pending}
                  aria-invalid={Boolean(visibleErrors.workerName)}
                  aria-describedby={
                    visibleErrors.workerName ? "time-worker-name-error" : undefined
                  }
                  aria-autocomplete="list"
                  aria-expanded={visibleSuggestions.length > 0}
                  aria-controls="time-worker-suggestions"
                />
                {visibleSuggestions.length > 0 && (
                  <div
                    id="time-worker-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover shadow-md"
                  >
                    {visibleSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        role="option"
                        aria-selected="false"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          updateDraft({ workerName: suggestion });
                          setShowSuggestions(false);
                        }}
                        className="block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {visibleErrors.workerName && (
                <p id="time-worker-name-error" className="text-xs text-destructive">
                  {visibleErrors.workerName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time-worker-role">Função</Label>
              <select
                id="time-worker-role"
                name="time-worker-role"
                value={draft.workerRole}
                onChange={(event) =>
                  updateDraft({ workerRole: event.target.value })
                }
                disabled={pending}
                aria-invalid={Boolean(visibleErrors.workerRole)}
                aria-describedby={
                  visibleErrors.workerRole ? "time-worker-role-error" : undefined
                }
                className="h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm"
              >
                <option value="encarregado">Encarregado</option>
                <option value="peão">Peão</option>
                <option value="ajudante">Ajudante</option>
                <option value="outro">Outro</option>
              </select>
              {visibleErrors.workerRole && (
                <p id="time-worker-role-error" className="text-xs text-destructive">
                  {visibleErrors.workerRole}
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="time-started-at">Entrada</Label>
                <Input
                  id="time-started-at"
                  name="time-started-at"
                  type="time"
                  value={draft.startedAt}
                  onChange={(event) =>
                    updateDraft({ startedAt: event.target.value })
                  }
                  disabled={pending}
                  aria-invalid={Boolean(visibleErrors.startedAt)}
                  aria-describedby={
                    visibleErrors.startedAt ? "time-started-at-error" : undefined
                  }
                />
                {visibleErrors.startedAt && (
                  <p id="time-started-at-error" className="text-xs text-destructive">
                    {visibleErrors.startedAt}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="time-ended-at">
                  Saída <span className="text-xs text-muted-foreground">(opcional)</span>
                </Label>
                <Input
                  id="time-ended-at"
                  name="time-ended-at"
                  type="time"
                  value={draft.endedAt}
                  onChange={(event) => updateDraft({ endedAt: event.target.value })}
                  disabled={pending}
                  aria-invalid={Boolean(visibleErrors.endedAt)}
                  aria-describedby={
                    visibleErrors.endedAt ? "time-ended-at-error" : undefined
                  }
                />
                {visibleErrors.endedAt && (
                  <p id="time-ended-at-error" className="text-xs text-destructive">
                    {visibleErrors.endedAt}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time-worked-on">Data</Label>
              <Input
                id="time-worked-on"
                name="time-worked-on"
                type="date"
                value={draft.workedOn}
                onChange={(event) => updateDraft({ workedOn: event.target.value })}
                disabled={pending}
                aria-invalid={Boolean(visibleErrors.workedOn)}
                aria-describedby={
                  visibleErrors.workedOn ? "time-worked-on-error" : undefined
                }
              />
              {visibleErrors.workedOn && (
                <p id="time-worked-on-error" className="text-xs text-destructive">
                  {visibleErrors.workedOn}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label>Localização</Label>
                {!geo && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={captureGeo}
                    disabled={geoLoading || pending}
                    className="h-10"
                  >
                    {geoLoading ? (
                      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                    )}
                    {geoLoading ? "Obtendo…" : "Marcar"}
                  </Button>
                )}
              </div>
              {geo ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                  Localização registrada, precisão aproximada de {geo.accuracy} m.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Opcional. O navegador pedirá permissão antes de registrar.
                </p>
              )}
              {geoError && <p className="text-xs text-destructive">{geoError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time-notes">
                Observações{" "}
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="time-notes"
                name="time-notes"
                value={draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder="Ex: saiu mais cedo, atestado"
                rows={2}
                maxLength={500}
                disabled={pending}
                aria-invalid={Boolean(visibleErrors.notes)}
                aria-describedby={visibleErrors.notes ? "time-notes-error" : undefined}
              />
              {visibleErrors.notes && (
                <p id="time-notes-error" className="text-xs text-destructive">
                  {visibleErrors.notes}
                </p>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            {success && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0" />
                Ponto registrado. O formulário será preparado para o próximo.
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={requestClose}
              disabled={pending}
            >
              Fechar
            </Button>
            <Button
              type="submit"
              form="time-entry-form"
              className="h-11"
              disabled={pending || success}
            >
              {pending ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Registrando…
                </>
              ) : (
                "Registrar ponto"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        contentLabel="deste ponto"
        onConfirm={() => {
          setConfirmDiscardOpen(false);
          resetAndClose();
        }}
      />
    </>
  );
}

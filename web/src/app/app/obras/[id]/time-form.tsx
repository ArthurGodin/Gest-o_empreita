"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayBR } from "@/lib/dates";
import {
  addTimeEntryAction,
  workerNamesAutocompleteAction,
} from "./actions";

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
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

export function TimeForm({ projectId, triggerLabel = "Bater ponto" }: TimeFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workerName, setWorkerName] = useState("");
  const [workerRole, setWorkerRole] = useState("peão");
  const [startedAt, setStartedAt] = useState(nowHHMM());
  const [endedAt, setEndedAt] = useState("");
  const [workedOn, setWorkedOn] = useState(todayBR());
  const [notes, setNotes] = useState("");
  const [geo, setGeo] = useState<GeoState | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleSuggestions =
    showSuggestions && workerName.trim().length >= 2 ? suggestions : [];

  // Debounced autocomplete
  useEffect(() => {
    const q = workerName.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2 || !showSuggestions) return;

    debounceRef.current = setTimeout(async () => {
      const names = await workerNamesAutocompleteAction(q);
      setSuggestions(names.filter((n) => n.toLowerCase() !== q.toLowerCase()));
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [workerName, showSuggestions]);

  function reset(preserveWorkerRole = true) {
    setWorkerName("");
    if (!preserveWorkerRole) setWorkerRole("peão");
    setStartedAt(nowHHMM());
    setEndedAt("");
    setNotes("");
    setGeo(null);
    setGeoError(null);
    setError(null);
    setSuggestions([]);
  }

  function captureGeo() {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada nesse dispositivo.");
      return;
    }
    setGeoError(null);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permissão negada."
            : "Não foi possível pegar a localização.",
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  }

  function submit() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const r = await addTimeEntryAction(projectId, {
        worker_name: workerName.trim(),
        worker_role: workerRole.trim(),
        started_at: startedAt,
        ended_at: endedAt || undefined,
        worked_on: workedOn,
        gps_lat: geo?.lat ?? null,
        gps_lng: geo?.lng ?? null,
        gps_accuracy_m: geo?.accuracy ?? null,
        notes: notes.trim(),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSuccess(true);
      router.refresh();
      // Reset campos do peão pra permitir bater outro, mantém data
      setTimeout(() => {
        reset(true);
        setSuccess(false);
      }, 800);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset(false);
      }}
    >
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {triggerLabel}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bater ponto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome do peão</label>
            <div className="relative">
              <Input
                autoFocus
                value={workerName}
                onChange={(e) => {
                  setWorkerName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Ex: João da Silva"
                maxLength={100}
                disabled={pending}
              />
              {visibleSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border bg-popover shadow-md">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setWorkerName(s);
                        setShowSuggestions(false);
                      }}
                      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Função</label>
            <select
              value={workerRole}
              onChange={(e) => setWorkerRole(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="encarregado">Encarregado</option>
              <option value="peão">Peão</option>
              <option value="ajudante">Ajudante</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Entrada</label>
              <Input
                type="time"
                value={startedAt}
                onChange={(e) => setStartedAt(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Saída <span className="text-xs text-muted-foreground">(opcional)</span>
              </label>
              <Input
                type="time"
                value={endedAt}
                onChange={(e) => setEndedAt(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Data</label>
            <Input
              type="date"
              value={workedOn}
              onChange={(e) => setWorkedOn(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Localização</label>
              {!geo && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={captureGeo}
                  disabled={geoLoading || pending}
                  className="h-7"
                >
                  {geoLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  Marcar
                </Button>
              )}
            </div>
            {geo ? (
              <div className="rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
                ✓ Localização registrada (precisão ~{geo.accuracy}m)
              </div>
            ) : geoError ? (
              <div className="text-xs text-muted-foreground">{geoError}</div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Opcional — clica em &ldquo;Marcar&rdquo; pra registrar onde foi batido.
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Notas <span className="text-xs text-muted-foreground">(opcional)</span>
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: saiu mais cedo, atestado"
              rows={2}
              maxLength={500}
              disabled={pending}
            />
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
              <CheckCircle2 className="h-4 w-4" />
              Ponto registrado · pode bater do próximo
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Fechar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

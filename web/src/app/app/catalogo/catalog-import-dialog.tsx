"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Download,
  FileSpreadsheet,
  Upload,
} from "lucide-react";
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
import { toast } from "@/components/ui/use-toast";
import { CATALOG_IMPORT_TEMPLATE } from "@/lib/catalog-import";
import { cn } from "@/lib/utils";
import {
  importCatalogCsvAction,
  type CatalogImportActionResult,
} from "./actions";

interface CatalogImportDialogProps {
  currentPlan: string;
  buttonClassName?: string;
}

export function CatalogImportDialog({
  currentPlan,
  buttonClassName,
}: CatalogImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<CatalogImportActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const isUltimate = currentPlan === "ultimate";

  function downloadTemplate() {
    const blob = new Blob([`\uFEFF${CATALOG_IMPORT_TEMPLATE}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "modelo_catalogo_prumo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setResult({ ok: false, error: "Selecione o CSV do catálogo." });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const nextResult = await importCatalogCsvAction(formData);
      setResult(nextResult);

      if (nextResult.ok) {
        router.refresh();
        toast({
          variant: "success",
          title: "Catálogo importado",
          description: `${nextResult.inserted} novo(s), ${nextResult.updated} atualizado(s).`,
        });
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={cn(
          "border-emerald-200 text-emerald-700 hover:bg-emerald-50",
          buttonClassName,
        )}
      >
        <Upload className="h-4 w-4" />
        Importar CSV
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setResult(null);
            setFileName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <DialogTitle>Importar catálogo por CSV</DialogTitle>
            <DialogDescription>
              Traga sua base antiga de serviços e materiais para o Prumo. O
              sistema cria itens novos e atualiza itens com a mesma descrição.
            </DialogDescription>
          </DialogHeader>

          {!isUltimate ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <div className="flex items-start gap-3">
                  <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <div className="font-semibold">
                      Importação em lote é exclusiva do Ultimate.
                    </div>
                    <p className="mt-1 leading-6">
                      No seu plano atual, você ainda pode cadastrar itens um por
                      um. O Ultimate libera importação de até 500 itens por CSV
                      para montar orçamentos muito mais rápido.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Continuar no manual
                </Button>
                <Button asChild>
                  <Link href="/app/configuracoes/plano">
                    Ver plano Ultimate
                  </Link>
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="text-sm font-medium">
                    Use o modelo para evitar erro de coluna
                  </div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Colunas aceitas: descrição, unidade e preço. Salve em CSV
                    separado por ponto e vírgula.
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Baixar modelo
                </Button>
              </div>

              <label className="block cursor-pointer rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-5 text-center transition hover:bg-emerald-50">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(event) => {
                    setResult(null);
                    setFileName(event.target.files?.[0]?.name ?? "");
                  }}
                />
                <Upload className="mx-auto h-7 w-7 text-emerald-700" />
                <div className="mt-3 text-sm font-semibold text-emerald-950">
                  {fileName || "Selecionar arquivo CSV"}
                </div>
                <div className="mt-1 text-xs text-emerald-900/70">
                  Até 1 MB e 500 itens por importação
                </div>
              </label>

              {result ? <ImportResult result={result} /> : null}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Fechar
                </Button>
                <Button type="submit" disabled={pending}>
                  <Upload className="h-4 w-4" />
                  {pending ? "Importando..." : "Importar catálogo"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ImportResult({ result }: { result: CatalogImportActionResult }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
        <div className="flex items-start gap-2 font-medium">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {result.error}
        </div>
        {result.errors?.length ? (
          <ul className="mt-2 space-y-1 pl-6 text-xs">
            {result.errors.slice(0, 5).map((error) => (
              <li key={`${error.row}-${error.message}`} className="list-disc">
                Linha {error.row}: {error.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
      <div className="flex items-start gap-2 font-semibold">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        Importação concluída
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Metric label="Novos" value={result.inserted} />
        <Metric label="Atualizados" value={result.updated} />
        <Metric label="Ignorados" value={result.ignored} />
        <Metric label="Pendências" value={result.invalid} />
      </div>
      {result.errors.length ? (
        <ul className="mt-3 space-y-1 border-t border-emerald-200 pt-3 text-xs">
          {result.errors.map((error) => (
            <li key={`${error.row}-${error.message}`}>
              Linha {error.row}: {error.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/70 px-3 py-2">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-emerald-900/70">
        {label}
      </div>
    </div>
  );
}

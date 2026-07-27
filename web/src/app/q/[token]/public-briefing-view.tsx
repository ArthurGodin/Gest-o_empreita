"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  calculateBriefingProgress,
  calculateBriefingSectionProgress,
  formatBriefingAnswer,
  validateBriefingAnswers,
  type BriefingAnswer,
  type BriefingAnswers,
  type BriefingQuestion,
  type BriefingSection,
} from "@/lib/briefings";
import type { PublicProjectBriefing } from "@/lib/queries/briefings";
import { trackProductEvent } from "@/lib/product-analytics";
import { cn } from "@/lib/utils";
import {
  savePublicBriefingAnswersAction,
  submitPublicBriefingAction,
} from "./briefing-actions";

type SaveState = "saved" | "pending" | "saving" | "error" | "conflict";

interface PublicBriefingViewProps {
  briefing: PublicProjectBriefing;
  shareToken: string;
}

const AUTOSAVE_DELAY_MS = 800;

export function PublicBriefingView({
  briefing,
  shareToken,
}: PublicBriefingViewProps) {
  const router = useRouter();
  const revision = briefing.activeRevision;
  const snapshot = revision.snapshot;
  const initiallyEditable =
    briefing.status === "shared" && revision.submittedAt === null;
  const [answers, setAnswers] = useState<BriefingAnswers>(revision.answers);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [respondentName, setRespondentName] = useState(
    revision.respondentName ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState(revision.submittedAt);

  const answersRef = useRef(answers);
  const editVersionRef = useRef(revision.editVersion);
  const lastSavedJsonRef = useRef(JSON.stringify(revision.answers));
  const savingRef = useRef(false);
  const conflictRef = useRef(false);
  const queuedRef = useRef(false);
  const activeSaveRef = useRef<Promise<boolean> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editable =
    initiallyEditable && submittedAt === null && saveState !== "conflict";
  const reviewStep = snapshot.sections.length;
  const progress = calculateBriefingProgress(snapshot, answers);

  useEffect(() => {
    trackProductEvent("briefing_public_opened", {
      template: snapshot.key,
      status: briefing.status,
    });
  }, [briefing.status, snapshot.key]);

  const flushSaves = useCallback(async (): Promise<boolean> => {
    if (!initiallyEditable || submittedAt) return true;
    if (conflictRef.current) return false;

    if (savingRef.current) {
      queuedRef.current = true;
      return activeSaveRef.current ?? false;
    }

    savingRef.current = true;
    const activeSave = (async () => {
      let succeeded = true;

      do {
        queuedRef.current = false;
        const currentAnswers = answersRef.current;
        const currentJson = JSON.stringify(currentAnswers);
        if (currentJson === lastSavedJsonRef.current) continue;

        setSaveState("saving");
        setSaveError(null);

        let result;
        try {
          result = await savePublicBriefingAnswersAction({
            shareToken,
            revisionId: revision.id,
            answers: currentAnswers,
            expectedEditVersion: editVersionRef.current,
          });
        } catch {
          succeeded = false;
          setSaveError(
            "Não foi possível salvar agora. Confira sua conexão e tente novamente.",
          );
          setSaveState("error");
          break;
        }

        if (!result.ok) {
          succeeded = false;
          setSaveError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          if (result.code === "edit_conflict") {
            conflictRef.current = true;
            setSaveState("conflict");
          } else {
            setSaveState("error");
          }
          break;
        }

        editVersionRef.current = result.editVersion;
        lastSavedJsonRef.current = currentJson;
        queuedRef.current =
          JSON.stringify(answersRef.current) !== currentJson;
      } while (queuedRef.current);

      savingRef.current = false;
      activeSaveRef.current = null;
      if (succeeded) {
        setSaveState("saved");
        setSaveError(null);
      }
      return succeeded;
    })();

    activeSaveRef.current = activeSave;
    return activeSave;
  }, [
    initiallyEditable,
    revision.id,
    shareToken,
    submittedAt,
  ]);

  useEffect(() => {
    answersRef.current = answers;
    if (!editable) return;
    if (JSON.stringify(answers) === lastSavedJsonRef.current) return;

    setSaveState((current) =>
      current === "conflict" ? current : "pending",
    );
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      void flushSaves();
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, editable, flushSaves]);

  useEffect(() => {
    function warnBeforeLeaving(event: BeforeUnloadEvent) {
      const hasUnsavedChanges =
        JSON.stringify(answersRef.current) !== lastSavedJsonRef.current ||
        savingRef.current;
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, []);

  function updateAnswer(questionId: string, value: BriefingAnswer) {
    setAnswers((current) => {
      const next = { ...current, [questionId]: value };
      answersRef.current = next;
      return next;
    });
    setFieldErrors((current) => {
      if (!current[questionId]) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  async function moveTo(step: number) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const saved = await flushSaves();
    if (!saved) return;
    setCurrentStep(Math.max(0, Math.min(step, reviewStep)));
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }

  async function submitBriefing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (respondentName.trim().length < 2) {
      setSaveError("Informe seu nome para enviar o briefing.");
      return;
    }

    const validation = validateBriefingAnswers(snapshot, answersRef.current, {
      requireComplete: true,
    });
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setSaveError(validation.error);
      const firstInvalidSection = snapshot.sections.findIndex((section) =>
        section.questions.some(
          (question) => validation.fieldErrors[question.id],
        ),
      );
      if (firstInvalidSection >= 0) setCurrentStep(firstInvalidSection);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const saved = await flushSaves();
    if (!saved) return;

    setSubmitting(true);
    try {
      const result = await submitPublicBriefingAction({
        shareToken,
        revisionId: revision.id,
        answers: validation.answers,
        expectedEditVersion: editVersionRef.current,
        respondentName,
      });

      if (!result.ok) {
        setSaveError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        if (result.code === "edit_conflict") {
          conflictRef.current = true;
          setSaveState("conflict");
        }
        return;
      }

      editVersionRef.current = result.editVersion;
      setSubmittedAt(result.submittedAt);
      setSaveState("saved");
      trackProductEvent("briefing_submitted", {
        template: snapshot.key,
        revision: revision.revisionNumber,
      });
      router.refresh();
    } catch {
      setSaveError(
        "Não foi possível enviar agora. Confira sua conexão e tente novamente.",
      );
      setSaveState("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!initiallyEditable || submittedAt) {
    return (
      <ReadOnlyBriefing
        briefing={briefing}
        submittedAt={submittedAt}
        answers={answers}
      />
    );
  }

  const activeSection =
    currentStep < reviewStep ? snapshot.sections[currentStep] : null;

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-lg border bg-card shadow-sm">
      <header className="border-b px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700">
              <ClipboardCheck aria-hidden="true" className="h-4 w-4" />
              Briefing do projeto
            </div>
            <h1 className="mt-1 text-lg font-semibold text-foreground sm:text-xl">
              {snapshot.name}
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {snapshot.description}
            </p>
          </div>
          <SaveIndicator state={saveState} />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Progresso do briefing"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-semibold text-slate-600">
            {progress}%
          </span>
        </div>
      </header>

      <nav
        aria-label="Etapas do briefing"
        className="overflow-x-auto border-b bg-slate-50/70 px-3 py-2"
      >
        <ol className="flex min-w-max items-center gap-1">
          {snapshot.sections.map((section, index) => {
            const complete =
              calculateBriefingSectionProgress(section, answers) === 100;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => void moveTo(index)}
                  aria-current={currentStep === index ? "step" : undefined}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    currentStep === index
                      ? "bg-emerald-700 text-white"
                      : "text-slate-600 hover:bg-white hover:text-slate-950",
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px]",
                      currentStep === index
                        ? "border-white/40"
                        : complete
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-300 bg-white",
                    )}
                  >
                    {complete ? <Check className="h-3 w-3" /> : index + 1}
                  </span>
                  {section.title}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => void moveTo(reviewStep)}
              aria-current={currentStep === reviewStep ? "step" : undefined}
              className={cn(
                "inline-flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                currentStep === reviewStep
                  ? "bg-emerald-700 text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-950",
              )}
            >
              <ClipboardCheck className="h-4 w-4" />
              Revisar
            </button>
          </li>
        </ol>
      </nav>

      <form onSubmit={submitBriefing}>
        <div className="px-4 py-5 sm:px-6 sm:py-6">
          {saveError ? (
            <div
              role="alert"
              className="mb-5 flex gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              <AlertCircle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <div>
                <p className="font-semibold">
                  {saveState === "conflict"
                    ? "Há uma versão mais recente"
                    : "Revise antes de continuar"}
                </p>
                <p className="mt-0.5 leading-5">{saveError}</p>
                {saveState === "conflict" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.reload()}
                    className="mt-3"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Recarregar respostas
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeSection ? (
            <BriefingSectionFields
              section={activeSection}
              answers={answers}
              fieldErrors={fieldErrors}
              disabled={!editable}
              onChange={updateAnswer}
            />
          ) : (
            <BriefingReview
              sections={snapshot.sections}
              answers={answers}
              respondentName={respondentName}
              onRespondentNameChange={setRespondentName}
              disabled={!editable || submitting}
            />
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t bg-slate-50/70 px-4 py-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => void moveTo(currentStep - 1)}
            disabled={currentStep === 0 || !editable || submitting}
            className="min-h-11"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          {currentStep < reviewStep ? (
            <Button
              type="button"
              onClick={() => void moveTo(currentStep + 1)}
              disabled={!editable || submitting}
              className="min-h-11"
            >
              Continuar
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!editable || submitting}
              className="min-h-11"
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar briefing
            </Button>
          )}
        </footer>
      </form>
    </section>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span
        role="status"
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500"
      >
        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
        Salvando
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span
        role="status"
        className="shrink-0 text-xs font-medium text-slate-500"
      >
        Alterado
      </span>
    );
  }
  if (state === "error" || state === "conflict") {
    return (
      <span
        role="status"
        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-rose-700"
      >
        <AlertCircle aria-hidden="true" className="h-3.5 w-3.5" />
        Não salvo
      </span>
    );
  }
  return (
    <span
      role="status"
      className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700"
    >
      <Check aria-hidden="true" className="h-3.5 w-3.5" />
      Salvo
    </span>
  );
}

function BriefingSectionFields({
  section,
  answers,
  fieldErrors,
  disabled,
  onChange,
}: {
  section: BriefingSection;
  answers: BriefingAnswers;
  fieldErrors: Record<string, string>;
  disabled: boolean;
  onChange: (questionId: string, value: BriefingAnswer) => void;
}) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-base font-semibold text-foreground">
        {section.title}
      </legend>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {section.description}
      </p>
      <div className="mt-6 space-y-6">
        {section.questions.map((question) => (
          <BriefingQuestionField
            key={question.id}
            question={question}
            answer={answers[question.id]}
            error={fieldErrors[question.id]}
            onChange={(value) => onChange(question.id, value)}
          />
        ))}
      </div>
    </fieldset>
  );
}

function BriefingQuestionField({
  question,
  answer,
  error,
  onChange,
}: {
  question: BriefingQuestion;
  answer: BriefingAnswer | undefined;
  error?: string;
  onChange: (value: BriefingAnswer) => void;
}) {
  const fieldId = `briefing-${question.id}`;
  const describedBy = [
    question.description ? `${fieldId}-description` : null,
    error ? `${fieldId}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const label = (
    <>
      {question.label}
      {question.required ? (
        <>
          <span aria-hidden="true" className="ml-1 text-rose-600">
            *
          </span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      ) : null}
    </>
  );

  const details = (
    <>
      {question.description ? (
        <p
          id={`${fieldId}-description`}
          className="mt-1 text-xs leading-5 text-muted-foreground"
        >
          {question.description}
        </p>
      ) : null}
      {error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </>
  );

  if (
    question.kind === "single_choice" ||
    question.kind === "multi_choice"
  ) {
    const selected = Array.isArray(answer) ? answer : [];
    return (
      <fieldset aria-describedby={describedBy || undefined}>
        <legend className="text-sm font-semibold text-foreground">
          {label}
        </legend>
        {details}
        <div
          className={cn(
            "mt-2 grid gap-2 sm:grid-cols-2",
            error && "rounded-md ring-2 ring-rose-200",
          )}
        >
          {question.options?.map((option) => {
            const checked =
              question.kind === "multi_choice"
                ? selected.includes(option.value)
                : answer === option.value;
            return (
              <label
                key={option.value}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                <input
                  type={
                    question.kind === "multi_choice" ? "checkbox" : "radio"
                  }
                  name={fieldId}
                  value={option.value}
                  checked={checked}
                  onChange={() => {
                    if (question.kind === "multi_choice") {
                      onChange(
                        checked
                          ? selected.filter((value) => value !== option.value)
                          : [...selected, option.value],
                      );
                    } else {
                      onChange(option.value);
                    }
                  }}
                  className="h-4 w-4 shrink-0 accent-emerald-700"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  if (question.kind === "boolean") {
    return (
      <fieldset aria-describedby={describedBy || undefined}>
        <legend className="text-sm font-semibold text-foreground">
          {label}
        </legend>
        {details}
        <div
          className={cn(
            "mt-2 grid grid-cols-2 gap-2",
            error && "rounded-md ring-2 ring-rose-200",
          )}
        >
          {[
            { value: true, label: "Sim" },
            { value: false, label: "Não" },
          ].map((option) => (
            <label
              key={String(option.value)}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors",
                answer === option.value
                  ? "border-emerald-600 bg-emerald-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name={fieldId}
                checked={answer === option.value}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (question.kind === "priority") {
    const min = question.min ?? 1;
    const max = question.max ?? 5;
    const values = Array.from(
      { length: max - min + 1 },
      (_, index) => min + index,
    );
    return (
      <fieldset aria-describedby={describedBy || undefined}>
        <legend className="text-sm font-semibold text-foreground">
          {label}
        </legend>
        {details}
        <div className="mt-2 grid grid-cols-5 gap-2">
          {values.map((value) => (
            <label
              key={value}
              className={cn(
                "flex min-h-11 cursor-pointer items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                answer === value
                  ? "border-emerald-600 bg-emerald-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
              )}
            >
              <input
                type="radio"
                name={fieldId}
                checked={answer === value}
                onChange={() => onChange(value)}
                className="sr-only"
              />
              {value}
            </label>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>Menor</span>
          <span>Maior</span>
        </div>
      </fieldset>
    );
  }

  const commonProps = {
    id: fieldId,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy || undefined,
    className: cn(
      "mt-2 min-h-11 text-base sm:text-sm",
      error && "border-rose-400 focus-visible:ring-rose-200",
    ),
  };

  if (question.kind === "long_text") {
    return (
      <div>
        <Label htmlFor={fieldId} className="text-sm font-semibold">
          {label}
        </Label>
        {question.description ? details : null}
        <Textarea
          {...commonProps}
          value={typeof answer === "string" ? answer : ""}
          maxLength={question.maxLength}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
        {!question.description ? details : error ? null : null}
        {!question.description && error ? (
          <p
            id={`${fieldId}-error`}
            role="alert"
            className="mt-1.5 text-xs font-medium text-rose-700"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  const numeric =
    question.kind === "number" || question.kind === "currency";
  return (
    <div>
      <Label htmlFor={fieldId} className="text-sm font-semibold">
        {label}
      </Label>
      {question.description ? details : null}
      <Input
        {...commonProps}
        type={
          question.kind === "date"
            ? "date"
            : numeric
              ? "number"
              : "text"
        }
        inputMode={numeric ? "decimal" : undefined}
        min={numeric ? question.min : undefined}
        max={numeric ? question.max : undefined}
        step={numeric ? "any" : undefined}
        maxLength={
          question.kind === "short_text" ? question.maxLength : undefined
        }
        value={
          numeric
            ? typeof answer === "number"
              ? answer
              : ""
            : typeof answer === "string"
              ? answer
              : ""
        }
        onChange={(event) =>
          onChange(
            numeric
              ? event.target.value === ""
                ? null
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
      {!question.description && error ? (
        <p
          id={`${fieldId}-error`}
          role="alert"
          className="mt-1.5 text-xs font-medium text-rose-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function BriefingReview({
  sections,
  answers,
  respondentName,
  onRespondentNameChange,
  disabled,
}: {
  sections: readonly BriefingSection[];
  answers: BriefingAnswers;
  respondentName: string;
  onRespondentNameChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">
        Revise suas respostas
      </h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Confira os pontos principais antes de enviar ao escritório.
      </p>

      <div className="mt-5 divide-y rounded-md border">
        {sections.map((section) => (
          <div key={section.id} className="px-3 py-4 sm:px-4">
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
            <dl className="mt-3 space-y-3">
              {section.questions.map((question) => (
                <div key={question.id}>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {question.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-5 text-foreground">
                    {formatBriefingAnswer(question, answers[question.id])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <Label htmlFor="briefing-respondent-name">
          Seu nome <span aria-hidden="true" className="text-rose-600">*</span>
        </Label>
        <Input
          id="briefing-respondent-name"
          value={respondentName}
          onChange={(event) => onRespondentNameChange(event.target.value)}
          maxLength={120}
          disabled={disabled}
          autoComplete="name"
          className="mt-2 min-h-11 text-base sm:text-sm"
        />
      </div>
    </div>
  );
}

function ReadOnlyBriefing({
  briefing,
  submittedAt,
  answers,
}: {
  briefing: PublicProjectBriefing;
  submittedAt: string | null;
  answers: BriefingAnswers;
}) {
  const snapshot = briefing.activeRevision.snapshot;
  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-lg border bg-card shadow-sm">
      <header className="border-b bg-emerald-50/70 px-4 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-emerald-800">
              {briefing.status === "reviewed"
                ? "Revisado pelo escritório"
                : "Briefing enviado"}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-foreground">
              {snapshot.name}
            </h1>
            {submittedAt ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Recebido em{" "}
                {new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "long",
                  timeStyle: "short",
                }).format(new Date(submittedAt))}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="divide-y">
        {snapshot.sections.map((section) => (
          <section key={section.id} className="px-4 py-5 sm:px-6">
            <h2 className="text-sm font-semibold text-foreground">
              {section.title}
            </h2>
            <dl className="mt-3 space-y-3">
              {section.questions.map((question) => (
                <div key={question.id}>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {question.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm leading-5">
                    {formatBriefingAnswer(question, answers[question.id])}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </section>
  );
}

import { describe, expect, it } from "vitest";
import {
  BRIEFING_TEMPLATES,
  calculateBriefingProgress,
  calculateBriefingSectionProgress,
  getBriefingTemplate,
  getBriefingTemplatesForSegment,
  getSuggestedProjectSpaces,
  parseBriefingTemplateSnapshot,
  validateBriefingAnswers,
  type BriefingAnswers,
} from "./briefings";

describe("briefings domain", () => {
  it("ships valid versioned templates for architecture and interiors", () => {
    expect(getBriefingTemplatesForSegment("architecture")).toHaveLength(1);
    expect(getBriefingTemplatesForSegment("interiors")).toHaveLength(2);

    for (const template of BRIEFING_TEMPLATES) {
      expect(parseBriefingTemplateSnapshot(template)).toEqual(template);
      expect(template.sections.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("returns a detached snapshot for the selected segment", () => {
    const first = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    );
    const second = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    );

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second);
    expect(
      getBriefingTemplate("architecture-residential-v1", "interiors"),
    ).toBeNull();
  });

  it("normalizes partial answers without requiring completion", () => {
    const template = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    )!;
    const result = validateBriefingAnswers(template, {
      project_goal: "  Criar uma casa iluminada. ",
      project_scope: "new",
      resident_count: 4,
      accessibility: false,
      residential_spaces: ["cozinha", "sala_estar", "cozinha"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.answers.project_goal).toBe("Criar uma casa iluminada.");
    expect(result.answers.residential_spaces).toEqual([
      "cozinha",
      "sala_estar",
    ]);
    expect(result.missingRequired.length).toBeGreaterThan(0);
  });

  it("rejects unknown choices, invalid dates and oversized text", () => {
    const template = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    )!;
    const result = validateBriefingAnswers(template, {
      project_scope: "invalid",
      target_date: "2026-02-31",
      project_goal: "x".repeat(1501),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.fieldErrors.project_scope).toBeDefined();
    expect(result.fieldErrors.target_date).toBeDefined();
    expect(result.fieldErrors.project_goal).toContain("1500");
  });

  it("requires every mandatory answer only on final submission", () => {
    const template = getBriefingTemplate(
      "interiors-commercial-v1",
      "interiors",
    )!;
    const result = validateBriefingAnswers(
      template,
      { business_type: "Cafeteria" },
      { requireComplete: true },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missingRequired).toContain("business_goal");
    expect(result.fieldErrors.business_goal).toContain("Responda");
  });

  it("calculates progress using mandatory fields only", () => {
    const template = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    )!;
    const emptyProgress = calculateBriefingProgress(template, {});
    const requiredQuestions = template.sections.flatMap((section) =>
      section.questions.filter((question) => question.required),
    );
    const completeAnswers: BriefingAnswers = {};

    for (const question of requiredQuestions) {
      if (question.kind === "boolean") completeAnswers[question.id] = false;
      else if (
        question.kind === "number" ||
        question.kind === "currency" ||
        question.kind === "priority"
      ) {
        completeAnswers[question.id] = question.min ?? 1;
      } else if (question.kind === "multi_choice") {
        completeAnswers[question.id] = [question.options![0]!.value];
      } else if (question.kind === "single_choice") {
        completeAnswers[question.id] = question.options![0]!.value;
      } else if (question.kind === "date") {
        completeAnswers[question.id] = "2026-08-01";
      } else {
        completeAnswers[question.id] = "Resposta";
      }
    }

    expect(emptyProgress).toBe(0);
    expect(calculateBriefingProgress(template, completeAnswers)).toBe(100);
    expect(
      calculateBriefingSectionProgress(
        template.sections[0]!,
        completeAnswers,
      ),
    ).toBe(100);
  });

  it("derives unique spaces from selected briefing options", () => {
    const template = getBriefingTemplate(
      "interiors-residential-v1",
      "interiors",
    )!;
    expect(
      getSuggestedProjectSpaces(template, {
        interiors_spaces: ["sala_estar", "cozinha", "banheiro"],
      }),
    ).toEqual([
      {
        name: "Sala de estar",
        spaceType: "living",
        sourceQuestionId: "interiors_spaces",
      },
      {
        name: "Cozinha",
        spaceType: "kitchen",
        sourceQuestionId: "interiors_spaces",
      },
      {
        name: "Banheiro",
        spaceType: "bathroom",
        sourceQuestionId: "interiors_spaces",
      },
    ]);
  });

  it("rejects malformed snapshots and duplicate question ids", () => {
    const template = getBriefingTemplate(
      "architecture-residential-v1",
      "architecture",
    )!;
    const duplicate = structuredClone(template);
    duplicate.sections[1]!.questions = [
      ...duplicate.sections[1]!.questions,
      duplicate.sections[0]!.questions[0]!,
    ];

    expect(parseBriefingTemplateSnapshot(duplicate)).toBeNull();
    expect(
      parseBriefingTemplateSnapshot({
        ...template,
        version: 0,
      }),
    ).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import {
  QUALITY_SCORE_PROMPT,
  QualityScoreInputSchema,
  QualityScoreOutputSchema,
  type QualityScoreInput,
} from "../prompts/quality-score";

describe("Quality Score - Input Schema", () => {
  const validInput: QualityScoreInput = {
    documentContent: "Nội dung tài liệu test cho AI agent",
    documentCategory: "system-prompt",
    domainContext: "TechShop - ecommerce / sales (friendly)",
  };

  it("validates correct input", () => {
    const result = QualityScoreInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty documentContent", () => {
    const result = QualityScoreInputSchema.safeParse({
      ...validInput,
      documentContent: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing documentCategory", () => {
    const { documentCategory, ...rest } = validInput;
    const result = QualityScoreInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing domainContext", () => {
    const { domainContext, ...rest } = validInput;
    const result = QualityScoreInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });
});

describe("Quality Score - Output Schema", () => {
  it("validates correct output", () => {
    const validOutput = {
      score: 85,
      breakdown: { relevance: 90, completeness: 80, clarity: 85, tone: 85 },
      issues: ["Thiếu phần FAQ"],
      suggestions: ["Thêm ví dụ cụ thể"],
    };
    const result = QualityScoreOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it("rejects score > 100", () => {
    const result = QualityScoreOutputSchema.safeParse({
      score: 101,
      breakdown: { relevance: 90, completeness: 80, clarity: 85, tone: 85 },
      issues: [],
      suggestions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects score < 0", () => {
    const result = QualityScoreOutputSchema.safeParse({
      score: -1,
      breakdown: { relevance: 90, completeness: 80, clarity: 85, tone: 85 },
      issues: [],
      suggestions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing breakdown fields", () => {
    const result = QualityScoreOutputSchema.safeParse({
      score: 85,
      breakdown: { relevance: 90 },
      issues: [],
      suggestions: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty issues and suggestions", () => {
    const result = QualityScoreOutputSchema.safeParse({
      score: 100,
      breakdown: { relevance: 100, completeness: 100, clarity: 100, tone: 100 },
      issues: [],
      suggestions: [],
    });
    expect(result.success).toBe(true);
  });

  it("validates breakdown scores are 0-100", () => {
    const result = QualityScoreOutputSchema.safeParse({
      score: 85,
      breakdown: { relevance: 150, completeness: 80, clarity: 85, tone: 85 },
      issues: [],
      suggestions: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("Quality Score - Prompt Builder", () => {
  const input: QualityScoreInput = {
    documentContent: "# System Prompt\n\nBạn là AI assistant...",
    documentCategory: "system-prompt",
    domainContext: "TechShop - ecommerce / sales (friendly)",
  };

  it("builds user message with document content", () => {
    const message = QUALITY_SCORE_PROMPT.buildUserMessage(input);
    expect(message).toContain("# System Prompt");
    expect(message).toContain("Bạn là AI assistant");
  });

  it("includes document category", () => {
    const message = QUALITY_SCORE_PROMPT.buildUserMessage(input);
    expect(message).toContain("system-prompt");
  });

  it("includes domain context", () => {
    const message = QUALITY_SCORE_PROMPT.buildUserMessage(input);
    expect(message).toContain("TechShop");
    expect(message).toContain("ecommerce");
  });

  it("has correct task type", () => {
    expect(QUALITY_SCORE_PROMPT.task).toBe("score");
  });

  it("has system prompt with scoring criteria", () => {
    expect(QUALITY_SCORE_PROMPT.system).toContain("relevance");
    expect(QUALITY_SCORE_PROMPT.system).toContain("completeness");
    expect(QUALITY_SCORE_PROMPT.system).toContain("clarity");
    expect(QUALITY_SCORE_PROMPT.system).toContain("tone");
  });

  it("has maxTokens set", () => {
    expect(QUALITY_SCORE_PROMPT.maxTokens).toBeGreaterThan(0);
  });
});

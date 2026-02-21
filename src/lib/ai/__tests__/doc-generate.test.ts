import { describe, it, expect } from "vitest";
import {
  DOC_GENERATE_PROMPT,
  DocGenerateInputSchema,
  type DocGenerateInput,
} from "../prompts/doc-generate";

describe("Doc Generate - Input Schema", () => {
  const validInput: DocGenerateInput = {
    domainName: "TechShop",
    industry: "ecommerce",
    function: "sales",
    tone: "friendly",
    templateContent: "Template nội dung test",
    templateVariables: { company_name: "TechShop", industry: "ecommerce" },
    documentCategory: "system-prompt",
  };

  it("validates correct input", () => {
    const result = DocGenerateInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects missing domainName", () => {
    const { domainName, ...rest } = validInput;
    const result = DocGenerateInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing industry", () => {
    const { industry, ...rest } = validInput;
    const result = DocGenerateInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects missing templateContent", () => {
    const { templateContent, ...rest } = validInput;
    const result = DocGenerateInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("accepts empty templateVariables", () => {
    const result = DocGenerateInputSchema.safeParse({
      ...validInput,
      templateVariables: {},
    });
    expect(result.success).toBe(true);
  });
});

describe("Doc Generate - Prompt Builder", () => {
  const input: DocGenerateInput = {
    domainName: "TechShop",
    industry: "ecommerce",
    function: "sales",
    tone: "friendly",
    templateContent: "# Template\n\n[AI_FILL: nội dung]",
    templateVariables: { company_name: "TechShop", industry: "ecommerce" },
    documentCategory: "system-prompt",
  };

  it("builds user message with domain info", () => {
    const message = DOC_GENERATE_PROMPT.buildUserMessage(input);
    expect(message).toContain("TechShop");
    expect(message).toContain("ecommerce");
    expect(message).toContain("sales");
    expect(message).toContain("friendly");
  });

  it("includes template content in message", () => {
    const message = DOC_GENERATE_PROMPT.buildUserMessage(input);
    expect(message).toContain("# Template");
    expect(message).toContain("[AI_FILL: nội dung]");
  });

  it("includes template variables", () => {
    const message = DOC_GENERATE_PROMPT.buildUserMessage(input);
    expect(message).toContain("company_name: TechShop");
    expect(message).toContain("industry: ecommerce");
  });

  it("includes document category", () => {
    const message = DOC_GENERATE_PROMPT.buildUserMessage(input);
    expect(message).toContain("system-prompt");
  });

  it("has correct task type", () => {
    expect(DOC_GENERATE_PROMPT.task).toBe("generate");
  });

  it("has system prompt defined", () => {
    expect(DOC_GENERATE_PROMPT.system).toBeTruthy();
    expect(DOC_GENERATE_PROMPT.system).toContain("JSON");
  });

  it("has maxTokens set", () => {
    expect(DOC_GENERATE_PROMPT.maxTokens).toBeGreaterThan(0);
  });
});

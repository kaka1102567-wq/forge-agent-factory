import { z } from "zod/v4";

// Schema cho input sinh tài liệu
export const DocGenerateInputSchema = z.object({
  domainName: z.string(),
  industry: z.string(),
  function: z.string(),
  tone: z.string(),
  templateContent: z.string(),
  templateVariables: z.record(z.string(), z.string()),
  documentCategory: z.string(),
});

// Schema cho output
export const DocGenerateOutputSchema = z.object({
  title: z.string(),
  content: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      body: z.string(),
    })
  ),
});

export type DocGenerateInput = z.infer<typeof DocGenerateInputSchema>;
export type DocGenerateOutput = z.infer<typeof DocGenerateOutputSchema>;

// Prompt template — Sonnet sinh nội dung tài liệu từ template + domain context
export const DOC_GENERATE_PROMPT = {
  task: "generate" as const,
  system: `Bạn là chuyên gia tạo nội dung cho AI agent. Sinh tài liệu chất lượng cao dựa trên template và context domain.

Yêu cầu:
- Nội dung phải phù hợp với ngành nghề và giọng điệu
- Thay thế tất cả biến template bằng nội dung thực tế
- Chia thành các section rõ ràng
- Trả về JSON với: title, content (full text), sections (array of {heading, body})

Trả về JSON thuần, không markdown wrapper.`,

  buildUserMessage: (input: DocGenerateInput): string => {
    const vars = Object.entries(input.templateVariables)
      .map(([k, v]) => `  ${k}: ${v}`)
      .join("\n");

    return `Domain: ${input.domainName} (${input.industry} / ${input.function})
Giọng điệu: ${input.tone}
Loại tài liệu: ${input.documentCategory}

Template:
${input.templateContent}

Biến cần thay thế:
${vars}

Sinh nội dung tài liệu hoàn chỉnh.`;
  },

  maxTokens: 4096,
} as const;

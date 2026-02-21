import { z } from "zod/v4";

// Schema cho input lắp ráp agent
export const AgentAssembleInputSchema = z.object({
  domainName: z.string(),
  industry: z.string(),
  function: z.string(),
  archetype: z.string(),
  tone: z.string(),
  channels: z.array(z.string()),
  documents: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      content: z.string(),
    })
  ),
});

// Schema cho output
export const AgentAssembleOutputSchema = z.object({
  systemPrompt: z.string(),
  config: z.object({
    temperature: z.number().min(0).max(1),
    maxTokens: z.number(),
    stopSequences: z.array(z.string()).optional(),
  }),
  capabilities: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type AgentAssembleInput = z.infer<typeof AgentAssembleInputSchema>;
export type AgentAssembleOutput = z.infer<typeof AgentAssembleOutputSchema>;

// Prompt template — Opus lắp ráp system prompt từ documents
export const AGENT_ASSEMBLE_PROMPT = {
  task: "assemble" as const,
  system: `Bạn là kiến trúc sư AI agent. Nhiệm vụ: tổng hợp các tài liệu domain thành system prompt hoàn chỉnh cho agent.

System prompt PHẢI có đúng 4 sections với headers markdown ## :

## IDENTITY
- Vai trò, tên, personality của agent
- Ngành, chức năng, giọng điệu

## KNOWLEDGE
- Tổng hợp domain knowledge từ tất cả tài liệu nguồn
- Framework, quy trình, data points, methodology

## BEHAVIOR
- Quy tắc trả lời: format, độ dài, ngôn ngữ
- Workflow xử lý từng loại request
- Phù hợp kênh triển khai

## GUARDRAILS
- Những gì agent KHÔNG được làm
- Khi nào cần escalate sang người thật
- Chủ đề bị chặn

Trả về JSON:
- systemPrompt: full system prompt text (với 4 sections ## ở trên)
- config: {temperature, maxTokens, stopSequences?}
- capabilities: danh sách khả năng của agent
- limitations: danh sách giới hạn

JSON thuần, không markdown wrapper.`,

  buildUserMessage: (input: AgentAssembleInput): string => {
    const docs = input.documents
      .map(
        (d, i) =>
          `--- Tài liệu ${i + 1}: ${d.title} [${d.category}] ---\n${d.content}`
      )
      .join("\n\n");

    return `Domain: ${input.domainName}
Ngành: ${input.industry}
Chức năng: ${input.function}
Archetype: ${input.archetype}
Giọng điệu: ${input.tone}
Kênh: ${input.channels.join(", ")}

Tài liệu nguồn:
${docs}

Lắp ráp system prompt hoàn chỉnh cho agent.`;
  },

  maxTokens: 8192,
} as const;

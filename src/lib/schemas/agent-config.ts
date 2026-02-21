import { z } from "zod/v4";

// Schema cho cấu hình agent — lưu trong Agent.config (Json)
export const AgentConfigSchema = z.object({
  model: z.enum(["haiku", "sonnet", "opus"]).default("sonnet"),
  temperature: z.number().min(0).max(1).default(0.7),
  maxTokens: z.number().min(256).max(8192).default(4096),
  channels: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  knowledgeBase: z.array(z.string()).default([]),
  guardrails: z
    .object({
      blockedTopics: z.array(z.string()).default([]),
      escalationTriggers: z.array(z.string()).default([]),
      maxResponseLength: z.number().optional(),
    })
    .default({
      blockedTopics: [],
      escalationTriggers: [],
    }),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Schema cho request tạo agent
export const CreateAgentSchema = z.object({
  name: z.string().min(1, "Tên agent không được để trống"),
  domainId: z.string().min(1),
  archetype: z.string().min(1),
  systemPrompt: z.string().min(1, "System prompt không được để trống"),
  config: AgentConfigSchema,
});

// Schema cho request assemble
export const AssembleRequestSchema = z.object({
  domainId: z.string().min(1),
  documentIds: z.array(z.string()).min(1, "Cần ít nhất 1 document"),
  archetype: z.string().optional(),
});

// Schema cho chat preview
export const ChatPreviewRequestSchema = z.object({
  systemPrompt: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1, "Cần ít nhất 1 message"),
  config: AgentConfigSchema.pick({ model: true, temperature: true, maxTokens: true }).optional(),
});

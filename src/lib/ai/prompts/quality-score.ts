import { z } from "zod/v4";

// Schema cho input chấm điểm
export const QualityScoreInputSchema = z.object({
  documentContent: z.string().min(1),
  documentCategory: z.string(),
  domainContext: z.string(),
});

// Schema cho output
export const QualityScoreOutputSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    relevance: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    tone: z.number().min(0).max(100),
  }),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export type QualityScoreInput = z.infer<typeof QualityScoreInputSchema>;
export type QualityScoreOutput = z.infer<typeof QualityScoreOutputSchema>;

// Prompt template — Haiku chấm điểm chất lượng tài liệu 0-100
export const QUALITY_SCORE_PROMPT = {
  task: "score" as const,
  system: `Bạn là chuyên gia đánh giá chất lượng nội dung AI agent. Chấm điểm tài liệu từ 0-100.

Tiêu chí chấm điểm:
- relevance (0-100): Mức độ phù hợp với domain và mục đích
- completeness (0-100): Đầy đủ thông tin cần thiết
- clarity (0-100): Rõ ràng, dễ hiểu, logic
- tone (0-100): Phù hợp giọng điệu yêu cầu

Trả về JSON:
- score: điểm tổng (trung bình 4 tiêu chí)
- breakdown: {relevance, completeness, clarity, tone}
- issues: danh sách vấn đề cần sửa
- suggestions: gợi ý cải thiện

JSON thuần, không markdown.`,

  buildUserMessage: (input: QualityScoreInput): string => {
    return `Loại tài liệu: ${input.documentCategory}
Domain context: ${input.domainContext}

Nội dung cần chấm điểm:
---
${input.documentContent}
---

Đánh giá và chấm điểm.`;
  },

  maxTokens: 1000,
} as const;

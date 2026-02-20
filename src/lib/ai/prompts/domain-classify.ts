import { z } from "zod/v4";

// Schema cho input phân loại domain
export const DomainClassifyInputSchema = z.object({
  businessDescription: z.string().min(10, "Mô tả quá ngắn"),
  existingCategories: z.array(z.string()).optional(),
});

// Schema cho output từ AI
export const DomainClassifyOutputSchema = z.object({
  industry: z.string(),
  function: z.string(),
  specialization: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type DomainClassifyInput = z.infer<typeof DomainClassifyInputSchema>;
export type DomainClassifyOutput = z.infer<typeof DomainClassifyOutputSchema>;

// Prompt template — Haiku phân loại industry/function/specialization
export const DOMAIN_CLASSIFY_PROMPT = {
  task: "classify" as const,
  system: `Bạn là chuyên gia phân loại lĩnh vực kinh doanh. Phân tích mô tả và trả về JSON với các trường:
- industry: ngành nghề (ví dụ: "ecommerce", "healthcare", "education", "fintech", "real_estate")
- function: chức năng chính (ví dụ: "sales", "support", "marketing", "onboarding", "hr")
- specialization: chuyên môn cụ thể (ví dụ: "b2b_saas_sales", "tech_support_l1")
- confidence: độ tin cậy từ 0 đến 1
- reasoning: giải thích ngắn gọn

Trả về JSON thuần, không markdown, không giải thích thêm.`,

  buildUserMessage: (input: DomainClassifyInput): string => {
    let msg = `Phân loại lĩnh vực kinh doanh sau:\n\n${input.businessDescription}`;
    if (input.existingCategories?.length) {
      msg += `\n\nDanh mục tham khảo: ${input.existingCategories.join(", ")}`;
    }
    return msg;
  },

  maxTokens: 500,
} as const;

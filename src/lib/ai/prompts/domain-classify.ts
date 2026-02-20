import { z } from "zod/v4";

// Schema cho input phân loại domain
export const DomainClassifyInputSchema = z.object({
  businessDescription: z.string().min(10, "Mô tả quá ngắn"),
  companyName: z.string().optional(),
  industry: z.string().optional(),
  channels: z.array(z.string()).optional(),
  existingCategories: z.array(z.string()).optional(),
});

// Schema cho output từ AI
export const DomainClassifyOutputSchema = z.object({
  industry: z.string(),
  function: z.string(),
  specialization: z.string(),
  channels: z.array(z.string()),
  tone: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type DomainClassifyInput = z.infer<typeof DomainClassifyInputSchema>;
export type DomainClassifyOutput = z.infer<typeof DomainClassifyOutputSchema>;

// Prompt template — Haiku phân loại industry/function/specialization/channels/tone
export const DOMAIN_CLASSIFY_PROMPT = {
  task: "classify" as const,
  system: `Bạn là chuyên gia phân loại lĩnh vực kinh doanh. Phân tích mô tả và trả về JSON với các trường:
- industry: ngành nghề (ví dụ: "ecommerce", "healthcare", "education", "fintech", "real_estate", "saas", "retail", "hospitality", "logistics", "media", "legal", "insurance", "manufacturing", "other")
- function: chức năng chính (ví dụ: "sales", "support", "marketing", "onboarding", "hr")
- specialization: chuyên môn cụ thể (ví dụ: "b2b_saas_sales", "tech_support_l1")
- channels: mảng kênh phù hợp (ví dụ: ["website", "zalo", "messenger", "telegram", "email", "phone", "livechat", "api"])
- tone: giọng điệu phù hợp nhất (ví dụ: "formal", "friendly", "professional", "casual", "empathetic", "authoritative")
- confidence: độ tin cậy từ 0 đến 1
- reasoning: giải thích ngắn gọn

Chọn channels dựa trên ngành nghề và đối tượng khách hàng. Chọn tone dựa trên tính chất ngành và chức năng.

Trả về JSON thuần, không markdown, không giải thích thêm.`,

  buildUserMessage: (input: DomainClassifyInput): string => {
    let msg = `Phân loại lĩnh vực kinh doanh sau:\n\n${input.businessDescription}`;
    if (input.companyName) {
      msg += `\n\nTên công ty: ${input.companyName}`;
    }
    if (input.industry) {
      msg += `\n\nNgành nghề gợi ý: ${input.industry}`;
    }
    if (input.channels?.length) {
      msg += `\n\nKênh đã chọn: ${input.channels.join(", ")}`;
    }
    if (input.existingCategories?.length) {
      msg += `\n\nDanh mục tham khảo: ${input.existingCategories.join(", ")}`;
    }
    return msg;
  },

  maxTokens: 500,
} as const;

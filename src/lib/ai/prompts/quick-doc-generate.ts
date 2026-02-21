import { z } from "zod/v4";

// Schema cho input Quick Doc Generate
export const QuickDocGenerateInputSchema = z.object({
  businessDescription: z.string().min(10, "Mô tả quá ngắn"),
  domainName: z.string(),
  industry: z.string(),
  function: z.string(),
  tone: z.string(),
  channels: z.array(z.string()),
});

// Schema cho output — 3 mini-docs trong 1 lần gọi
export const QuickDocGenerateOutputSchema = z.object({
  documents: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      content: z.string(),
      sections: z.array(
        z.object({
          heading: z.string(),
          body: z.string(),
        })
      ),
    })
  ),
});

export type QuickDocGenerateInput = z.infer<typeof QuickDocGenerateInputSchema>;
export type QuickDocGenerateOutput = z.infer<typeof QuickDocGenerateOutputSchema>;

// Prompt template — Sonnet sinh 3 mini-docs trong 1 lần gọi (Quick Mode, không cần template)
export const QUICK_DOC_GENERATE_PROMPT = {
  task: "generate" as const,
  system: `Bạn là chuyên gia tạo tài liệu cho AI agent. Nhiệm vụ: sinh 3 tài liệu cốt lõi trong MỘT lần gọi duy nhất.

Sinh ĐÚNG 3 tài liệu sau:

1. **Knowledge Base** (category: "knowledge")
   - Domain knowledge cốt lõi agent cần nắm vững
   - Quy trình, framework, methodology của lĩnh vực
   - Data points, metrics, KPIs quan trọng
   - Stakeholders, resources, constraints

2. **Behavior Guide** (category: "behavior")
   - Phong cách ra quyết định và tư duy chiến lược
   - Tone & personality: cách xưng hô, mức độ formal
   - Quy tắc escalation: khi nào chuyển sang người thật
   - Format output: báo cáo, phân tích, đề xuất

3. **Scenarios & Decision Framework** (category: "faq")
   - 8-12 tình huống phổ biến + cách agent xử lý
   - 4-6 edge cases + framework ra quyết định
   - Tình huống ngoài phạm vi + cách từ chối và escalate

Yêu cầu:
- Nội dung phải CỤ THỂ cho ngành và chức năng (không generic)
- Phù hợp với giọng điệu và kênh triển khai
- Mỗi tài liệu chia thành sections rõ ràng
- Viết bằng tiếng Việt

Trả về JSON: { "documents": [{ "title", "category", "content", "sections": [{ "heading", "body" }] }] }
JSON thuần, không markdown wrapper.`,

  buildUserMessage: (input: QuickDocGenerateInput): string => {
    return `Mô tả doanh nghiệp:
${input.businessDescription}

Domain: ${input.domainName}
Ngành: ${input.industry}
Chức năng: ${input.function}
Giọng điệu: ${input.tone}
Kênh triển khai: ${input.channels.join(", ")}

Sinh 3 tài liệu (knowledge, behavior, faq) cho agent.`;
  },

  maxTokens: 6144,
} as const;

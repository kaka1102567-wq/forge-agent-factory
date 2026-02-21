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
   - Thông tin sản phẩm/dịch vụ của doanh nghiệp
   - Quy trình hoạt động, chính sách
   - Thông tin liên hệ, giờ làm việc
   - Bảng giá, gói dịch vụ (nếu phù hợp)

2. **Behavior Guide** (category: "behavior")
   - Quy tắc hội thoại: greeting, goodbye, chuyển topic
   - Tone & personality: cách xưng hô, mức độ formal
   - Quy tắc escalation: khi nào chuyển sang người thật
   - Format trả lời: độ dài, ngôn ngữ, emoji

3. **FAQ & Objection Handling** (category: "faq")
   - 8-12 câu hỏi thường gặp + câu trả lời mẫu
   - 4-6 phản đối phổ biến + cách xử lý
   - Câu hỏi ngoài phạm vi + cách từ chối lịch sự

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

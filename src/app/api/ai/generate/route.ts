import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import { DOC_GENERATE_PROMPT, type DocGenerateInput } from "@/lib/ai/prompts/doc-generate";

const GenerateRequestSchema = z.object({
  domainId: z.string().min(1),
  templateId: z.string().min(1),
});

// Sinh nội dung tài liệu từ Domain + Template — dùng Sonnet
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { domainId, templateId } = GenerateRequestSchema.parse(body);

    // Fetch domain + template từ DB
    const [domain, template] = await Promise.all([
      db.domain.findUniqueOrThrow({ where: { id: domainId } }),
      db.template.findUniqueOrThrow({ where: { id: templateId } }),
    ]);

    // Build input cho AI prompt
    const templateVars = (template.variables ?? {}) as Record<string, string>;
    const docInput: DocGenerateInput = {
      domainName: domain.name,
      industry: domain.industry,
      function: domain.function,
      tone: domain.tone,
      templateContent: template.content,
      templateVariables: {
        ...templateVars,
        company_name: domain.name,
        industry: domain.industry,
        tone: domain.tone,
        channels: domain.channels.join(", "),
      },
      documentCategory: template.category,
    };

    // Gọi AI generate
    const { result, modelUsed, cost, latencyMs } = await routeTask(
      DOC_GENERATE_PROMPT.task,
      DOC_GENERATE_PROMPT.buildUserMessage(docInput),
      {
        system: DOC_GENERATE_PROMPT.system,
        maxTokens: DOC_GENERATE_PROMPT.maxTokens,
      }
    );

    // Parse AI response
    const parsed = JSON.parse(result);
    const content = parsed.content ?? "";
    const title = parsed.title ?? `${template.name} - ${domain.name}`;

    // Lưu document vào DB
    const document = await db.document.create({
      data: {
        domainId,
        templateId,
        title,
        content,
        status: "DRAFT",
      },
      include: { domain: true, template: true },
    });

    return NextResponse.json({
      document,
      meta: { modelUsed, cost, latencyMs },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

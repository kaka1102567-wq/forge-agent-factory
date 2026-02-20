import { NextResponse } from "next/server";
import { routeAI } from "@/lib/ai/router";

// Sinh nội dung tài liệu/prompt - dùng Sonnet (cân bằng chất lượng/tốc độ)
export async function POST(request: Request) {
  const { prompt, system, maxTokens } = await request.json();

  const response = await routeAI(prompt, {
    tier: "balanced",
    system,
    maxTokens: maxTokens ?? 4096,
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "";

  return NextResponse.json({ text, usage: response.usage });
}

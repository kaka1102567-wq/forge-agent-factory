import { NextResponse } from "next/server";
import { routeAI } from "@/lib/ai/router";

// Lắp ráp agent hoàn chỉnh - dùng Sonnet (cần reasoning tốt)
export async function POST(request: Request) {
  const { domain, documents, archetype } = await request.json();

  const system = `You are an expert AI agent architect. Build a complete agent system prompt and configuration based on the provided domain knowledge and documents.`;

  const prompt = `Domain: ${JSON.stringify(domain)}
Archetype: ${archetype}
Documents: ${JSON.stringify(documents)}

Create a complete agent configuration with:
1. System prompt
2. Greeting message
3. Key behaviors
4. Escalation rules

Respond with JSON.`;

  const response = await routeAI(prompt, {
    tier: "balanced",
    system,
    maxTokens: 8192,
  });

  const content = response.content[0];
  const text = content.type === "text" ? content.text : "{}";

  return NextResponse.json(JSON.parse(text));
}

import { NextResponse } from "next/server";
import { routeAI } from "@/lib/ai/router";

// Chấm điểm chất lượng - dùng Haiku (nhanh, cost-effective)
export async function POST(request: Request) {
  const { content, criteria } = await request.json();

  const response = await routeAI(
    `Score the following content on a scale of 0-100 based on these criteria: ${criteria}.\n\nContent:\n${content}\n\nRespond with JSON: { "score": number, "feedback": string }`,
    { tier: "fast", maxTokens: 500 }
  );

  const responseContent = response.content[0];
  const text = responseContent.type === "text" ? responseContent.text : "{}";

  return NextResponse.json(JSON.parse(text));
}

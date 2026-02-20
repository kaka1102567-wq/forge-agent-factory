import { NextResponse } from "next/server";
import { routeAI } from "@/lib/ai/router";

// Phân loại domain/intent - dùng model nhanh (Haiku)
export async function POST(request: Request) {
  const { text, categories } = await request.json();

  const response = await routeAI(
    `Classify the following text into one of these categories: ${categories.join(", ")}.\n\nText: ${text}\n\nRespond with only the category name.`,
    { tier: "fast", maxTokens: 100 }
  );

  const content = response.content[0];
  const classification = content.type === "text" ? content.text.trim() : "";

  return NextResponse.json({ classification });
}

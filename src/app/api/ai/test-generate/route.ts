import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import { stripMarkdownJson } from "@/lib/ai/client";
import {
  TEST_GENERATE_PROMPT,
  TestGenerateOutputSchema,
} from "@/lib/ai/prompts/test-generate";
import { SAFETY_TEST_CASES } from "@/lib/ai/safety-tests";
import { TEST_ROUNDS, type RoundNumber } from "@/lib/constants";

const RequestSchema = z.object({
  agentId: z.string().min(1),
  rounds: z.array(z.number().min(1).max(6)).optional(),
});

// Sinh test cases cho agent theo rounds
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agentId, rounds: requestedRounds } = RequestSchema.parse(body);

    // Fetch agent + domain + documents
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: {
        domain: {
          include: { documents: { where: { status: "APPROVED" } } },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const domain = agent.domain;
    const rounds = requestedRounds ?? [1, 2, 3, 4, 5, 6];
    const allTestCases: Array<{
      agentId: string;
      round: number;
      category: string;
      input: string;
      expectedOutput: string;
    }> = [];

    // Sinh test cases cho từng round
    for (const round of rounds) {
      const roundNum = round as RoundNumber;

      // Round 4: lấy cases từ safety dataset tĩnh, stratified sampling
      if (roundNum === 4) {
        const maxCount = TEST_ROUNDS[4].count; // 15
        // Stratified sampling: chia đều mỗi category
        const byCategory = new Map<string, typeof SAFETY_TEST_CASES>();
        for (const sc of SAFETY_TEST_CASES) {
          const arr = byCategory.get(sc.category) ?? [];
          arr.push(sc);
          byCategory.set(sc.category, arr);
        }
        const perCategory = Math.max(1, Math.floor(maxCount / byCategory.size));
        let remaining = maxCount;
        for (const [, cases] of byCategory) {
          const take = Math.min(perCategory, remaining, cases.length);
          for (let i = 0; i < take; i++) {
            allTestCases.push({
              agentId,
              round: 4,
              category: cases[i].category,
              input: cases[i].input,
              expectedOutput: cases[i].expectedBehavior,
            });
          }
          remaining -= take;
        }
        continue;
      }

      // Các round khác: sinh bằng AI
      const input = TEST_GENERATE_PROMPT.buildUserMessage({
        agentName: agent.name,
        archetype: agent.archetype,
        systemPrompt: agent.systemPrompt,
        domainName: domain.name,
        industry: domain.industry,
        function: domain.function,
        tone: domain.tone,
        documentSummaries: domain.documents.map(
          (d) => `${d.title} (${d.qualityScore ?? "?"}pts)`
        ),
        round,
      });

      const { result } = await routeTask(TEST_GENERATE_PROMPT.task, input, {
        system: TEST_GENERATE_PROMPT.system,
        maxTokens: TEST_GENERATE_PROMPT.maxTokens,
      });

      // Robust JSON parse — fallback extract JSON object từ text
      let jsonText = stripMarkdownJson(result);
      try {
        JSON.parse(jsonText);
      } catch {
        const match = result.match(/\{[\s\S]*"testCases"[\s\S]*\}/);
        if (match) jsonText = match[0];
      }
      const parsed = TestGenerateOutputSchema.parse(JSON.parse(jsonText));

      // Giới hạn theo count config
      const maxCount = TEST_ROUNDS[roundNum].count;
      const cases = parsed.testCases.slice(0, maxCount);

      for (const tc of cases) {
        allTestCases.push({
          agentId,
          round,
          category: tc.category,
          input: tc.input,
          expectedOutput: tc.expectedBehavior,
        });
      }
    }

    // Xóa test cases cũ của các round được yêu cầu
    await db.testCase.deleteMany({
      where: { agentId, round: { in: rounds } },
    });

    // Bulk create
    const created = await db.testCase.createMany({ data: allTestCases });

    // Fetch lại để trả về
    const testCases = await db.testCase.findMany({
      where: { agentId, round: { in: rounds } },
      orderBy: [{ round: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      count: created.count,
      rounds: rounds.length,
      testCases,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    if (process.env.NODE_ENV === "development") {
      console.error("[test-generate]", error);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

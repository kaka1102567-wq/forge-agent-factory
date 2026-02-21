import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";
import { stripMarkdownJson } from "@/lib/ai/client";
import { DOMAIN_CLASSIFY_PROMPT, DomainClassifyOutputSchema } from "@/lib/ai/prompts/domain-classify";
import { QUICK_DOC_GENERATE_PROMPT, QuickDocGenerateOutputSchema } from "@/lib/ai/prompts/quick-doc-generate";
import { AGENT_ASSEMBLE_PROMPT, AgentAssembleOutputSchema } from "@/lib/ai/prompts/agent-assemble";
import { TEST_GENERATE_PROMPT, TestGenerateOutputSchema } from "@/lib/ai/prompts/test-generate";
import { SAFETY_TEST_CASES } from "@/lib/ai/safety-tests";
import { executeTestCase, type AgentData, type DomainContext, type TestCaseData } from "@/lib/ai/test-runner";
import { QUICK_TEST_ROUNDS } from "@/lib/constants";
import { logActivity } from "@/lib/activity";
import type { Prisma } from "@/generated/prisma/client";

// === Input Schema ===

const QuickBuildSchema = z.object({
  businessDescription: z.string().min(10, "Mô tả quá ngắn (ít nhất 10 ký tự)"),
  channels: z.array(z.string()).min(1, "Chọn ít nhất 1 kênh"),
  botToken: z.string().optional(),
});

// === SSE Helpers ===

type SSEWriter = WritableStreamDefaultWriter<Uint8Array>;

const encoder = new TextEncoder();

function sseEvent(writer: SSEWriter, event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  writer.write(encoder.encode(payload)).catch(() => {});
}

// === Pipeline Steps ===

interface PipelineContext {
  writer: SSEWriter;
  businessDescription: string;
  channels: string[];
  botToken?: string;
  totalCost: number;
}

// Step 1: Classify domain via Haiku
async function stepClassify(ctx: PipelineContext) {
  sseEvent(ctx.writer, "step_start", { step: 1, name: "Phân loại lĩnh vực" });
  sseEvent(ctx.writer, "progress", { percent: 5, message: "Đang phân tích mô tả doanh nghiệp..." });

  const userMessage = DOMAIN_CLASSIFY_PROMPT.buildUserMessage({
    businessDescription: ctx.businessDescription,
    channels: ctx.channels,
  });

  const result = await routeTask(DOMAIN_CLASSIFY_PROMPT.task, userMessage, {
    system: DOMAIN_CLASSIFY_PROMPT.system,
    maxTokens: DOMAIN_CLASSIFY_PROMPT.maxTokens,
  });

  ctx.totalCost += result.cost;
  const parsed = DomainClassifyOutputSchema.parse(
    JSON.parse(stripMarkdownJson(result.result))
  );

  sseEvent(ctx.writer, "step_complete", { step: 1, data: parsed });
  return parsed;
}

// Step 2: Create domain in DB
async function stepCreateDomain(
  ctx: PipelineContext,
  classification: { industry: string; function: string; tone: string; channels: string[] }
) {
  sseEvent(ctx.writer, "step_start", { step: 2, name: "Tạo domain" });
  sseEvent(ctx.writer, "progress", { percent: 15, message: "Đang tạo domain..." });

  // Tạo tên domain từ mô tả (lấy 50 ký tự đầu)
  const domainName = ctx.businessDescription.slice(0, 50).replace(/[.\n]/g, " ").trim();

  const domain = await db.domain.create({
    data: {
      name: domainName,
      industry: classification.industry,
      function: classification.function,
      channels: ctx.channels.length > 0 ? ctx.channels : classification.channels,
      tone: classification.tone,
      profile: { businessDescription: ctx.businessDescription } as Prisma.InputJsonValue,
      status: "ACTIVE",
    },
  });

  sseEvent(ctx.writer, "step_complete", { step: 2, data: { id: domain.id, name: domain.name } });
  return domain;
}

// Step 3: Generate 3 mini-docs via Sonnet
async function stepGenerateDocs(
  ctx: PipelineContext,
  domain: { id: string; name: string; industry: string; function: string; tone: string; channels: string[] }
) {
  sseEvent(ctx.writer, "step_start", { step: 3, name: "Sinh tài liệu" });
  sseEvent(ctx.writer, "progress", { percent: 20, message: "Đang sinh 3 tài liệu cốt lõi..." });

  const userMessage = QUICK_DOC_GENERATE_PROMPT.buildUserMessage({
    businessDescription: ctx.businessDescription,
    domainName: domain.name,
    industry: domain.industry,
    function: domain.function,
    tone: domain.tone,
    channels: domain.channels,
  });

  const result = await routeTask(QUICK_DOC_GENERATE_PROMPT.task, userMessage, {
    system: QUICK_DOC_GENERATE_PROMPT.system,
    maxTokens: QUICK_DOC_GENERATE_PROMPT.maxTokens,
  });

  ctx.totalCost += result.cost;
  const parsed = QuickDocGenerateOutputSchema.parse(
    JSON.parse(stripMarkdownJson(result.result))
  );

  // Lưu documents vào DB
  const documents = await Promise.all(
    parsed.documents.map((doc) =>
      db.document.create({
        data: {
          domainId: domain.id,
          title: doc.title,
          content: doc.content,
          status: "APPROVED",
        },
      })
    )
  );

  sseEvent(ctx.writer, "progress", { percent: 40, message: "Đã sinh 3 tài liệu thành công" });
  sseEvent(ctx.writer, "step_complete", {
    step: 3,
    data: parsed.documents.map((d, i) => ({
      id: documents[i].id,
      title: d.title,
      category: d.category,
    })),
  });

  return { parsed: parsed.documents, dbDocs: documents };
}

// Step 4: Assemble agent via Sonnet (NOT Opus for Quick Mode)
async function stepAssembleAgent(
  ctx: PipelineContext,
  domain: { id: string; name: string; industry: string; function: string; tone: string; channels: string[] },
  documents: Array<{ title: string; category: string; content: string }>
) {
  sseEvent(ctx.writer, "step_start", { step: 4, name: "Lắp ráp agent" });
  sseEvent(ctx.writer, "progress", { percent: 45, message: "Đang lắp ráp agent từ tài liệu..." });

  const userMessage = AGENT_ASSEMBLE_PROMPT.buildUserMessage({
    domainName: domain.name,
    industry: domain.industry,
    function: domain.function,
    archetype: domain.function, // Quick Mode dùng function làm archetype
    tone: domain.tone,
    channels: domain.channels,
    documents: documents.map((d) => ({
      title: d.title,
      category: d.category,
      content: d.content,
    })),
  });

  const result = await routeTask(AGENT_ASSEMBLE_PROMPT.task, userMessage, {
    system: AGENT_ASSEMBLE_PROMPT.system,
    maxTokens: AGENT_ASSEMBLE_PROMPT.maxTokens,
    tierOverride: "sonnet", // Quick Mode dùng Sonnet thay Opus
  });

  ctx.totalCost += result.cost;
  const parsed = AgentAssembleOutputSchema.parse(
    JSON.parse(stripMarkdownJson(result.result))
  );

  // Lưu agent vào DB
  const agent = await db.agent.create({
    data: {
      domainId: domain.id,
      name: `${domain.name} Agent`,
      archetype: domain.function,
      systemPrompt: parsed.systemPrompt,
      config: parsed.config as Prisma.InputJsonValue,
      quickMode: true,
      status: "TESTING",
    },
  });

  sseEvent(ctx.writer, "progress", { percent: 55, message: "Agent đã được tạo" });
  sseEvent(ctx.writer, "step_complete", {
    step: 4,
    data: {
      id: agent.id,
      name: agent.name,
      capabilities: parsed.capabilities,
      limitations: parsed.limitations,
    },
  });

  return { agent, config: parsed.config };
}

// Step 5: Generate test cases
async function stepGenerateTests(
  ctx: PipelineContext,
  agent: { id: string; name: string; archetype: string; systemPrompt: string },
  domain: { name: string; industry: string; function: string; tone: string },
  documentSummaries: string[]
) {
  sseEvent(ctx.writer, "step_start", { step: 5, name: "Sinh test cases" });
  sseEvent(ctx.writer, "progress", { percent: 58, message: "Đang sinh test cases..." });

  // Round 1: Functional — sinh 5 cases bằng AI
  const functionalInput = TEST_GENERATE_PROMPT.buildUserMessage({
    agentName: agent.name,
    archetype: agent.archetype,
    systemPrompt: agent.systemPrompt,
    domainName: domain.name,
    industry: domain.industry,
    function: domain.function,
    tone: domain.tone,
    documentSummaries,
    round: 1,
  });

  const functionalResult = await routeTask(TEST_GENERATE_PROMPT.task,
    functionalInput + "\n\n⚠️ CHÚ Ý: Quick Mode — chỉ sinh đúng 5 test cases.", {
    system: TEST_GENERATE_PROMPT.system,
    maxTokens: TEST_GENERATE_PROMPT.maxTokens,
  });

  ctx.totalCost += functionalResult.cost;
  const functionalParsed = TestGenerateOutputSchema.parse(
    JSON.parse(stripMarkdownJson(functionalResult.result))
  );
  const functionalCases = functionalParsed.testCases.slice(0, 5);

  // Lưu functional test cases vào DB
  const r1Cases = await Promise.all(
    functionalCases.map((tc) =>
      db.testCase.create({
        data: {
          agentId: agent.id,
          round: 1,
          category: tc.category || "functional",
          input: tc.input,
          expectedOutput: tc.expectedBehavior,
        },
      })
    )
  );

  // Round 4: Safety — sample 5 từ 50 static cases (1 per category)
  const categories = ["prompt_injection", "pii_extraction", "harmful_content", "discrimination", "jailbreak"];
  const safetySamples = categories.map((cat) => {
    const casesInCat = SAFETY_TEST_CASES.filter((c) => c.category === cat);
    return casesInCat[Math.floor(Math.random() * casesInCat.length)];
  });

  const r4Cases = await Promise.all(
    safetySamples.map((tc) =>
      db.testCase.create({
        data: {
          agentId: agent.id,
          round: 4,
          category: tc.category,
          input: tc.input,
          expectedOutput: tc.expectedBehavior,
        },
      })
    )
  );

  sseEvent(ctx.writer, "progress", { percent: 62, message: `Đã sinh ${r1Cases.length + r4Cases.length} test cases` });
  sseEvent(ctx.writer, "step_complete", {
    step: 5,
    data: { functionalCount: r1Cases.length, safetyCount: r4Cases.length },
  });

  return { r1Cases, r4Cases };
}

// Step 6: Run tests
async function stepRunTests(
  ctx: PipelineContext,
  agentData: AgentData,
  domainCtx: DomainContext,
  r1Cases: Array<{ id: string; round: number; category: string; input: string; expectedOutput: string }>,
  r4Cases: Array<{ id: string; round: number; category: string; input: string; expectedOutput: string }>
) {
  sseEvent(ctx.writer, "step_start", { step: 6, name: "Chạy test" });
  sseEvent(ctx.writer, "progress", { percent: 65, message: "Đang chạy test Round 1 — Chức năng..." });

  const allCases = [...r1Cases, ...r4Cases];
  const totalCases = allCases.length;
  let completedCases = 0;

  // Chạy Round 1
  const r1Results = [];
  for (const tc of r1Cases) {
    const testData: TestCaseData = {
      id: tc.id,
      round: tc.round,
      category: tc.category,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    };
    const result = await executeTestCase(testData, agentData, domainCtx);
    r1Results.push(result);
    ctx.totalCost += result.cost;
    completedCases++;

    // Cập nhật test case trong DB
    await db.testCase.update({
      where: { id: tc.id },
      data: {
        actualOutput: result.actualOutput,
        score: result.score,
        passed: result.passed,
        reasoning: result.reasoning,
      },
    });

    const percent = 65 + Math.round((completedCases / totalCases) * 25);
    sseEvent(ctx.writer, "test_case_complete", {
      round: 1,
      caseIndex: r1Results.length,
      total: r1Cases.length,
      passed: result.passed,
      score: result.score,
    });
    sseEvent(ctx.writer, "progress", { percent, message: `Test ${completedCases}/${totalCases}` });
  }

  // Round 1 result
  const r1Passed = r1Results.filter((r) => r.passed).length;
  const r1AvgScore = r1Results.reduce((s, r) => s + r.score, 0) / r1Results.length;
  const r1PassRate = (r1Passed / r1Results.length) * 100;
  const round1Passed = r1PassRate >= QUICK_TEST_ROUNDS[1].passThreshold;

  await db.testResult.create({
    data: {
      agentId: agentData.id,
      round: 1,
      score: Math.round(r1AvgScore * 100) / 100,
      passed: round1Passed,
      details: { passRate: r1PassRate, passedCases: r1Passed, totalCases: r1Results.length } as Prisma.InputJsonValue,
    },
  });

  sseEvent(ctx.writer, "test_round_complete", {
    round: 1,
    passed: round1Passed,
    score: Math.round(r1AvgScore * 100) / 100,
    passRate: r1PassRate,
  });

  // Chạy Round 4 — Safety
  sseEvent(ctx.writer, "progress", { percent: 80, message: "Đang chạy test Round 4 — An toàn..." });

  const r4Results = [];
  for (const tc of r4Cases) {
    const testData: TestCaseData = {
      id: tc.id,
      round: tc.round,
      category: tc.category,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
    };
    const result = await executeTestCase(testData, agentData, domainCtx);
    r4Results.push(result);
    ctx.totalCost += result.cost;
    completedCases++;

    await db.testCase.update({
      where: { id: tc.id },
      data: {
        actualOutput: result.actualOutput,
        score: result.score,
        passed: result.passed,
        reasoning: result.reasoning,
      },
    });

    sseEvent(ctx.writer, "test_case_complete", {
      round: 4,
      caseIndex: r4Results.length,
      total: r4Cases.length,
      passed: result.passed,
      score: result.score,
    });
    const percent = 65 + Math.round((completedCases / totalCases) * 25);
    sseEvent(ctx.writer, "progress", { percent, message: `Test ${completedCases}/${totalCases}` });
  }

  // Round 4 result
  const r4Passed = r4Results.filter((r) => r.passed).length;
  const r4AvgScore = r4Results.reduce((s, r) => s + r.score, 0) / r4Results.length;
  const r4PassRate = (r4Passed / r4Results.length) * 100;
  const round4Passed = r4PassRate >= QUICK_TEST_ROUNDS[4].passThreshold;

  await db.testResult.create({
    data: {
      agentId: agentData.id,
      round: 4,
      score: Math.round(r4AvgScore * 100) / 100,
      passed: round4Passed,
      details: { passRate: r4PassRate, passedCases: r4Passed, totalCases: r4Results.length } as Prisma.InputJsonValue,
    },
  });

  sseEvent(ctx.writer, "test_round_complete", {
    round: 4,
    passed: round4Passed,
    score: Math.round(r4AvgScore * 100) / 100,
    passRate: r4PassRate,
  });

  // Safety blocked?
  if (!round4Passed) {
    sseEvent(ctx.writer, "safety_blocked", {
      message: "Agent không vượt qua kiểm tra an toàn. Không thể deploy.",
      failedCases: r4Results.filter((r) => !r.passed).length,
    });
  }

  return { round1Passed, round4Passed, r1AvgScore, r4AvgScore };
}

// Step 7: Finalize
async function stepFinalize(
  ctx: PipelineContext,
  agentId: string,
  deployReady: boolean
) {
  sseEvent(ctx.writer, "step_start", { step: 7, name: "Hoàn tất" });
  sseEvent(ctx.writer, "progress", { percent: 95, message: "Đang hoàn tất..." });

  // Cập nhật agent status
  await db.agent.update({
    where: { id: agentId },
    data: { status: deployReady ? "ACTIVE" : "DRAFT" },
  });

  logActivity("quick_build", `Quick Build hoàn tất (${deployReady ? "sẵn sàng deploy" : "cần cải thiện"})`, {
    agentId,
    metadata: { totalCost: ctx.totalCost, deployReady },
  });

  sseEvent(ctx.writer, "step_complete", { step: 7, data: { deployReady } });
  sseEvent(ctx.writer, "progress", { percent: 100, message: "Hoàn tất!" });
}

// === Main Route Handler ===

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const validation = QuickBuildSchema.safeParse(body);
  if (!validation.success) {
    return new Response(
      JSON.stringify({ error: "Validation failed", details: validation.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { businessDescription, channels, botToken } = validation.data;

  // SSE Response stream
  const stream = new TransformStream<Uint8Array, Uint8Array>();
  const writer = stream.writable.getWriter();

  // Chạy pipeline trong background
  (async () => {
    const ctx: PipelineContext = {
      writer,
      businessDescription,
      channels,
      botToken,
      totalCost: 0,
    };

    try {
      logActivity("quick_build", "Quick Build bắt đầu", {
        metadata: { businessDescription: ctx.businessDescription, channels: ctx.channels },
      });

      // Step 1: Classify
      const classification = await stepClassify(ctx);

      // Step 2: Create Domain
      const domain = await stepCreateDomain(ctx, classification);
      const domainWithChannels = {
        ...domain,
        channels: domain.channels as string[],
      };

      // Step 3: Generate Docs
      const { parsed: docsParsed } = await stepGenerateDocs(ctx, domainWithChannels);

      // Step 4: Assemble Agent
      const { agent, config } = await stepAssembleAgent(ctx, domainWithChannels, docsParsed);

      // Step 5: Generate Test Cases
      const documentSummaries = docsParsed.map((d) => `${d.title} (${d.category})`);
      const { r1Cases, r4Cases } = await stepGenerateTests(
        ctx,
        agent,
        { name: domain.name, industry: domain.industry, function: domain.function, tone: domain.tone },
        documentSummaries
      );

      // Step 6: Run Tests
      const agentData: AgentData = {
        id: agent.id,
        name: agent.name,
        archetype: agent.archetype,
        systemPrompt: agent.systemPrompt,
        config: config as { temperature?: number; maxTokens?: number },
      };
      const domainCtx: DomainContext = {
        name: domain.name,
        industry: domain.industry,
        function: domain.function,
        tone: domain.tone,
      };
      const testResults = await stepRunTests(ctx, agentData, domainCtx, r1Cases, r4Cases);

      // Step 7: Finalize
      const deployReady = testResults.round1Passed && testResults.round4Passed;
      await stepFinalize(ctx, agent.id, deployReady);

      // Final complete event
      sseEvent(writer, "complete", {
        agent: { id: agent.id, name: agent.name },
        domain: { id: domain.id, name: domain.name },
        documentCount: docsParsed.length,
        testResults: {
          round1: { passed: testResults.round1Passed, score: Math.round(testResults.r1AvgScore * 100) / 100 },
          round4: { passed: testResults.round4Passed, score: Math.round(testResults.r4AvgScore * 100) / 100 },
        },
        deployReady,
        totalCost: Math.round(ctx.totalCost * 1000000) / 1000000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Pipeline error";
      console.error("[QuickBuild] Pipeline error:", error);
      sseEvent(writer, "error", { message });
    } finally {
      try { await writer.close(); } catch { /* stream already closed */ }
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

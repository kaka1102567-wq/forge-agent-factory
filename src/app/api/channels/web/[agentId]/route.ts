import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";

// Conversation memory — last 10 messages per sessionId
const sessionMemory = new Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
>();

const MAX_MEMORY_MESSAGES = 10;

function getMemoryKey(agentId: string, sessionId: string): string {
  return `web:${agentId}:${sessionId}`;
}

function getConversation(
  key: string
): Array<{ role: "user" | "assistant"; content: string }> {
  return sessionMemory.get(key) ?? [];
}

function addToConversation(
  key: string,
  role: "user" | "assistant",
  content: string
) {
  const messages = getConversation(key);
  messages.push({ role, content });
  if (messages.length > MAX_MEMORY_MESSAGES) {
    messages.splice(0, messages.length - MAX_MEMORY_MESSAGES);
  }
  sessionMemory.set(key, messages);
}

// CORS headers cho cross-origin widget
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const ChatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().min(1),
});

// POST /api/channels/web/[agentId] — Web chat endpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  try {
    const body = await request.json();
    const { message, sessionId } = ChatSchema.parse(body);

    // Load agent deployment
    const deployment = await db.deployment.findUnique({
      where: { agentId_channel: { agentId, channel: "WEB" } },
      include: { agent: true },
    });

    if (!deployment || deployment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Agent hiện không hoạt động" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const agent = deployment.agent;

    // Lưu message user
    const memoryKey = getMemoryKey(agentId, sessionId);
    addToConversation(memoryKey, "user", message);

    // Build context từ history
    const history = getConversation(memoryKey);
    const conversationContext = history
      .slice(0, -1)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const input = conversationContext
      ? `Lịch sử hội thoại:\n${conversationContext}\n\nUser: ${message}`
      : message;

    // Gọi Sonnet
    const response = await routeTask("generate", input, {
      system: agent.systemPrompt,
      maxTokens: 1024,
      tierOverride: "sonnet",
    });

    const reply = response.result;

    // Lưu reply
    addToConversation(memoryKey, "assistant", reply);

    return NextResponse.json(
      { reply, sessionId },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

// GET /api/channels/web/[agentId] — Embed widget code snippet
export async function GET(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  try {
    const deployment = await db.deployment.findUnique({
      where: { agentId_channel: { agentId, channel: "WEB" } },
      include: { agent: true },
    });

    if (!deployment || deployment.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Web deployment không tồn tại hoặc không active" },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Tạo URL base từ request
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const endpoint = `${baseUrl}/api/channels/web/${agentId}`;

    const embedCode = `<!-- FORGE Chat Widget -->
<div id="forge-chat-widget"></div>
<script>
(function() {
  var ENDPOINT = "${endpoint}";
  var SESSION_ID = "s_" + Math.random().toString(36).slice(2);
  var container = document.getElementById("forge-chat-widget");
  container.innerHTML = '<div style="position:fixed;bottom:20px;right:20px;width:380px;max-height:500px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,0.12);font-family:system-ui;display:flex;flex-direction:column;overflow:hidden;z-index:9999">'
    + '<div style="padding:12px 16px;background:#111;color:#fff;font-weight:600">${deployment.agent.name}</div>'
    + '<div id="forge-messages" style="flex:1;overflow-y:auto;padding:12px;min-height:300px"></div>'
    + '<div style="padding:8px;border-top:1px solid #e5e7eb;display:flex;gap:8px">'
    + '<input id="forge-input" type="text" placeholder="Nhập tin nhắn..." style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;outline:none" />'
    + '<button id="forge-send" style="padding:8px 16px;background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer">Gửi</button>'
    + '</div></div>';
  var input = document.getElementById("forge-input");
  var messages = document.getElementById("forge-messages");
  function addMsg(text, isUser) {
    var div = document.createElement("div");
    div.style.cssText = "margin-bottom:8px;padding:8px 12px;border-radius:8px;max-width:80%;" + (isUser ? "margin-left:auto;background:#111;color:#fff" : "background:#f3f4f6");
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }
  async function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    addMsg(text, true);
    try {
      var res = await fetch(ENDPOINT, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({message: text, sessionId: SESSION_ID}) });
      var data = await res.json();
      addMsg(data.reply || data.error || "Lỗi", false);
    } catch(e) { addMsg("Không thể kết nối", false); }
  }
  document.getElementById("forge-send").onclick = send;
  input.addEventListener("keydown", function(e) { if (e.key === "Enter") send(); });
})();
</script>`;

    return NextResponse.json(
      {
        agentId,
        agentName: deployment.agent.name,
        endpoint,
        embedCode,
      },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Server error";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

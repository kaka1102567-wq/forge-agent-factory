import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { routeTask } from "@/lib/ai/router";

// Conversation memory — last 10 messages per chat_id
const conversationMemory = new Map<
  string,
  Array<{ role: "user" | "assistant"; content: string }>
>();

const MAX_MEMORY_MESSAGES = 10;

function getMemoryKey(agentId: string, chatId: number): string {
  return `${agentId}:${chatId}`;
}

function getConversation(
  key: string
): Array<{ role: "user" | "assistant"; content: string }> {
  return conversationMemory.get(key) ?? [];
}

function addToConversation(
  key: string,
  role: "user" | "assistant",
  content: string
) {
  const messages = getConversation(key);
  messages.push({ role, content });
  // Giữ tối đa 10 messages gần nhất
  if (messages.length > MAX_MEMORY_MESSAGES) {
    messages.splice(0, messages.length - MAX_MEMORY_MESSAGES);
  }
  conversationMemory.set(key, messages);
}

// POST /api/channels/telegram/[agentId] — Telegram webhook endpoint
export async function POST(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  try {
    const update = await request.json();

    // Chỉ xử lý text messages
    const message = update.message;
    if (!message?.text || !message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id as number;
    const text = message.text as string;

    // Load agent từ DB
    const deployment = await db.deployment.findUnique({
      where: { agentId_channel: { agentId, channel: "TELEGRAM" } },
      include: { agent: true },
    });

    if (!deployment || deployment.status !== "ACTIVE") {
      await sendTelegramMessage(
        agentId,
        chatId,
        "Agent hiện không hoạt động."
      );
      return NextResponse.json({ ok: true });
    }

    const agent = deployment.agent;

    // Xử lý commands
    if (text === "/start") {
      const welcome = `Xin chào! Tôi là ${agent.name}. Bạn có thể hỏi tôi bất cứ điều gì.`;
      await sendTelegramMessage(agentId, chatId, welcome);
      return NextResponse.json({ ok: true });
    }

    if (text === "/help") {
      const help = [
        `🤖 *${agent.name}*`,
        "",
        "Lệnh có sẵn:",
        "/start - Bắt đầu cuộc trò chuyện",
        "/help - Hiển thị trợ giúp",
        "",
        "Gửi tin nhắn bất kỳ để trò chuyện với tôi!",
      ].join("\n");
      await sendTelegramMessage(agentId, chatId, help);
      return NextResponse.json({ ok: true });
    }

    // Lưu tin nhắn user vào memory
    const memoryKey = getMemoryKey(agentId, chatId);
    addToConversation(memoryKey, "user", text);

    // Build context từ conversation memory
    const history = getConversation(memoryKey);
    const conversationContext = history
      .slice(0, -1) // Bỏ message hiện tại (sẽ là input)
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const input = conversationContext
      ? `Lịch sử hội thoại:\n${conversationContext}\n\nUser: ${text}`
      : text;

    // Gọi Sonnet qua router
    const response = await routeTask("generate", input, {
      system: agent.systemPrompt,
      maxTokens: 1024,
      tierOverride: "sonnet",
    });

    const reply = response.result;

    // Lưu reply vào memory
    addToConversation(memoryKey, "assistant", reply);

    // Gửi response về Telegram
    await sendTelegramMessage(agentId, chatId, reply);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error:", error);
    // Không trả lỗi cho Telegram — tránh retry loop
    return NextResponse.json({ ok: true });
  }
}

// Gửi message qua Telegram Bot API
async function sendTelegramMessage(
  agentId: string,
  chatId: number,
  text: string
) {
  try {
    // Lấy bot token từ deployment config
    const deployment = await db.deployment.findUnique({
      where: { agentId_channel: { agentId, channel: "TELEGRAM" } },
    });

    const config = deployment?.config as Record<string, unknown> | null;
    const botToken = config?.botToken as string | undefined;

    if (!botToken) {
      console.error("[Telegram] Missing botToken in deployment config");
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("[Telegram] Failed to send message:", error);
  }
}

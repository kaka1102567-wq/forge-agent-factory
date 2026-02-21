"use client";

import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Send, Loader2 } from "lucide-react";
import { CHAT_PREVIEW_MAX_MESSAGES } from "@/lib/constants";
import type { AgentConfig } from "@/lib/schemas/agent-config";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  meta?: { cost: number; latencyMs: number };
}

interface PreviewChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  systemPrompt: string;
  config: AgentConfig;
  onAccept: () => void;
  onReject: () => void;
}

export function PreviewChat({
  open,
  onOpenChange,
  systemPrompt,
  config,
  onAccept,
  onReject,
}: PreviewChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const userMessageCount = messages.filter((m) => m.role === "user").length;
  const totalCost = messages.reduce((sum, m) => sum + (m.meta?.cost ?? 0), 0);
  const limitReached = userMessageCount >= CHAT_PREVIEW_MAX_MESSAGES;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Reset khi mở/đóng dialog
  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  const sendChatMessage = async () => {
    if (!input.trim() || loading || limitReached) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt,
          messages: newMessages.map(({ role, content }) => ({ role, content })),
          config: {
            model: config.model,
            temperature: config.temperature,
            maxTokens: config.maxTokens,
          },
        }),
      });

      if (!res.ok) throw new Error("Chat preview failed");

      const data = await res.json();
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: data.message,
          meta: { cost: data.meta.cost, latencyMs: data.meta.latencyMs },
        },
      ]);
    } catch {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Loi: Khong the gui tin nhan. Vui long thu lai.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Thu nghiem Agent</span>
            <div className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
              <span>
                {userMessageCount}/{CHAT_PREVIEW_MAX_MESSAGES} tin nhan
              </span>
              <Badge variant="secondary" className="text-xs">
                ${totalCost.toFixed(4)}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto rounded-md border p-3"
          style={{ minHeight: 300 }}
        >
          {messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Gui tin nhan de thu nghiem agent.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.meta && (
                  <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
                    <span>{(msg.meta.latencyMs / 1000).toFixed(1)}s</span>
                    <span>${msg.meta.cost.toFixed(4)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-muted px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendChatMessage()}
            placeholder={limitReached ? "Da het luot thu nghiem" : "Nhap tin nhan..."}
            disabled={loading || limitReached}
            className="text-sm"
          />
          <Button
            size="sm"
            onClick={sendChatMessage}
            disabled={loading || !input.trim() || limitReached}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onReject}>
            Can chinh lai
          </Button>
          <Button size="sm" onClick={onAccept}>
            Chap nhan!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

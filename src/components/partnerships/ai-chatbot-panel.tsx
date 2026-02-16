"use client";

import { useState, useRef, useEffect } from "react";
import { chatWithAI } from "@/lib/ai";
import type { ChatMessage } from "@/types/partnerships";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrainCircuit, Send, Loader2 } from "lucide-react";

interface AIChatbotPanelProps {
  partnerContext: {
    name: string;
    types: string[];
    heat: number;
    summary: string | null;
    mentors_count: number;
    volunteer_hours: number;
    recentEmails?: string;
    openTasks?: string;
  };
}

export function AIChatbotPanel({ partnerContext }: AIChatbotPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const reply = await chatWithAI(userMsg.content, partnerContext);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <BrainCircuit size={14} />
          AI Assistant
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BrainCircuit size={18} className="text-indigo-600" />
            Partnership AI Assistant
          </SheetTitle>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 py-4 min-h-0"
        >
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 mt-8">
              <BrainCircuit size={32} className="mx-auto mb-3 text-slate-300" />
              <p>
                Ask me about {partnerContext.name}&apos;s partnership — I can
                help with action plans, risk analysis, and engagement strategies.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 px-4 py-2.5 rounded-2xl">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about this partnership..."
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
          >
            <Send size={16} />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

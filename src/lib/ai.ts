import type { AISuggestion } from "@/types/partnerships";

export async function summarizeContent(content: string): Promise<string> {
  const res = await fetch("/api/ai/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to summarize");
  }

  const data = await res.json();
  return data.summary;
}

export async function analyzePolicyContent(policyContent: string): Promise<AISuggestion[]> {
  const res = await fetch("/api/ai/policy-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policyContent }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to analyze policy");
  }

  const data = await res.json();
  return data.suggestions;
}

export async function chatWithAI(
  message: string,
  partnerContext?: Record<string, unknown>
): Promise<string> {
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, partnerContext }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to chat");
  }

  const data = await res.json();
  return data.reply;
}

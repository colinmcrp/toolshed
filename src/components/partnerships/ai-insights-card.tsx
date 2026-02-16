"use client";

import { useState } from "react";
import { summarizeContent } from "@/lib/ai";
import { Sparkles, Loader2 } from "lucide-react";

interface AIInsightsCardProps {
  partnerName: string;
  summary: string | null;
  goals: string[];
}

export function AIInsightsCard({
  partnerName,
  summary,
  goals,
}: AIInsightsCardProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);

  const handleRefresh = async () => {
    setAiLoading(true);
    try {
      const content = `Partner: ${partnerName}\nSummary: ${summary}\nGoals: ${goals.join(", ")}`;
      const result = await summarizeContent(content);
      setAiResponse(result);
    } catch {
      setAiResponse("Error generating insights. Please try again.");
    }
    setAiLoading(false);
  };

  return (
    <section className="bg-indigo-900 rounded-2xl p-6 text-white overflow-hidden relative">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles size={20} className="text-indigo-300" />
            AI Relationship Insight
          </h2>
          <button
            onClick={handleRefresh}
            disabled={aiLoading}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {aiLoading && <Loader2 size={12} className="animate-spin" />}
            REFRESH INSIGHTS
          </button>
        </div>
        {aiResponse ? (
          <p className="text-sm leading-relaxed text-indigo-100">
            {aiResponse}
          </p>
        ) : (
          <p className="text-sm text-indigo-200">
            Generate a summary including status, risks, and next steps using
            Gemini AI.
          </p>
        )}
      </div>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full"></div>
    </section>
  );
}

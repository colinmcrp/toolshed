import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  // Auth check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const { content } = await request.json();
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Summarize the following partnership-related content concisely, focusing on key commitments, relationship status, risks, and recommended next steps:\n\n${content}`,
      config: {
        systemInstruction: "You are an expert CRM assistant for MCR Pathways, a mentoring charity. Be professional, concise, and highlight action items.",
      },
    });

    return NextResponse.json({ summary: response.text || "Unable to summarize." });
  } catch (error) {
    console.error("Gemini summarize error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

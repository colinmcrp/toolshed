import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
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

  const { policyContent } = await request.json();
  if (!policyContent) {
    return NextResponse.json({ error: "Policy content is required" }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Analyze this Corporate Parenting Plan/CSR Policy and suggest specific, collaborative activities for MCR Pathways to pitch to the partner:\n\n${policyContent}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              benefit: { type: Type.STRING },
            },
            required: ["title", "description", "benefit"],
          },
        },
      },
    });

    const suggestions = JSON.parse(response.text || "[]");
    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Gemini policy analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze policy" }, { status: 500 });
  }
}

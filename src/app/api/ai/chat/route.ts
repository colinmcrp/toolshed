import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 503 });
  }

  const { message, partnerContext } = await request.json();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const systemPrompt = `You are an AI assistant for MCR Pathways, a Scottish mentoring charity.
You help staff manage partnership relationships.

${partnerContext ? `Current partner context:
- Partner: ${partnerContext.name}
- Types: ${partnerContext.types?.join(", ")}
- Heat Score: ${partnerContext.heat}/100
- Summary: ${partnerContext.summary}
- Mentors: ${partnerContext.mentors_count} matched
- Volunteer Hours: ${partnerContext.volunteer_hours}
- Recent emails: ${partnerContext.recentEmails || "None"}
- Open tasks: ${partnerContext.openTasks || "None"}` : "No specific partner context provided."}

Be concise, actionable, and focused on improving partnerships.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: message,
      config: {
        systemInstruction: systemPrompt,
      },
    });

    return NextResponse.json({ reply: response.text || "I couldn't generate a response." });
  } catch (error) {
    console.error("Gemini chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}

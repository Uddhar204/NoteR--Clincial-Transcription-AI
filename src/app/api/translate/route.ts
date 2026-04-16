// API route for translation via Google Gemini

// Next.js route segment config
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds

import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/llm-client";

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      // Return original text if no API key
      return NextResponse.json({ translated: text });
    }

    const translated = await translateText(text, apiKey);
    return NextResponse.json({ translated });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: "Translation failed" },
      { status: 500 }
    );
  }
}

// API route for generating clinical notes from transcript via Google Gemini

// Next.js route segment config — tells the runtime this is a slow async route.
export const dynamic = "force-dynamic";
export const maxDuration = 30; // seconds

import { NextRequest, NextResponse } from "next/server";
import { generateClinicalReport } from "@/lib/llm-client";

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.KODEKLOUD_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "KodeKloud API key is not configured." },
        { status: 500 }
      );
    }

    const report = await generateClinicalReport(transcript, apiKey);
    return NextResponse.json(report);
  } catch (error) {
    console.error("Generate notes error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

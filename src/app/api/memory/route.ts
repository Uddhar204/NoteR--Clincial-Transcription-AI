// API route for Qdrant memory operations

import { NextRequest, NextResponse } from "next/server";
import {
  storeConsultation,
  searchPatientHistory,
  ConsultationRecord,
} from "@/lib/qdrant-client";

export async function POST(request: NextRequest) {
  try {
    const body: ConsultationRecord = await request.json();

    if (!body.id || !body.transcript) {
      return NextResponse.json(
        { error: "id and transcript are required" },
        { status: 400 }
      );
    }

    const success = await storeConsultation(body);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: "Failed to store consultation. Qdrant may not be configured." },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Memory store error:", error);
    return NextResponse.json(
      { error: "Failed to store consultation" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const results = await searchPatientHistory(query, limit);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Memory search error:", error);
    return NextResponse.json({ results: [] });
  }
}

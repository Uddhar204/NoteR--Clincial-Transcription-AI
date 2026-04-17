// GET /api/records — fetch all or search patient consultations
import { NextRequest, NextResponse } from "next/server";
import {
  getAllConsultations,
  searchPatientHistory,
} from "@/lib/qdrant-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (query && query.trim().length > 0) {
      // Semantic search mode
      const results = await searchPatientHistory(query.trim(), limit);
      return NextResponse.json({ records: results, mode: "search" });
    }

    // List all mode — use scroll API
    const { records, nextOffset } = await getAllConsultations(limit);
    return NextResponse.json({ records, nextOffset, mode: "all" });
  } catch (error) {
    console.error("Records API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch records", records: [] },
      { status: 500 }
    );
  }
}

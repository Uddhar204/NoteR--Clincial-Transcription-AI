// Qdrant vector database client for patient consultation memory

import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "consultations";
const VECTOR_SIZE = 384; // matches the embedding size we'll use

let client: QdrantClient | null = null;
// Cache the collection-ready state — avoids a Qdrant network round-trip
// on every memory read/write after the first successful ensure.
let collectionReady = false;

export function getQdrantClient(): QdrantClient | null {
  if (client) return client;

  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    console.warn("Qdrant URL not configured");
    return null;
  }

  client = new QdrantClient({
    url,
    apiKey: apiKey || undefined,
  });

  return client;
}

export async function ensureCollection(): Promise<boolean> {
  // Short-circuit: skip the Qdrant round-trip if we already know it's ready.
  if (collectionReady) return true;

  const qdrant = getQdrantClient();
  if (!qdrant) return false;

  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: "Cosine",
        },
      });
      console.log(`Created collection: ${COLLECTION_NAME}`);
    }

    collectionReady = true;
    return true;
  } catch (error) {
    console.error("Failed to ensure Qdrant collection:", error);
    return false;
  }
}

export interface ConsultationRecord {
  id: string;
  patientName: string;
  date: string;
  summary: string;
  keywords: string[];
  transcript: string;
  soapNotes: string;       // JSON string of SOAPNotes
  prescriptions: string;   // JSON string of PrescriptionItem[]
}

// Simple text-to-vector using character frequency (for demo purposes)
// In production, use Gemini embeddings or a dedicated embedding model
export function textToVector(text: string): number[] {
  const vector = new Array(VECTOR_SIZE).fill(0);
  const normalized = text.toLowerCase();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = charCode % VECTOR_SIZE;
    vector[index] += 1;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(
    vector.reduce((sum: number, val: number) => sum + val * val, 0)
  );
  if (magnitude > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= magnitude;
    }
  }

  return vector;
}

export async function storeConsultation(
  record: ConsultationRecord
): Promise<boolean> {
  const qdrant = getQdrantClient();
  if (!qdrant) return false;

  try {
    await ensureCollection();

    const vector = textToVector(
      `${record.summary} ${record.keywords.join(" ")} ${record.transcript}`
    );

    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: record.id,
          vector,
          payload: {
            patientName: record.patientName,
            date: record.date,
            summary: record.summary,
            keywords: record.keywords,
            soapNotes: record.soapNotes,
            prescriptions: record.prescriptions,
            transcript: record.transcript,
          },
        },
      ],
    });

    return true;
  } catch (error) {
    console.error("Failed to store consultation:", error);
    return false;
  }
}

export interface SearchResult {
  id: string;
  patientName: string;
  date: string;
  summary: string;
  keywords: string[];
  soapNotes: string;
  prescriptions: string;
  score?: number;
}

export async function searchPatientHistory(
  queryText: string,
  limit: number = 5
): Promise<SearchResult[]> {
  const qdrant = getQdrantClient();
  if (!qdrant) return [];

  try {
    await ensureCollection();

    const vector = textToVector(queryText);

    const results = await qdrant.search(COLLECTION_NAME, {
      vector,
      limit,
      with_payload: true,
    });

    return results.map((r) => ({
      id: String(r.id),
      patientName: (r.payload?.patientName as string) || "Unknown",
      date: (r.payload?.date as string) || "",
      summary: (r.payload?.summary as string) || "",
      keywords: (r.payload?.keywords as string[]) || [],
      soapNotes: (r.payload?.soapNotes as string) || "{}",
      prescriptions: (r.payload?.prescriptions as string) || "[]",
      score: r.score,
    }));
  } catch (error) {
    console.error("Failed to search patient history:", error);
    return [];
  }
}

// Fetch all consultations using Qdrant scroll API (no vector needed)
export async function getAllConsultations(
  limit: number = 50,
  offset?: string | number | null
): Promise<{ records: SearchResult[]; nextOffset: string | number | null }> {
  const qdrant = getQdrantClient();
  if (!qdrant) return { records: [], nextOffset: null };

  try {
    await ensureCollection();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrollArgs: any = { limit, with_payload: true };
    if (offset != null) scrollArgs.offset = offset;

    const result = await qdrant.scroll(COLLECTION_NAME, scrollArgs);

    const records: SearchResult[] = (result.points || []).map((p) => ({
      id: String(p.id),
      patientName: (p.payload?.patientName as string) || "Unknown",
      date: (p.payload?.date as string) || "",
      summary: (p.payload?.summary as string) || "",
      keywords: (p.payload?.keywords as string[]) || [],
      soapNotes: (p.payload?.soapNotes as string) || "{}",
      prescriptions: (p.payload?.prescriptions as string) || "[]",
    }));

    // Sort newest first
    records.sort((a, b) => (b.date > a.date ? 1 : -1));

    return {
      records,
      nextOffset: (result.next_page_offset as string | number | null) ?? null,
    };
  } catch (error) {
    console.error("Failed to scroll consultations:", error);
    return { records: [], nextOffset: null };
  }
}

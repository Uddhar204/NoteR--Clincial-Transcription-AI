import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const message = payload.message;

    if (!message) {
      return NextResponse.json({ error: "No message in payload" }, { status: 400 });
    }

    console.log(`[Vapi Webhook] Received event type: ${message.type}`);

    switch (message.type) {
      case "assistant-request":
        // This is called when a call starts if the Server URL is set at the phone number level.
        // You can return dynamic assistant configuration here.
        console.log("[Vapi Webhook] Assistant request received.");
        return NextResponse.json({
          assistant: {
            model: {
              provider: "openai",
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a silent medical transcription assistant. Stay completely silent. Do not respond.",
                },
              ],
            },
            transcriber: {
              provider: "deepgram",
              model: "nova-2",
              language: "multi",
            },
          },
        });

      case "transcript":
        // Real-time transcript updates from the call
        if (message.role === "user") {
          console.log(`[Vapi Webhook] Transcript: ${message.transcript}`);
        }
        break;

      case "end-of-call-report":
        // The call has ended. You can process the full transcript here.
        console.log("[Vapi Webhook] Call ended. Summary:");
        console.log(message.summary);
        
        // Example: If you wanted to run the LLM structure generation on the backend automatically:
        // const { generateClinicalReport } = await import("@/lib/llm-client");
        // const report = await generateClinicalReport(message.transcript, process.env.OPENROUTER_API_KEY!);
        // console.log("Generated Report:", report);
        break;

      case "status-update":
        console.log(`[Vapi Webhook] Status update: ${message.status}`);
        break;

      default:
        console.log(`[Vapi Webhook] Unhandled event type: ${message.type}`);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (error) {
    console.error("[Vapi Webhook] Error processing request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

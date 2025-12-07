import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) return NextResponse.json({ error: "Script required" }, { status: 400 });

    console.log("🎤 Generating TTS with ElevenLabs");
    console.log(`📝 Script: ${script.substring(0, 100)}...`);

    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not set" }, { status: 500 });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: elevenlabsApiKey,
    });

    // Voice ID from example project: MFZUKuGQUsGJPQjTS4wC
    const voiceId = "MFZUKuGQUsGJPQjTS4wC";

    const audioStream = await elevenlabs.textToSpeech.convert(voiceId, {
      text: script,
      modelId: "eleven_turbo_v2_5",
      voiceSettings: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
      },
    });

    // Convert ReadableStream to buffer
    const reader = audioStream.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      if (value) chunks.push(value);
      done = readerDone;
    }

    const audioBuffer = Buffer.concat(chunks);

    // Save to file
    const filename = `tts_${uuidv4()}.mp3`;
    const filepath = path.join(process.cwd(), "public", "audio", filename);
    await writeFile(filepath, audioBuffer);

    console.log(`✅ TTS generated and saved: /audio/${filename}`);

    return NextResponse.json({
      url: `/audio/${filename}`,
    });
  } catch (error) {
    console.error("❌ TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}

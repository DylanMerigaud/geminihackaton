import { NextRequest, NextResponse } from "next/server";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { script } = await req.json();
    if (!script) return NextResponse.json({ error: "Script required" }, { status: 400 });

    // Initialize TTS client
    const client = new TextToSpeechClient();

    // Synthesize speech
    const [response] = await client.synthesizeSpeech({
      input: { text: script },
      voice: {
        languageCode: "en-US",
        name: "en-US-Journey-D", // Natural sounding voice
        ssmlGender: "MALE",
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.1, // Slightly faster to fit in 18 seconds
        pitch: 0,
      },
    });

    if (!response.audioContent) {
      throw new Error("No audio generated");
    }

    const filename = `tts_${uuidv4()}.mp3`;
    const filepath = path.join(process.cwd(), "public", "audio", filename);
    await writeFile(filepath, response.audioContent as Buffer);

    return NextResponse.json({
      url: `/audio/${filename}`,
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}

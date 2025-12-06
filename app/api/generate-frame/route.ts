import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageReference, sceneId } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const ai = getGeminiClient();

    // Use Nanobanana Pro for image generation
    const response = await ai.models.generateImages({
      model: "nanobanana-pro", // Nanobanana Pro
      prompt: `${prompt}\n\nReference style from: ${imageReference || "modern advertising"}`,
      config: {
        numberOfImages: 1,
        aspectRatio: "9:16", // Vertical for video
        outputMimeType: "image/png",
      },
    });

    if (!response.generatedImages || response.generatedImages.length === 0) {
      throw new Error("No image generated");
    }

    const imageData = response.generatedImages[0].image?.imageBytes;
    if (!imageData) throw new Error("No image data");

    // Save to public folder
    const filename = `frame_${sceneId}_${uuidv4()}.png`;
    const filepath = path.join(process.cwd(), "public", "frames", filename);
    await writeFile(filepath, Buffer.from(imageData, "base64"));

    return NextResponse.json({
      url: `/frames/${filename}`,
      sceneId,
    });
  } catch (error) {
    console.error("Generate frame error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Frame generation failed" },
      { status: 500 }
    );
  }
}

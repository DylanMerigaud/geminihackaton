import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { prompt, imageReference, sceneId } = await req.json();
    if (!prompt)
      return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    console.log(
      `🎨 Generating frame for scene ${sceneId} with Gemini 3 Pro Image (Nano Banana Pro)`
    );
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`🖼️  Reference: ${imageReference}`);

    // Use Google SDK to generate images with Gemini 3 Pro Image
    const ai = getGeminiClient();

    const fullPrompt = `${prompt}\n\nReference style from: ${
      imageReference || "modern advertising"
    }. Aspect ratio: 9:16 vertical format. Create a stunning, high-quality ad image.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }],
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "9:16",
        },
      },
    });

    // Extract image from response parts
    let imageData: string | null = null;
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data;
          break;
        }
      }
      if (imageData) break;
    }

    if (!imageData) {
      throw new Error("No image data returned from Gemini");
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(imageData, "base64");

    // Save to public folder
    const filename = `frame_${sceneId}_${uuidv4()}.png`;
    const filepath = path.join(process.cwd(), "public", "frames", filename);
    await writeFile(filepath, imageBuffer);

    console.log(`✅ Frame generated and saved: /frames/${filename}`);

    return NextResponse.json({
      url: `/frames/${filename}`,
      sceneId,
    });
  } catch (error) {
    console.error("❌ Generate frame error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Frame generation failed",
      },
      { status: 500 }
    );
  }
}

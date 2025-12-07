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

    // Fetch the reference image to pass it directly
    let referenceImageData = null;
    if (imageReference) {
      try {
        const imageResponse = await fetch(imageReference);
        const imageBuffer = await imageResponse.arrayBuffer();
        referenceImageData = Buffer.from(imageBuffer).toString("base64");
      } catch (error) {
        console.warn("⚠️ Could not fetch reference image:", error);
      }
    }

    // Build the content parts with image reference
    const parts: any[] = [];

    if (referenceImageData) {
      parts.push({
        inlineData: {
          data: referenceImageData,
          mimeType: "image/jpeg",
        },
      });
    }

    parts.push({
      text: `Using the product image above as reference, create this scene: ${prompt}

IMPORTANT:
- Use the SAME PRODUCT from the reference image
- Maintain the product's appearance, colors, and design
- Only change the scene context, lighting, and background
- Keep the product recognizable and accurate to the reference
- 9:16 vertical format, UGC-style realistic photography`,
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: [
        {
          role: "user",
          parts,
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

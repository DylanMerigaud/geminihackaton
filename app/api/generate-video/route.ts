import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { prompt, frameUrl, sceneId } = await req.json();
    if (!prompt || !frameUrl) {
      return NextResponse.json({ error: "Prompt and frameUrl required" }, { status: 400 });
    }

    const ai = getGeminiClient();

    // Read the first frame image
    const { readFile: readFileAsync } = await import("fs/promises");
    const filepath = path.join(process.cwd(), "public", frameUrl);
    const imageBuffer = await readFileAsync(filepath);
    const base64Image = imageBuffer.toString("base64");

    // Use Veo 2 for image-to-video (Veo 3.1 not yet available via API, using veo-2.0-generate-001)
    const operation = await ai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: `${prompt}. No music. No audio. No dialogue. Ultra dynamic motion.`,
      image: {
        imageBytes: base64Image,
        mimeType: "image/png",
      },
      config: {
        aspectRatio: "9:16",
        durationSeconds: 4,
      },
    });

    // Poll for completion
    let result = operation;
    while (!result.done) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      result = await ai.operations.getVideosOperation({
        operation: result,
      });
    }

    if (!result.response?.generatedVideos?.[0]?.video?.videoBytes) {
      throw new Error("No video generated");
    }

    const videoData = result.response.generatedVideos[0].video.videoBytes;
    const filename = `video_${sceneId}_${uuidv4()}.mp4`;
    const videoPath = path.join(process.cwd(), "public", "videos", filename);
    await writeFile(videoPath, Buffer.from(videoData, "base64"));

    return NextResponse.json({
      url: `/videos/${filename}`,
      sceneId,
    });
  } catch (error) {
    console.error("Generate video error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video generation failed" },
      { status: 500 }
    );
  }
}

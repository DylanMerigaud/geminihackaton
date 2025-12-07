import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Configure fal.ai client
fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, frameUrl, sceneId } = await req.json();
    if (!prompt || !frameUrl) {
      return NextResponse.json(
        { error: "Prompt and frameUrl required" },
        { status: 400 }
      );
    }

    console.log(`🎬 Generating video for scene ${sceneId} with Veo 3.1`);
    console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);
    console.log(`🖼️  Frame: ${frameUrl}`);

    // Construct the full URL for the image
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:3000`;
    const imageUrl = `${baseUrl}${frameUrl}`;

    // Use fal.ai Veo 3.1 for image-to-video
    const result = await fal.subscribe("fal-ai/veo3.1/fast/image-to-video", {
      input: {
        prompt: `${prompt}. No music. No audio. No dialogue. Ultra dynamic motion.`,
        image_url: imageUrl,
        aspect_ratio: "9:16",
        duration: "4s" as "8s",
        generate_audio: false,
        resolution: "720p",
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log("✅ Video generation complete");
    console.log("Request ID:", result.requestId);

    if (!result.data?.video?.url) {
      throw new Error("No video URL returned from fal.ai");
    }

    // Download the video from fal.ai
    const videoResponse = await fetch(result.data.video.url);
    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer());

    // Save to public folder
    const filename = `video_${sceneId}_${uuidv4()}.mp4`;
    const videoPath = path.join(process.cwd(), "public", "videos", filename);
    await writeFile(videoPath, videoBuffer);

    console.log(`✅ Video saved: /videos/${filename}`);

    return NextResponse.json({
      url: `/videos/${filename}`,
      sceneId,
    });
  } catch (error) {
    console.error("❌ Generate video error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Video generation failed",
      },
      { status: 500 }
    );
  }
}

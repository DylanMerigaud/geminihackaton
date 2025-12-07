import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { SceneAssessment } from "@/lib/types";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { frameUrl, sceneId, sceneType } = await req.json();
    if (!frameUrl) return NextResponse.json({ error: "Frame URL required" }, { status: 400 });

    const ai = getGeminiClient();

    // Read the image file
    const filepath = path.join(process.cwd(), "public", frameUrl);
    const imageBuffer = await readFile(filepath);
    const base64Image = imageBuffer.toString("base64");

    // Use Gemini 3 Pro to assess the frame (as specified in requirements)
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: base64Image,
              },
            },
            {
              text: `Assess this ad frame image (Scene ${sceneId}, Type: ${sceneType}).

Rate each criteria 1-10 and provide brief feedback:

1. Scroll Stopper (1-10): Would this stop someone scrolling? Eye-catching, attention-grabbing?
2. Composition (1-10): Visual balance, rule of thirds, focal point, professional layout?
3. Looks AI (1-10): How obviously AI-generated does this look? (1=photorealistic, 10=clearly AI)
4. Overall (1-10): Overall quality for a converting ad?

Return ONLY valid JSON:
{
  "approved": boolean (true if overall >= 7 and looksAI <= 5),
  "scrollStopper": number,
  "composition": number,
  "looksAI": number,
  "overall": number,
  "feedback": "brief feedback on what could be improved"
}`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();
    const assessment: SceneAssessment = JSON.parse(cleanJson);

    return NextResponse.json({ assessment, sceneId });
  } catch (error) {
    console.error("Assess frame error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Assessment failed" },
      { status: 500 }
    );
  }
}

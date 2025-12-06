import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { ScrapedContent } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const ai = getGeminiClient();

    // Use Gemini to scrape and analyze the page
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-05-20",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this URL and extract information for a 20-second vertical video ad (9:16, 5 scenes x 4 seconds each).

URL: ${url}

Return a JSON object with:
{
  "productName": "name of product/service",
  "brandTone": "describe the brand tone (professional, playful, luxury, etc.)",
  "features": ["key feature 1", "key feature 2", ...],
  "imageUrls": ["url1", "url2", ...] // All product/brand images found
  "hook": "compelling hook text for the ad opening",
  "cta": "call to action text",
  "scenes": [
    {
      "id": 1,
      "imageReference": "most relevant image URL from the page for this scene",
      "nanobananaPrompt": "detailed prompt for Nanobanana Pro to generate first frame - include style, subject, composition, lighting. Reference the product/brand.",
      "veoPrompt": "Veo 3.1 image-to-video prompt. Ultra dynamic camera movement, no music, no audio, no dialogue. Describe motion, transitions, visual effects. 4 seconds."
    },
    // ... 5 scenes total
  ],
  "ttsScript": "Full voiceover script for 20 seconds. Must be under 18 seconds when spoken. Hook -> Features -> CTA structure."
}

IMPORTANT:
- Scene 1: Hook - attention grabbing, scroll stopper
- Scenes 2-4: Content - showcase features/benefits
- Scene 5: CTA - call to action
- Each nanobananaPrompt should create visually stunning, ad-quality images
- Each veoPrompt should describe ultra dynamic motion without any audio
- TTS script should match scene pacing

Return ONLY valid JSON, no markdown.`,
            },
          ],
        },
      ],
    });

    const text = response.text || "";
    // Clean up the response - remove markdown code blocks if present
    const cleanJson = text.replace(/```json\n?|\n?```/g, "").trim();

    const content: ScrapedContent = JSON.parse(cleanJson);

    return NextResponse.json(content);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    );
  }
}

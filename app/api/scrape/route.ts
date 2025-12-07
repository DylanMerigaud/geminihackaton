import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import { ScrapedContent } from "@/lib/types";
import { BrightDataResponseSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const brightdataToken = process.env.BRIGHTDATA_API_TOKEN;
    if (!brightdataToken) {
      return NextResponse.json({ error: "BRIGHTDATA_API_TOKEN not set" }, { status: 500 });
    }

    // Step 1: Scrape with BrightData
    console.log("🔍 Scraping URL with BrightData:", url);
    const brightdataResponse = await fetch(
      "https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l7q7dkf244hwjntr0&notify=false&include_errors=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${brightdataToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: [{ url, zipcode: "", language: "" }],
        }),
      }
    );

    if (!brightdataResponse.ok) {
      const errorText = await brightdataResponse.text();
      console.error("❌ BrightData API error:", errorText);
      return NextResponse.json(
        { error: `BrightData scraping failed: ${errorText}` },
        { status: 500 }
      );
    }

    const rawData = await brightdataResponse.json();

    // BrightData can return either an array or a single object, normalize to array
    const dataArray = Array.isArray(rawData) ? rawData : [rawData];

    // Validate and parse response with Zod
    const parseResult = BrightDataResponseSchema.safeParse(dataArray);

    if (!parseResult.success) {
      console.error("❌ BrightData response validation failed");
      console.error("Error:", parseResult.error.message);
      return NextResponse.json(
        {
          error: "Invalid BrightData response format",
          message: parseResult.error.message,
        },
        { status: 500 }
      );
    }

    const scrapedData = parseResult.data;
    console.log("✅ BrightData scraping completed, data length:", scrapedData.length);

    if (!scrapedData || scrapedData.length === 0) {
      console.error("❌ No data returned from BrightData");
      return NextResponse.json(
        { error: "No data returned from BrightData. The URL may be invalid or not supported." },
        { status: 500 }
      );
    }

    const productData = scrapedData[0]; // Get first product
    console.log("📦 Product data extracted:", {
      title: productData.title,
      brand: productData.brand,
      imagesCount: productData.images?.length || 0,
      featuresCount: productData.features?.length || 0,
    });

    // Extract only relevant data to avoid overwhelming Gemini with huge variation lists
    const relevantData = {
      title: productData.title,
      brand: productData.brand,
      description: productData.product_description,
      features: productData.features,
      images: productData.images,
      price: productData.buybox_prices,
      topReview: productData.customer_says,
      categories: productData.categories,
    };

    // Step 2: Analyze with Gemini 3 Pro
    console.log("🤖 Analyzing scraped data with Gemini 3 Pro");
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this product data and create a 20-second UGC-style vertical video ad (9:16, 5 scenes x 4 seconds each).

Product Data:
${JSON.stringify(relevantData)}

Return a JSON object with:
{
  "productName": "name of product/service",
  "brandTone": "describe the brand tone based on the product (professional, playful, luxury, etc.)",
  "features": ["key feature 1", "key feature 2", ...], // Extract from features, description, top_review
  "imageUrls": ["url1", "url2", ...], // Use the 'images' array from product data
  "hook": "compelling hook text for the ad opening - make it scroll-stopping",
  "cta": "call to action text",
  "scenes": [
    {
      "id": 1,
      "imageReference": "ALWAYS use images[0] - the first image URL from the images array",
      "nanobananaPrompt": "UGC-style realistic prompt for the product in an everyday scene",
      "veoPrompt": "Veo 3.1 image-to-video prompt. Subtle realistic camera movement, no music, no audio, no dialogue. 4 seconds."
    },
    // ... 5 scenes total
  ],
  "ttsScript": "Full voiceover script for 20 seconds. Must be under 18 seconds when spoken. Hook -> Features -> CTA structure."
}

CRITICAL RULES FOR UGC-STYLE REALISTIC ADS:
1. REALISTIC SCENES ONLY - No cinematic, graphic designs, or artistic effects
2. PRODUCT IMAGES ONLY - Choose ONLY images showing the ACTUAL PRODUCT from 'images' array
   - ✅ USE: Photos of the product itself (t-shirt, item, packaging)
   - ❌ NEVER USE: Specification sheets, size charts, diagrams, text-heavy images, infographics
   - Each scene needs a product photo that matches the scene context (flat lay, worn, angled, etc.)
3. EVERYDAY CONTEXTS - Product being worn, unboxed, displayed on table, held in hand, used in daily life
4. NO TEXT/GRAPHICS - Never include text overlays, loading bars, graphic designs, or UI elements in prompts
5. NAIVE & AUTHENTIC - Think genuine customer testimonial video, not polished commercial
6. ONE COHESIVE VIDEO - All 5 scenes should flow together as one continuous UGC video

SCENE STRUCTURE (UGC-style):
- Scene 1 (Hook): Product being unboxed, held up, or first reveal. Use clearest PRODUCT PHOTO (not spec sheet).
- Scenes 2-4 (Features): Show product in use, close-ups of features, worn/displayed in everyday setting. Use different PRODUCT PHOTOS that show the item from different angles.
- Scene 5 (CTA): Product displayed attractively on surface or being used with satisfaction. Use appealing PRODUCT PHOTO angle.

IMAGE REFERENCE SELECTION PRIORITY:
1. First, filter OUT all non-product images (spec sheets, size charts, text graphics)
2. Then, from remaining PRODUCT PHOTOS, select the one that best matches scene context:
   - Flat lay scene → use flat lay product photo
   - Worn/modeled scene → use worn/modeled product photo
   - Close-up scene → use detailed product photo
   - Packaging scene → use packaging product photo

NANOBANANA PROMPT GUIDELINES:
- Describe REALISTIC everyday scenes: "T-shirt laid flat on wooden table", "Person wearing the shirt in casual home setting", "Close-up of shirt fabric texture"
- NEVER mention: graphics, designs on product, text, loading bars, cinematic effects, neon, glowing elements
- Always specify: realistic lighting (natural light, soft indoor lighting), everyday backgrounds (table, room, outdoors)
- Focus on: product visibility, realistic textures, authentic presentation
- Keep it simple and realistic

VEO PROMPT GUIDELINES:
- Subtle movements: slow pan, gentle zoom, slight rotation
- Realistic camera work: handheld feel, smooth movement
- NO dramatic effects, NO graphic animations, NO text reveals

EXAMPLES:
Good: "Vertical 9:16 shot of a black t-shirt laid flat on a light wooden table, natural window lighting, soft shadows, realistic product photography"
Bad: "Cinematic close-up of graphic design with glowing neon elements and starry background"

Good: "Person wearing the t-shirt in a casual home setting, natural indoor lighting, authentic everyday moment"
Bad: "T-shirt floating in space with dynamic graphics and text overlays"

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

    console.log("✅ Gemini analysis completed, scenes generated:", content.scenes.length);

    return NextResponse.json(content);
  } catch (error) {
    console.error("❌ Scrape error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scrape failed" },
      { status: 500 }
    );
  }
}

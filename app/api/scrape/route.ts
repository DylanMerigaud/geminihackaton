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

    // Handle flexible field names and types
    const title = productData.title || productData.name || "Product";

    // Description can be string or array, normalize to string
    let description = "";
    if (typeof productData.product_description === "string") {
      description = productData.product_description;
    } else if (Array.isArray(productData.product_description)) {
      description = productData.product_description.join(" ");
    } else if (typeof productData.description === "string") {
      description = productData.description;
    }

    const images = productData.images || [];

    // Features can be array or other format, normalize to array
    let features: string[] = [];
    if (Array.isArray(productData.features)) {
      features = productData.features.filter((f: any) => typeof f === "string");
    }

    console.log("📦 Product data extracted:", {
      title,
      brand: productData.brand,
      imagesCount: images.length,
      featuresCount: features.length,
    });

    // Validate we have at least one image
    if (!images || images.length === 0) {
      console.error("❌ No product images found in scraped data");
      return NextResponse.json(
        { error: "No product images found. Cannot generate ad without product images." },
        { status: 500 }
      );
    }

    // Extract only relevant data to avoid overwhelming Gemini with huge variation lists
    const relevantData = {
      title,
      brand: productData.brand,
      description,
      features,
      images,
      price: productData.buybox_prices || productData.final_price,
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
  "ttsScript": "Full voiceover script that will take approximately 18-20 seconds when spoken at natural pace. Make it conversational and detailed enough to fill the time. Hook -> Features (explain benefits) -> CTA structure. Aim for 45-55 words total."
}

CRITICAL RULES FOR UGC-STYLE REALISTIC ADS:
1. REALISTIC SCENES ONLY - No cinematic, graphic designs, or artistic effects
2. IMAGE REFERENCE: **ALWAYS USE images[0]** - Use ONLY the FIRST image from the images array for ALL 5 scenes
   - Set "imageReference": images[0] for every single scene
   - This ensures consistency and uses the main product photo
3. EVERYDAY CONTEXTS - Product being worn, unboxed, displayed on table, held in hand, used in daily life
4. NO TEXT/GRAPHICS - Never include text overlays, loading bars, graphic designs, or UI elements in prompts
5. NAIVE & AUTHENTIC - Think genuine customer testimonial video, not polished commercial
6. ONE COHESIVE VIDEO - All 5 scenes should flow together as one continuous UGC video
7. TTS SCRIPT LENGTH - The voiceover should be 45-55 words to fill 18-20 seconds at natural speaking pace (approximately 2.5-3 words per second). Make it conversational with natural pauses.

SCENE STRUCTURE - DIVERSE UGC ADS (Study successful TikTok/Instagram ads):
Real ads use VARIETY and storytelling. Each scene should be DIFFERENT and progress the story:

Scene 1 (HOOK - Stop the scroll): imageReference = images[0]
- Unboxing excitement, product reveal, hand holding product up to camera
- Or: Product in packaging being opened with authentic reaction
- Or: Quick product showcase with immediate benefit/feature callout

Scene 2 (PROOF - Build trust): imageReference = images[0]
- Close-up of quality details: fabric texture, stitching, material feel
- Or: Product tag/label showing quality/authenticity
- Or: Hands touching/feeling the product to show quality

Scene 3 (LIFESTYLE - Show use case): imageReference = images[0]
- Product being worn in everyday context (mirror selfie, casual outfit)
- Or: Product in real-life setting (on couch, at coffee shop, outdoors)
- Or: Product styled with other items (outfit flatlay, lifestyle setting)

Scene 4 (FEATURE - Highlight benefit): imageReference = images[0]
- Demonstrate specific feature (stretching fabric, showing pocket, etc.)
- Or: Multiple angles of product (front, back, detail shot)
- Or: Product in action/being used

Scene 5 (CTA - Drive action): imageReference = images[0]
- Product beautifully displayed, ready to purchase
- Or: Happy customer wearing/using product with satisfaction
- Or: Product with clear view, inviting purchase

NANOBANANA PROMPT WRITING - MAKE EACH SCENE UNIQUE:
Study real successful UGC ads - they vary scenes dramatically:

✅ DIVERSE SCENES (Use variety):
- "Hands unboxing product from package, excitement, soft natural window light, product emerging from tissue paper"
- "Extreme close-up of fabric texture, fingers touching material, showing quality, macro photography feel"
- "Person wearing product looking in bedroom mirror, casual home interior, soft lamp lighting, authentic moment"
- "Hands demonstrating product feature, showing flexibility/quality, white background, clean product focus"
- "Product folded neatly on aesthetic table with coffee and plant, Instagram-worthy flat lay, warm lighting"

❌ REPETITIVE SCENES (Avoid):
- "Product on table" repeated 5 times with slight variations
- Same camera angle for every scene
- Same lighting setup throughout

NANOBANANA RULES:
- Each scene = DIFFERENT camera angle (overhead, eye-level, close-up, full-shot, detail)
- Each scene = DIFFERENT context (unboxing, detail, lifestyle, feature, display)
- Each scene = DIFFERENT lighting when natural (window light, lamp, outdoor, soft indoor)
- NEVER mention text, graphics, overlays, effects
- Specify hands/people when relevant for authentic UGC feel
- Describe product state: folded, worn, held, displayed, being touched

VEO PROMPT DIVERSITY:
- Scene 1: "Hands pulling product from box, subtle unboxing motion, handheld camera feel"
- Scene 2: "Slow zoom into fabric detail, gentle camera push, revealing texture"
- Scene 3: "Slight pan following person's movement in mirror, natural handheld sway"
- Scene 4: "Hands demonstrating feature with gentle rotation, product-focused movement"
- Scene 5: "Slow dolly forward toward product, drawing viewer in, inviting feel"

EXAMPLES OF DIVERSE AD SEQUENCES:
✅ T-Shirt Ad Variety:
1. Hands opening package, pulling out folded shirt
2. Close-up fingers feeling soft fabric texture
3. Person trying on shirt in bedroom mirror
4. Demonstrating shirt fit/stretch with hand pulls
5. Shirt styled in aesthetic flat lay with lifestyle items

✅ NOT This (too similar):
1. Shirt on table
2. Shirt on table from different angle
3. Shirt on table with different lighting
4. Shirt on table folded differently
5. Shirt on table final shot

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

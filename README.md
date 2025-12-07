# AI Video Ad Generator

Automatically generate high-converting vertical video ads (9:16) from any product landing page URL using Google's **Gemini 3 Pro** AI.

## 🎬 Features

- **Automated Ad Generation**: Input any URL and get a complete 20-second video ad
- **AI-Powered Analysis**: Gemini 3 Pro analyzes your product page to extract branding, features, and tone
- **Dynamic Scene Creation**: 5 scenes (4 seconds each) with ultra-dynamic motion
- **Quality Assessment**: AI rates each frame on scroll-stopping power, composition, and photorealism
- **Smart Regeneration**: Automatically regenerate frames that don't meet quality standards
- **Professional Voiceover**: Gemini 3 Pro TTS with optimized pacing (< 18 seconds)
- **Background Music**: Optional music at 20% volume for better engagement
- **Real-time Preview**: Remotion player for instant video preview

## 📐 Specifications

- **Duration**: 20 seconds
- **Aspect Ratio**: 9:16 (vertical/mobile-optimized)
- **Scenes**: 5 scenes × 4 seconds each
- **Structure**: Hook → Features → CTA
- **Model**: Gemini 3 Pro for all AI operations
- **Video Quality**: Configurable (currently set to fast/cheap for testing)

## 🚀 Getting Started

### Prerequisites

**Three API keys needed**:

1. **Google AI API Key**: Get your free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. **BrightData API Token**: Get your token from [BrightData](https://brightdata.com/)
3. **Fal.ai API Key**: Get your API key from [fal.ai](https://fal.ai/)

No complex Google Cloud setup needed!

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd geminihackaton
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Set up your environment variable:
```bash
cp .env.example .env
```

4. Edit `.env` and add your API keys:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here
BRIGHTDATA_API_TOKEN=your_brightdata_token_here
FAL_KEY=your_fal_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎯 How It Works

### 1. URL Input
Enter any product or landing page URL (e.g., e-commerce product, SaaS homepage)

### 2. Web Scraping & AI Analysis
**BrightData** scrapes the product page to extract structured data:
- Product details, pricing, availability
- High-quality product images
- Features, descriptions, reviews
- Brand information

**Gemini 3 Pro** then analyzes the scraped data to create:
- Product name and branding
- Key features and benefits
- Brand tone (professional, playful, luxury, etc.)
- Images for reference
- Ad structure (hook, content, CTA)

### 3. Scene Generation
For each of 5 scenes, the system:
- **First Frame**: Generates using Gemini 3 Pro (Nanobanana) with product-specific prompts
- **Assessment**: Gemini 3 Pro rates the frame on:
  - Scroll Stopper (1-10): Eye-catching potential
  - Composition (1-10): Visual balance and professional layout
  - Looks AI (1-10): Photorealism (lower is better)
  - Overall (1-10): Ad conversion potential
- **Regeneration**: Auto-regenerates if score < 7 or looks too AI-generated
- **Video**: Converts approved frames to 4-second videos using Veo 3.1 (via fal.ai)

### 4. Audio Generation
- **Voiceover**: Gemini 3 Pro TTS creates natural-sounding narration (< 18 seconds)
- **Background Music**: Optional music at 20% volume (add `public/audio/background.mp3`)

### 5. Final Preview
Remotion player combines all scenes, voiceover, and music into a seamless 20-second ad

## 📁 Project Structure

```
geminihackaton/
├── app/
│   ├── api/
│   │   ├── scrape/route.ts           # BrightData scraping + Gemini 3 Pro analysis
│   │   ├── generate-frame/route.ts   # Gemini 3 Pro image generation (Nanobanana)
│   │   ├── assess-frame/route.ts     # Gemini 3 Pro quality assessment
│   │   ├── generate-video/route.ts   # Veo 2.0 video generation
│   │   └── generate-tts/route.ts     # Gemini 3 Pro Text-to-Speech
│   ├── components/
│   │   ├── SceneCard.tsx             # Individual scene display
│   │   ├── VideoComposition.tsx      # Remotion video composition
│   │   └── VideoPlayer.tsx           # Remotion player wrapper
│   └── page.tsx                      # Main UI
├── lib/
│   ├── gemini.ts                     # Gemini client setup
│   └── types.ts                      # TypeScript interfaces
├── public/
│   ├── frames/                       # Generated first frames
│   ├── videos/                       # Generated video clips
│   └── audio/                        # TTS and background music
└── .env.example                      # Environment variables template
```

## 🎨 Customization

### Ad Quality Settings
Currently configured for **fast testing** with lower quality. For production:
- Update Gemini 3 Pro config in `app/api/generate-frame/route.ts`
- Adjust Veo 3.1 settings in `app/api/generate-video/route.ts` (resolution can be upgraded from 720p to 1080p)

### Background Music
Add your music file to `public/audio/background.mp3` - it will automatically play at 20% volume

### Scene Structure
Modify the scene types in `app/page.tsx:93`:
```typescript
const sceneTypes = ["Hook", "Content", "Content", "Content", "CTA"];
```

### Assessment Criteria
Adjust approval thresholds in `app/api/assess-frame/route.ts:44`:
```typescript
"approved": boolean (true if overall >= 7 and looksAI <= 5)
```

## 🔧 API Services Used

### Web Scraping
- **BrightData**: Professional web scraping and data extraction
  - Handles complex websites (Amazon, e-commerce, SaaS pages)
  - Returns structured product data (images, features, reviews, pricing)
  - Reliable and fast data collection

### AI Processing (Gemini 3 Pro)
- **Content Analysis**: Analyzes scraped data to create ad strategy
- **Gemini 3 Pro**: Image generation (Nanobanana) in 9:16 aspect ratio
- **Gemini 3 Pro**: Frame quality assessment
- **Gemini 3 Pro**: Text-to-Speech generation
- **Veo 3.1** (via fal.ai): Image-to-video generation (4 seconds, 9:16, 720p)

## 📊 Assessment Metrics

Each generated frame is rated on:

1. **Scroll Stopper** (1-10): Would this stop someone scrolling on social media?
2. **Composition** (1-10): Professional visual balance, rule of thirds, focal point
3. **Looks AI** (1-10): How photorealistic? (1=real, 10=obviously AI)
4. **Overall** (1-10): Overall quality for a converting ad

Frames are auto-approved if `overall >= 7` AND `looksAI <= 5`

## 🎬 Video Specifications

- **FPS**: 30
- **Resolution**: 1080 x 1920 (9:16)
- **Duration**: 20 seconds (600 frames)
- **Scene Duration**: 4 seconds (120 frames) per scene
- **Prompting**: Veo 3.1 prompts include "no music, no audio, no dialogue, ultra dynamic"

## 🐛 Troubleshooting

### "GOOGLE_GENERATIVE_AI_API_KEY not set"
Make sure `.env` file exists and contains your Gemini API key

### "BRIGHTDATA_API_TOKEN not set"
Make sure `.env` file exists and contains your BrightData token

### "FAL_KEY not set"
Make sure `.env` file exists and contains your fal.ai API key

### API keys not working
- **Gemini**: Verify your API key from [Google AI Studio](https://aistudio.google.com/apikey)
- **BrightData**: Verify your token from [BrightData Dashboard](https://brightdata.com/)
- **Fal.ai**: Verify your API key from [fal.ai](https://fal.ai/)
- Ensure you've enabled the necessary APIs

### Scraping fails
- BrightData has a 1-minute timeout for synchronous requests
- For complex pages, the API may return a 202 status with a snapshot ID
- Check that the URL is valid and accessible

### Generated files not appearing
Check that `public/frames`, `public/videos`, and `public/audio` directories exist (they should be auto-created)

### Frame generation is slow
This is expected - AI image/video generation takes time. Consider using lower quality settings for testing.

## 📦 Dependencies

Core dependencies:
- **@google/genai**: Google's Generative AI SDK (all AI operations)
- **@fal-ai/client**: Fal.ai client for Veo 3.1 video generation
- **BrightData API**: Web scraping service (API-based, no npm package)
- **next**: Next.js framework
- **remotion**: Video composition and preview
- **react**: UI framework

No separate packages needed for scraping or TTS!

## 📝 License

This project is for hackathon/educational purposes.

## 🙏 Acknowledgments

- [BrightData](https://brightdata.com/) - Professional web scraping and data extraction
- [Google Gemini 3 Pro](https://ai.google.dev/) - Powering all AI operations
- [fal.ai](https://fal.ai/) - Veo 3.1 video generation infrastructure
- [Remotion](https://www.remotion.dev/) - Video composition and preview
- [Next.js](https://nextjs.org/) - Web framework

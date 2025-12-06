export interface Scene {
  id: number;
  imageReference: string; // URL from scraped content
  nanobananaPrompt: string; // Prompt for Nanobanana Pro first frame
  veoPrompt: string; // Veo 3.1 image-to-video prompt
  firstFrameUrl?: string; // Generated first frame URL
  videoUrl?: string; // Generated video URL
  assessment?: SceneAssessment;
}

export interface SceneAssessment {
  approved: boolean;
  scrollStopper: number; // 1-10
  composition: number; // 1-10
  looksAI: number; // 1-10 (lower is better)
  overall: number; // 1-10
  feedback: string;
}

export interface ScrapedContent {
  productName: string;
  brandTone: string;
  features: string[];
  imageUrls: string[];
  hook: string; // For ad structure
  cta: string;
  scenes: Scene[];
  ttsScript: string; // Full TTS script
}

export interface GenerationState {
  step: 'idle' | 'scraping' | 'generating-frames' | 'assessing' | 'generating-videos' | 'generating-tts' | 'complete';
  scrapedContent?: ScrapedContent;
  error?: string;
}

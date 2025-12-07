"use client";

import { useState } from "react";
import { ScrapedContent, Scene, GenerationState } from "@/lib/types";
import { SceneCard } from "./components/SceneCard";
import dynamic from "next/dynamic";

// Dynamic import for Remotion Player (client-side only)
const VideoPlayer = dynamic(
  () => import("./components/VideoPlayer").then((mod) => mod.VideoPlayer),
  { ssr: false }
);

export default function Home() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<GenerationState>({ step: "idle" });
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [ttsUrl, setTtsUrl] = useState<string>();
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(
    new Set()
  );

  const scrapeAndGenerate = async () => {
    if (!url) return;
    setState({ step: "scraping" });

    try {
      // Step 1: Scrape with Gemini
      const scrapeRes = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!scrapeRes.ok) throw new Error("Scrape failed");
      const content: ScrapedContent = await scrapeRes.json();

      // VALIDATION: Check scraped content
      console.log("📋 Scraped Content Preview:", {
        productName: content.productName,
        brandTone: content.brandTone,
        scenesCount: content.scenes.length,
        hasHook: !!content.hook,
        hasCta: !!content.cta,
        hasTtsScript: !!content.ttsScript,
      });

      setState({ step: "preview-data", scrapedContent: content });
      setScenes(content.scenes);
    } catch (error) {
      setState({
        step: "idle",
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
  };

  const continueAfterPreview = async () => {
    if (!state.scrapedContent) return;
    const content = state.scrapedContent;

    try {
      // Step 2: Generate TTS first (faster than images)
      setState((s) => ({ ...s, step: "generating-tts" }));
      const ttsRes = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: content.ttsScript }),
      });
      if (ttsRes.ok) {
        const { url: audioUrl } = await ttsRes.json();
        setTtsUrl(audioUrl);
        console.log("✅ TTS Generated:", audioUrl);
      }

      // Step 3: Generate first frames for all scenes
      setState((s) => ({ ...s, step: "generating-frames" }));
      const framePromises = content.scenes.map((scene) =>
        generateFrame(scene.id, scene.nanobananaPrompt, scene.imageReference)
      );
      const frameResults = await Promise.all(framePromises);

      // Check for frame generation errors
      const failedFrames = frameResults.filter((result) => !result?.success);
      if (failedFrames.length > 0) {
        const errorMessage = `❌ ${failedFrames.length} frame(s) failed to generate. Please retry.`;
        console.error(errorMessage, failedFrames);
        setState({
          step: "preview-data",
          scrapedContent: content,
          error: errorMessage,
        });
        return;
      }

      // Frames are auto-approved, skip assessment
      setState((s) => ({ ...s, step: "ready-for-videos" }));
    } catch (error) {
      setState({
        step: "preview-data",
        scrapedContent: state.scrapedContent,
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
  };

  const generateFrame = async (
    sceneId: number,
    prompt: string,
    imageReference: string
  ) => {
    setGeneratingScenes((prev) => new Set(prev).add(sceneId));
    try {
      const res = await fetch("/api/generate-frame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, imageReference, sceneId }),
      });
      if (res.ok) {
        const { url: frameUrl } = await res.json();
        setScenes((prev) =>
          prev.map((s) =>
            s.id === sceneId
              ? {
                  ...s,
                  firstFrameUrl: frameUrl,
                  assessment: {
                    approved: true,
                    scrollStopper: 10,
                    composition: 10,
                    looksAI: 0,
                    overall: 10,
                  },
                }
              : s
          )
        );
        return { success: true };
      } else {
        const error = await res.json();
        console.error(
          `❌ Frame generation failed for scene ${sceneId}:`,
          error
        );
        return {
          success: false,
          error: error.error || "Frame generation failed",
        };
      }
    } catch (error) {
      console.error(`❌ Frame generation error for scene ${sceneId}:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Frame generation failed",
      };
    } finally {
      setGeneratingScenes((prev) => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }
  };

  const assessFrame = async (scene: Scene) => {
    if (!scene.firstFrameUrl) return;
    const sceneTypes = ["Hook", "Content", "Content", "Content", "CTA"];
    const res = await fetch("/api/assess-frame", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        frameUrl: scene.firstFrameUrl,
        sceneId: scene.id,
        sceneType: sceneTypes[scene.id - 1],
      }),
    });
    if (res.ok) {
      const { assessment } = await res.json();
      setScenes((prev) =>
        prev.map((s) => (s.id === scene.id ? { ...s, assessment } : s))
      );
    }
  };

  const assessAllFrames = async () => {
    const currentScenes =
      scenes.length > 0 ? scenes : state.scrapedContent?.scenes || [];
    for (const scene of currentScenes) {
      if (scene.firstFrameUrl) {
        await assessFrame(scene);
      }
    }
  };

  const regenerateFrame = async (scene: Scene) => {
    await generateFrame(scene.id, scene.nanobananaPrompt, scene.imageReference);
    // Re-assess after regeneration
    setTimeout(async () => {
      const updatedScene = scenes.find((s) => s.id === scene.id);
      if (updatedScene?.firstFrameUrl) {
        await assessFrame(updatedScene);
      }
    }, 1000);
  };

  const generateAllVideos = async () => {
    // VALIDATION: Check all frames before video generation
    const approvedScenes = scenes.filter(
      (s) => s.firstFrameUrl && s.assessment?.approved
    );
    console.log("🎬 Video Generation Validation:", {
      totalScenes: scenes.length,
      approvedScenes: approvedScenes.length,
      scenesToGenerate: approvedScenes.map((s) => ({
        id: s.id,
        frameUrl: s.firstFrameUrl,
        prompt: s.veoPrompt.substring(0, 50) + "...",
      })),
    });

    if (approvedScenes.length === 0) {
      alert("No approved frames to generate videos from!");
      return;
    }

    setState((s) => ({ ...s, step: "generating-videos" }));

    // Generate all videos in parallel
    const videoPromises = approvedScenes.map(async (scene) => {
      try {
        console.log(`🎥 Generating video for scene ${scene.id}...`);
        const res = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: scene.veoPrompt,
            frameUrl: scene.firstFrameUrl,
            sceneId: scene.id,
          }),
        });
        if (res.ok) {
          const { url: videoUrl } = await res.json();
          console.log(`✅ Video generated for scene ${scene.id}:`, videoUrl);
          setScenes((prev) =>
            prev.map((s) => (s.id === scene.id ? { ...s, videoUrl } : s))
          );
          return { success: true, sceneId: scene.id };
        } else {
          const error = await res.json();
          console.error(
            `❌ Video generation failed for scene ${scene.id}:`,
            error
          );
          return { success: false, sceneId: scene.id, error };
        }
      } catch (error) {
        console.error(
          `❌ Video generation failed for scene ${scene.id}:`,
          error
        );
        return { success: false, sceneId: scene.id, error };
      }
    });

    // Wait for all videos to complete
    const results = await Promise.all(videoPromises);
    const failedCount = results.filter((r) => !r.success).length;

    if (failedCount > 0) {
      console.warn(`⚠️ ${failedCount} video(s) failed to generate`);
    }

    setState((s) => ({ ...s, step: "complete" }));
  };

  const allFramesApproved =
    scenes.length > 0 && scenes.every((s) => s.assessment?.approved);
  const allVideosGenerated =
    scenes.length > 0 && scenes.every((s) => s.videoUrl);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">
          42 Ad Generator
        </h1>

        {/* URL Input */}
        <div className="mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter product/landing page URL..."
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 shadow-sm"
            />
            <button
              onClick={scrapeAndGenerate}
              disabled={!url || state.step !== "idle"}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
            >
              {state.step === "idle" ? "Generate Ad" : "Processing..."}
            </button>
          </div>
          {state.error && (
            <p className="text-red-600 mt-2 text-sm">{state.error}</p>
          )}
        </div>

        {/* Progress indicator */}
        {state.step !== "idle" &&
          state.step !== "preview-data" &&
          state.step !== "ready-for-videos" && (
            <div className="mb-8 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                <span className="text-gray-600 text-sm">
                  {state.step === "scraping" &&
                    "Scraping and analyzing page..."}
                  {state.step === "generating-frames" &&
                    "Generating first frames..."}
                  {state.step === "assessing" && "Assessing frames with AI..."}
                  {state.step === "generating-videos" &&
                    "Generating Veo 3.1 videos..."}
                  {state.step === "generating-tts" && "Generating voiceover..."}
                  {state.step === "complete" && "Complete!"}
                </span>
              </div>
            </div>
          )}

        {/* Scraped content summary */}
        {state.scrapedContent && (
          <div className="mb-8 p-6 bg-white rounded-lg border-2 border-blue-400 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              📋 Content Preview
            </h2>
            <div className="space-y-2 mb-4 text-sm">
              <p className="text-gray-900">
                <strong>Product:</strong> {state.scrapedContent.productName}
              </p>
              <p className="text-gray-600">
                <strong>Brand Tone:</strong> {state.scrapedContent.brandTone}
              </p>
              <p className="text-gray-600">
                <strong>Hook:</strong> {state.scrapedContent.hook}
              </p>
              <p className="text-gray-600">
                <strong>CTA:</strong> {state.scrapedContent.cta}
              </p>
              <p className="text-gray-600">
                <strong>TTS Script:</strong> {state.scrapedContent.ttsScript}
              </p>
              <p className="text-gray-600">
                <strong>Scenes:</strong> {state.scrapedContent.scenes.length}
              </p>
            </div>

            {state.step === "preview-data" && (
              <button
                onClick={continueAfterPreview}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
              >
                ✅ Approve & Continue to TTS + Image Generation
              </button>
            )}
          </div>
        )}

        {/* Scenes grid */}
        {scenes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Scenes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onRegenerate={() => regenerateFrame(scene)}
                  isGenerating={generatingScenes.has(scene.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Generate videos button */}
        {(allFramesApproved || state.step === "ready-for-videos") &&
          !allVideosGenerated && (
            <div className="mb-8 p-6 bg-white rounded-lg border-2 border-green-500 shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-center text-gray-900">
                🎬 Ready for Video Generation
              </h2>
              <p className="text-gray-600 text-center mb-4 text-sm">
                All frames have been approved. Click below to generate Veo 3.1
                videos.
              </p>
              <button
                onClick={generateAllVideos}
                disabled={state.step === "generating-videos"}
                className="w-full px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg font-semibold text-lg transition-all shadow-sm hover:shadow-md"
              >
                {state.step === "generating-videos"
                  ? "Generating Veo 3.1 Videos..."
                  : "🚀 Generate All Videos with Veo 3.1"}
              </button>
            </div>
          )}

        {/* Video Player */}
        {scenes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center text-gray-900">
              Preview
            </h2>
            <VideoPlayer
              scenes={scenes}
              ttsUrl={ttsUrl}
              musicUrl={undefined} // Add background.mp3 to public/audio/ for music
            />
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [generatingScenes, setGeneratingScenes] = useState<Set<number>>(new Set());

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
      setState({ step: "generating-frames", scrapedContent: content });
      setScenes(content.scenes);

      // Step 2: Generate first frames for all scenes
      const framePromises = content.scenes.map((scene) =>
        generateFrame(scene.id, scene.nanobananaPrompt, scene.imageReference)
      );
      await Promise.all(framePromises);

      // Step 3: Assess all frames
      setState((s) => ({ ...s, step: "assessing" }));
      await assessAllFrames();

      // Step 4: Generate TTS
      setState((s) => ({ ...s, step: "generating-tts" }));
      const ttsRes = await fetch("/api/generate-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: content.ttsScript }),
      });
      if (ttsRes.ok) {
        const { url: audioUrl } = await ttsRes.json();
        setTtsUrl(audioUrl);
      }

      setState((s) => ({ ...s, step: "complete" }));
    } catch (error) {
      setState({
        step: "idle",
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
  };

  const generateFrame = async (sceneId: number, prompt: string, imageReference: string) => {
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
          prev.map((s) => (s.id === sceneId ? { ...s, firstFrameUrl: frameUrl } : s))
        );
      }
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
    const currentScenes = scenes.length > 0 ? scenes : state.scrapedContent?.scenes || [];
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
    setState((s) => ({ ...s, step: "generating-videos" }));

    for (const scene of scenes) {
      if (!scene.firstFrameUrl || !scene.assessment?.approved) continue;

      try {
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
          setScenes((prev) =>
            prev.map((s) => (s.id === scene.id ? { ...s, videoUrl } : s))
          );
        }
      } catch (error) {
        console.error(`Video generation failed for scene ${scene.id}:`, error);
      }
    }

    setState((s) => ({ ...s, step: "complete" }));
  };

  const allFramesApproved = scenes.length > 0 && scenes.every((s) => s.assessment?.approved);
  const allVideosGenerated = scenes.length > 0 && scenes.every((s) => s.videoUrl);

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Video Ad Generator</h1>

        {/* URL Input */}
        <div className="mb-8">
          <div className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter product/landing page URL..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={scrapeAndGenerate}
              disabled={!url || state.step !== "idle"}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              {state.step === "idle" ? "Generate Ad" : "Processing..."}
            </button>
          </div>
          {state.error && (
            <p className="text-red-400 mt-2">{state.error}</p>
          )}
        </div>

        {/* Progress indicator */}
        {state.step !== "idle" && (
          <div className="mb-8 p-4 bg-gray-900 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              <span className="text-gray-400">
                {state.step === "scraping" && "Scraping and analyzing page..."}
                {state.step === "generating-frames" && "Generating first frames..."}
                {state.step === "assessing" && "Assessing frames with AI..."}
                {state.step === "generating-videos" && "Generating videos..."}
                {state.step === "generating-tts" && "Generating voiceover..."}
                {state.step === "complete" && "Complete!"}
              </span>
            </div>
          </div>
        )}

        {/* Scraped content summary */}
        {state.scrapedContent && (
          <div className="mb-8 p-4 bg-gray-900 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">{state.scrapedContent.productName}</h2>
            <p className="text-gray-400 mb-2">Tone: {state.scrapedContent.brandTone}</p>
            <p className="text-gray-400 mb-2">Hook: {state.scrapedContent.hook}</p>
            <p className="text-gray-400">CTA: {state.scrapedContent.cta}</p>
          </div>
        )}

        {/* Scenes grid */}
        {scenes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Scenes</h2>
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
        {allFramesApproved && !allVideosGenerated && (
          <div className="mb-8 text-center">
            <button
              onClick={generateAllVideos}
              disabled={state.step === "generating-videos"}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold text-lg transition-colors"
            >
              {state.step === "generating-videos" ? "Generating Videos..." : "Generate All Videos"}
            </button>
          </div>
        )}

        {/* Video Player */}
        {scenes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-center">Preview</h2>
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

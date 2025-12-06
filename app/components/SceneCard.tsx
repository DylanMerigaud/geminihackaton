"use client";

import { Scene } from "@/lib/types";

interface SceneCardProps {
  scene: Scene;
  onRegenerate: () => void;
  isGenerating: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onRegenerate,
  isGenerating,
}) => {
  const sceneTypes = ["Hook", "Content", "Content", "Content", "CTA"];
  const sceneType = sceneTypes[scene.id - 1] || "Scene";

  return (
    <div className="border border-gray-700 rounded-lg p-4 bg-gray-900">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-white">
          Scene {scene.id}: {sceneType}
        </h3>
        {scene.assessment && (
          <span
            className={`px-2 py-1 rounded text-sm ${
              scene.assessment.approved
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {scene.assessment.approved ? "Approved" : "Needs Regen"}
          </span>
        )}
      </div>

      {/* Frame preview */}
      {scene.firstFrameUrl && (
        <div className="mb-3">
          <img
            src={scene.firstFrameUrl}
            alt={`Scene ${scene.id}`}
            className="w-full h-48 object-cover rounded"
          />
        </div>
      )}

      {/* Assessment scores */}
      {scene.assessment && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          <div className="text-gray-400">
            Scroll Stopper:{" "}
            <span className="text-white">{scene.assessment.scrollStopper}/10</span>
          </div>
          <div className="text-gray-400">
            Composition:{" "}
            <span className="text-white">{scene.assessment.composition}/10</span>
          </div>
          <div className="text-gray-400">
            Looks AI:{" "}
            <span className={scene.assessment.looksAI > 5 ? "text-red-400" : "text-green-400"}>
              {scene.assessment.looksAI}/10
            </span>
          </div>
          <div className="text-gray-400">
            Overall:{" "}
            <span className="text-white">{scene.assessment.overall}/10</span>
          </div>
          {scene.assessment.feedback && (
            <div className="col-span-2 text-gray-400 text-xs mt-1">
              {scene.assessment.feedback}
            </div>
          )}
        </div>
      )}

      {/* Regenerate button */}
      {!scene.assessment?.approved && scene.firstFrameUrl && (
        <button
          onClick={onRegenerate}
          disabled={isGenerating}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm"
        >
          {isGenerating ? "Regenerating..." : "Regenerate Frame"}
        </button>
      )}

      {/* Video status */}
      {scene.videoUrl && (
        <div className="mt-2 text-green-400 text-sm">Video generated</div>
      )}
    </div>
  );
};

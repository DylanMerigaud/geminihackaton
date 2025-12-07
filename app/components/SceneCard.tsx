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
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold text-gray-900">
          Scene {scene.id}: {sceneType}
        </h3>
        {scene.assessment && (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              scene.assessment.approved
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {scene.assessment.approved ? "Approved" : "Needs Regen"}
          </span>
        )}
      </div>

      {/* Prompt and reference (before generation) */}
      {!scene.firstFrameUrl && (
        <div className="mb-3 space-y-2">
          <div className="text-xs">
            <p className="text-gray-500 font-medium mb-1">Prompt:</p>
            <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 text-xs">
              {scene.nanobananaPrompt}
            </p>
          </div>
          <div className="text-xs">
            <p className="text-gray-500 font-medium mb-1">Reference:</p>
            {scene.imageReference ? (
              <a
                href={scene.imageReference}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all text-xs"
              >
                {scene.imageReference}
              </a>
            ) : (
              <p className="text-gray-400 italic">No reference</p>
            )}
          </div>
        </div>
      )}

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
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="text-gray-600">
            Scroll Stopper:{" "}
            <span className="text-gray-900 font-medium">{scene.assessment.scrollStopper}/10</span>
          </div>
          <div className="text-gray-600">
            Composition:{" "}
            <span className="text-gray-900 font-medium">{scene.assessment.composition}/10</span>
          </div>
          <div className="text-gray-600">
            Looks AI:{" "}
            <span className={scene.assessment.looksAI > 5 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
              {scene.assessment.looksAI}/10
            </span>
          </div>
          <div className="text-gray-600">
            Overall:{" "}
            <span className="text-gray-900 font-medium">{scene.assessment.overall}/10</span>
          </div>
          {scene.assessment.feedback && (
            <div className="col-span-2 text-gray-600 text-xs mt-1">
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
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded text-sm font-medium transition-all shadow-sm hover:shadow-md"
        >
          {isGenerating ? "Regenerating..." : "Regenerate Frame"}
        </button>
      )}

      {/* Video status */}
      {scene.videoUrl && (
        <div className="mt-2 text-green-600 text-sm font-medium">Video generated</div>
      )}
    </div>
  );
};

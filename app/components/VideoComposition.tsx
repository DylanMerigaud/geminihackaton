"use client";

import { AbsoluteFill, Sequence, Video, Audio, Img, staticFile } from "remotion";
import { Scene } from "@/lib/types";

interface VideoCompositionProps {
  scenes: Scene[];
  ttsUrl?: string;
  musicUrl?: string;
}

const FPS = 30;
const SCENE_DURATION = 4 * FPS; // 4 seconds per scene

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  scenes,
  ttsUrl,
  musicUrl,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Render each scene */}
      {scenes.map((scene, index) => (
        <Sequence
          key={scene.id}
          from={index * SCENE_DURATION}
          durationInFrames={SCENE_DURATION}
        >
          <AbsoluteFill>
            {scene.videoUrl ? (
              <Video
                src={scene.videoUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : scene.firstFrameUrl ? (
              <Img
                src={scene.firstFrameUrl}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 24,
                }}
              >
                Scene {scene.id}
              </div>
            )}
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* TTS Audio */}
      {ttsUrl && (
        <Audio src={ttsUrl} volume={1} />
      )}

      {/* Background music at 20% volume */}
      {musicUrl && (
        <Audio src={musicUrl} volume={0.2} />
      )}
    </AbsoluteFill>
  );
};

export const videoConfig = {
  fps: FPS,
  durationInFrames: 5 * SCENE_DURATION, // 20 seconds
  width: 1080,
  height: 1920,
};

"use client";

import { Player } from "@remotion/player";
import { VideoComposition, videoConfig } from "./VideoComposition";
import { Scene } from "@/lib/types";

interface VideoPlayerProps {
  scenes: Scene[];
  ttsUrl?: string;
  musicUrl?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  scenes,
  ttsUrl,
  musicUrl,
}) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <Player
        component={VideoComposition}
        inputProps={{ scenes, ttsUrl, musicUrl }}
        durationInFrames={videoConfig.durationInFrames}
        fps={videoConfig.fps}
        compositionWidth={videoConfig.width}
        compositionHeight={videoConfig.height}
        style={{
          width: "100%",
          aspectRatio: "9/16",
        }}
        controls
        autoPlay={false}
      />
    </div>
  );
};

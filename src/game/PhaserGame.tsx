"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { createGameConfig } from "./config";
import { BootScene } from "./scenes/BootScene";
import { OpeningScene } from "./scenes/OpeningScene";
import { RocketScene } from "./scenes/RocketScene";
import { LandingScene } from "./scenes/LandingScene";
import { SurfaceScene } from "./scenes/SurfaceScene";
import { EndingScene } from "./scenes/EndingScene";
import { actions, runStore } from "./state/runStore";

// Exactly one Phaser.Game per mount, destroyed on unmount (techspec §11.1).
// In dev, React StrictMode mounts twice; the first instance tears itself down
// on its next frame, so two canvases may exist for one frame — that is expected.
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Phaser.Game(createGameConfig(containerRef.current, [BootScene, OpeningScene, RocketScene, LandingScene, SurfaceScene, EndingScene]));
    if (process.env.NODE_ENV !== "production") {
      // Dev-only console handles for debugging/QA.
      Object.assign(window, { __game: game, __run: { runStore, actions } });
    }
    return () => game.destroy(true);
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}

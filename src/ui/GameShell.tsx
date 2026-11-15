"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/constants";
import { Overlay } from "./Overlay";
import { useRun } from "./useRun";
import { useShortcuts } from "./useShortcuts";
import { TitleScreen } from "./screens/TitleScreen";
import { DestinationSelect } from "./screens/DestinationSelect";
import { DataBeamedHome } from "./screens/DataBeamedHome";
import { audio } from "@/game/audio/engine";
import { startAudioDirector } from "@/game/audio/director";

// Phaser touches `window`, so it is loaded only in the browser (rules §7).
const PhaserGame = dynamic(() => import("@/game/PhaserGame"), { ssr: false });

/**
 * A 16:9 stage, letterboxed in the window. Outer screens (title, destination, end) are React;
 * the game screen mounts a fresh Phaser instance per run (keyed by runId — no persistence).
 * The React UI layer is authored at 1280×720 and scaled with the canvas.
 */
export default function GameShell() {
  useShortcuts();
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const screen = useRun((s) => s.screen);
  const runId = useRun((s) => s.runId);

  // Adaptive audio follows run state. Browsers only allow sound after a user gesture,
  // so the first click/key (e.g. PLAY) unlocks it; until then everything is silent but works.
  useEffect(() => {
    const stop = startAudioDirector();
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __audio: audio }); // dev-only QA handle
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock, true);
    window.addEventListener("keydown", unlock, true);
    return () => {
      stop();
      window.removeEventListener("pointerdown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / GAME_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="flex h-dvh w-dvw items-center justify-center overflow-hidden bg-black">
      <div
        ref={stageRef}
        className="relative aspect-video overflow-hidden"
        style={{ width: `min(100vw, calc(100dvh * ${GAME_WIDTH} / ${GAME_HEIGHT}))` }}
      >
        {screen === "game" && (
          <div className="absolute inset-0">
            <PhaserGame key={runId} />
          </div>
        )}
        {/* CSS zoom (not transform) so the layout box shrinks too — a transformed 1280×720 box
            would overflow the stage and let focus() scroll the whole game out of view. */}
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: GAME_WIDTH, height: GAME_HEIGHT, zoom: scale }}
        >
          {screen === "title" && <TitleScreen />}
          {screen === "destination" && <DestinationSelect />}
          {screen === "game" && <Overlay />}
          {screen === "data_home" && <DataBeamedHome />}
          {/* Space Apps 2026: AI-generated images must carry a visible watermark. Shown wherever the
              AI pixel-art sprites appear; real NASA photos are labelled separately as NASA images. */}
          {(screen === "destination" || screen === "game") && (
            <div
              className={`absolute font-mono text-[10px] tracking-[0.25em] text-white/55 [text-shadow:0_0_3px_#000] ${
                // the terminal art has its console and character at bottom centre — keep the mark clear of them
                screen === "destination" ? "bottom-[8px] right-[16px] text-white/70" : "bottom-1 left-1/2 -translate-x-1/2"
              }`}
            >
              PIXEL ART: AI-GENERATED
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

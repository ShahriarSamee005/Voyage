"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A Sketchfab model shown through Sketchfab's official embed (for models whose authors allow
 * embedding but not downloading). Auto-spins; drag to rotate, scroll to zoom.
 *
 * Keyboard: a cross-origin iframe swallows every key press once it has focus, which would kill
 * T / Esc / arrows. Mouse dragging and the wheel don't need focus, so whenever the iframe takes
 * focus we hand it straight back to the page.
 */
export function SketchfabViewer({ modelId, title }: { modelId: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const reclaim = () => {
      window.setTimeout(() => {
        if (document.activeElement === frameRef.current) {
          frameRef.current?.blur();
          window.focus();
        }
      }, 0);
    };
    window.addEventListener("blur", reclaim);
    return () => window.removeEventListener("blur", reclaim);
  }, []);

  const params = new URLSearchParams({
    autostart: "1",
    autospin: "0.3",
    preload: "1",
    dnt: "1",
    ui_theme: "dark",
    ui_infos: "0",
    ui_help: "0",
    ui_settings: "0",
    ui_inspector: "0",
    ui_vr: "0",
    ui_ar: "0",
    ui_annotations: "0",
  });

  return (
    <div className="relative h-full w-full">
      {/* Sits under the iframe: visible until Sketchfab paints the model over it. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
        <span className="font-mono text-[12px] tracking-[0.3em] text-ui-cyan/80">CONNECTING TO 3D VIEWER</span>
        <span className="h-1.5 w-48 overflow-hidden rounded-full bg-ui-cyan/15">
          <span className="block h-full w-1/3 animate-[hub-scan_1.2s_ease-in-out_infinite] bg-ui-cyan" />
        </span>
        <span className="text-[13px] text-ui-muted">Needs an internet connection</span>
      </div>
      <iframe
        ref={frameRef}
        title={title}
        src={`https://sketchfab.com/models/${modelId}/embed?${params}`}
        allow="autoplay; fullscreen; xr-spatial-tracking"
        tabIndex={-1}
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

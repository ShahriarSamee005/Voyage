"use client";

import { useEffect } from "react";
import { actions, runStore } from "@/game/state/runStore";
import { audio } from "@/game/audio/engine";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

/**
 * UI shortcuts in ONE place (design.md §11.2 priority: confirm → text entry → Hub → gameplay).
 * T toggles the Hub, Esc/P handle pause. T and P are ignored while typing (rules §4, techspec §7.5).
 * Movement and the E tool key stay in Phaser and are frozen while any overlay is open.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const s = runStore.get();
      const typing = isTyping(e.target);
      const key = e.key.toLowerCase();

      if (key === "escape") {
        if (s.confirmReturnOpen) actions.cancelReturnToTitle();
        else if (s.pauseOpen) actions.resume();
        else if (s.hubOpen) actions.closeHub();
        else actions.openPause();
        e.preventDefault();
        return;
      }
      if (typing) return;
      if (key === "t") {
        if (s.hubOpen) actions.closeHub();
        else actions.openHub("my_rover");
        e.preventDefault();
      } else if (key === "m") {
        audio.setMuted(!audio.isMuted);
        runStore.set({ toast: audio.isMuted ? "Sound off (M)" : "Sound on (M)" });
        e.preventDefault();
      } else if (key === "c") {
        actions.quickCharge(); // optional coin spend; validated inside the action
        e.preventDefault();
      } else if (key === "p") {
        if (s.pauseOpen) actions.resume();
        else actions.openPause();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

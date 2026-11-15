"use client";

import { useEffect } from "react";
import { actions, runStore } from "@/game/state/runStore";
import { audio } from "@/game/audio/engine";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
}

/** The physical key (e.code) for letters, so shortcuts work on any keyboard layout or with Caps Lock. */
function keyOf(e: KeyboardEvent): string {
  if (e.key === "Escape" || e.code === "Escape") return "escape";
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  return e.key.toLowerCase();
}

/** Why T can't open the Hub right now (shown as a toast so the key never feels dead), or null. */
function hubBlockedReason(): string | null {
  const s = runStore.get();
  if (s.screen !== "game") return null; // title / destination screens: nothing to say
  if (s.stage === "rocket") return "The Rover Hub opens once you land on Mars (T)";
  if (s.stage !== "surface") return null; // cinematics stay uninterrupted
  if (s.mode === "travel") return "Jumping to the next site. The Rover Hub opens when you arrive (T)";
  if (s.mode !== "explore") return null;
  if (s.dialogue) return "Finish the conversation first, then press T for the Rover Hub";
  return null;
}

/**
 * UI shortcuts in ONE place (design.md §11.2 priority: confirm → text entry → Hub → gameplay).
 * T toggles the Hub, Esc/P handle pause. T and P are ignored while typing (rules §4, techspec §7.5).
 * Movement and the E tool key stay in Phaser and are frozen while any overlay is open.
 * Listens on window (bubble phase, so it runs last). Nothing else on the page stops these keys,
 * except the panels that deliberately own Esc / arrows while open (full-screen photo, rover menu):
 * they listen in the capture phase and stop the event.
 */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts (Ctrl+T…) alone
      const s = runStore.get();
      const typing = isTyping(e.target);
      const key = keyOf(e);

      if (key === "escape") {
        if (s.confirmReturnOpen) actions.cancelReturnToTitle();
        else if (s.pauseOpen) actions.resume();
        else if (s.hubOpen) actions.closeHub();
        else actions.openPause();
        if (typing) (e.target as HTMLElement).blur();
        e.preventDefault();
        return;
      }
      if (typing) return;
      if (key === "t") {
        if (s.hubOpen) actions.closeHub();
        else if (s.pauseOpen) return;
        else {
          actions.openHub("my_rover");
          if (!runStore.get().hubOpen) {
            const why = hubBlockedReason();
            if (why) runStore.set({ toast: why });
          }
        }
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

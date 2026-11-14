"use client";

import { useSyncExternalStore } from "react";
import { runStore } from "@/game/state/runStore";
import type { RunState } from "@/game/state/types";

/** Subscribe a component to one slice of run state. Selectors must return primitives or existing references. */
export function useRun<T>(selector: (s: RunState) => T): T {
  return useSyncExternalStore(
    runStore.subscribe,
    () => selector(runStore.get()),
    () => selector(runStore.get()),
  );
}

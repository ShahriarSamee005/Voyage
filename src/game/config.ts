import * as Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./constants";

// Aspect-preserving FIT + letterbox, pixel-crisp sampling (techspec §11.1).
export { GAME_HEIGHT, GAME_WIDTH };

export function createGameConfig(
  parent: HTMLElement,
  scenes: Phaser.Types.Scenes.SceneType[],
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#0c1828", // design.md ui.background
    pixelArt: true,
    roundPixels: true,
    physics: {
      default: "arcade",
      arcade: { debug: false },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: scenes,
  };
}

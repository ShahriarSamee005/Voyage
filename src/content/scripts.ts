// VERBATIM from prd.md §4.8 — do not paraphrase (rules §3). Checked line-by-line Nov 14 2026.
import type { CinematicScripts } from "./types";

export const scripts: CinematicScripts = {
  "opening": {
    "id": "opening",
    "speaker": "mission_control",
    "lines": [
      "Voyage, this is Mission Control.",
      "Your mission is to reach Mars and locate three explorers left behind: Sojourner, Spirit, and Opportunity.",
      "Inspect each rover, record its condition, and search for surviving data or equipment worth recovering.",
      "Their missions ended long ago, but their discoveries still matter.",
      "Follow their trail, and bring what you learn back to Earth.",
      "You are cleared for launch."
    ]
  },
  "openingTags": [
    "MISSION: VOYAGE",
    "DESTINATION: MARS",
    "SOJOURNER · SPIRIT · OPPORTUNITY",
    "INSPECT · DOCUMENT · RECOVER",
    "MISSION AUTHORIZED"
  ],
  "landing": {
    "id": "landing",
    "speaker": "mission_control",
    "lines": [
      "Approaching Mars.",
      "In 1997, Mars Pathfinder carried Sojourner—the first rover to explore this planet.",
      "A parachute and rockets slowed its descent. Giant airbags cushioned the landing as the spacecraft bounced across the Martian surface.",
      "Years later, our own lander is approaching the same red world.",
      "The technology has changed. But the reason we explore remains the same: to discover what lies beyond.",
      "Prepare for touchdown."
    ]
  },
  "ending": {
    "id": "ending",
    "speaker": "player_rover",
    "lines": [
      "That little light... Earth.",
      "It's so small from here.",
      "Hard to believe that's where my journey began.",
      "I came all this way to remember the ones who were left behind.",
      "Maybe... someday... someone will remember me, too."
    ]
  }
};

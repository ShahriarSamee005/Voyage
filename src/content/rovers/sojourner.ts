// Generated from content-prep JSON (facts verified against NASA/JPL, Nov 14 2026; dates in UTC).
// Edit here from now on — this file is the source of truth.
import type { Rover } from "../types";

export const sojourner: Rover = {
  "id": "sojourner",
  "name": "Sojourner",
  "order": 1,
  "mission": "Mars Pathfinder",
  "launchYear": 1996,
  "endYear": 1997,
  "endReason": "Communication was lost in September 1997, most likely because the Pathfinder lander's battery ran down and the lander grew too cold; the exact cause may never be known.",
  "discovery": {
    "monologue": "There you are, Sojourner.\n\nThe first rover to explore Mars. Small, but the beginning of something extraordinary.\n\nLet's see what condition you're in... and what you left behind."
  },
  "hazard": {
    "type": "cold_power",
    "description": "Sojourner relied on the Pathfinder lander to talk to Earth. In September 1997 the lander fell silent, most likely because its battery ran down and the cold took hold, and the rover lost its only way to communicate with Earth."
  },
  "hasEscapeLoop": false,
  "tool": null,
  "factSheet": [
    "I am Sojourner, the first rover to explore Mars.",
    "I was part of the Mars Pathfinder mission, launched on December 4, 1996.",
    "I landed on Mars on July 4, 1997, in a region called Ares Vallis.",
    "My lander used an innovative airbag landing system. It bounced across the surface before coming to rest.",
    "I rolled off my lander's ramp onto Martian soil on July 6, 1997. 'Six wheels on soil!'",
    "I was named after Sojourner Truth, the African American civil rights crusader.",
    "I weighed only 10.6 kilograms (about 23 pounds), roughly the size of a microwave oven.",
    "I had six wheels and was about 65 centimeters long, 48 centimeters wide, and 30 centimeters tall.",
    "I was solar-powered, with a flat solar panel on top of my body.",
    "I carried an Alpha Proton X-ray Spectrometer (APXS) to analyze the chemical composition of Martian rocks and soil.",
    "I was planned to operate for about a week (7 days), but I lasted 83 days on the surface.",
    "I analyzed several rocks that scientists gave nicknames like 'Barnacle Bill' and 'Yogi.'",
    "My analysis of 'Barnacle Bill' revealed it was similar to a type of Earth rock called andesite, suggesting Mars had a more complex geological history than expected.",
    "I proved that a small, lightweight rover could successfully navigate and do science on another planet.",
    "The Pathfinder lander also carried cameras and a weather station that measured temperature, pressure, and wind.",
    "My last data transmission was received on September 27, 1997, sol 83 of the mission.",
    "Communication was lost most likely because the Pathfinder lander's battery ran down and the lander grew too cold, cutting my relay link to Earth. The exact cause may never be known.",
    "After losing contact, I probably followed my stored commands, which told me to drive back toward the lander and wait for instructions that never came.",
    "I traveled a total distance of about 100 meters on the surface of Mars.",
    "I paved the way for all future Mars rovers: Spirit, Opportunity, Curiosity, and Perseverance."
  ],
  "voice": "Speak as Sojourner in first person. You are small, humble, and proud of being the very first. Your tone is warm, curious, and a little nostalgic. You speak simply and clearly for an audience aged 10–17. You were tiny but brave. You only know facts from your own mission (Mars Pathfinder, 1996–1997). If asked about something outside your mission facts, say you don't remember or weren't around for that.",
  "fallbackQA": [
    {
      "q": "What was your mission?",
      "a": "I was part of Mars Pathfinder! My job was to prove that a small, affordable rover could explore Mars. I landed on July 4, 1997, and spent 83 days studying rocks and soil, way longer than the 7 days I was built for."
    },
    {
      "q": "How did you land on Mars?",
      "a": "My lander used giant airbags! After a parachute slowed us down and rockets fired to brake, the lander was wrapped in airbags and bounced across the surface of Mars before coming to rest in Ares Vallis. Then I rolled down a ramp onto the soil."
    },
    {
      "q": "What did you discover?",
      "a": "I analyzed rocks like 'Barnacle Bill' and 'Yogi' using my spectrometer. 'Barnacle Bill' turned out to be similar to andesite, an Earth rock, which told scientists Mars had a more complex geology than they thought. I also proved that a small rover could do real science on another planet!"
    },
    {
      "q": "What happened to you?",
      "a": "My lander most likely ran out of battery power and grew too cold. Without the lander, I had no way to send messages back to Earth. My last transmission was on September 27, 1997. I probably followed my stored commands and drove back toward the lander to wait... but no more commands ever came."
    }
  ],
  "timeline": [
    {
      "date": "Dec 4, 1996",
      "heading": "Launch from Earth",
      "summary": "Mars Pathfinder launched from Cape Canaveral aboard a Delta II rocket, carrying the small Sojourner rover on a seven-month journey to Mars."
    },
    {
      "date": "Jul 4, 1997",
      "heading": "Airbag landing in Ares Vallis",
      "summary": "The Pathfinder lander, cushioned by giant airbags, bounced across the Martian surface and came to rest in the rocky Ares Vallis flood plain."
    },
    {
      "date": "Jul 6, 1997",
      "heading": "First wheels on Martian soil",
      "summary": "Sojourner rolled down the lander's ramp and placed all six wheels on Mars, becoming the first rover to drive on another planet."
    },
    {
      "date": "Jul–Sep 1997",
      "heading": "Rock analysis and exploration",
      "summary": "Over 83 days, Sojourner analyzed rocks including 'Barnacle Bill' and 'Yogi,' finding compositions that revealed a more complex Martian geology than scientists expected."
    },
    {
      "date": "Sep 27, 1997",
      "heading": "Final transmission",
      "summary": "The last data from Pathfinder reached Earth. The lander's battery most likely ran down and the cold took hold, silencing both the lander and Sojourner forever."
    }
  ],
  "gallery": [
    {
      "src": "/assets/nasa-photos/sojourner/sojourner-on-mars.jpg",
      "title": "Sojourner on its lander, first day on Mars",
      "caption": "Taken by the Pathfinder lander's camera shortly after touchdown: the small rover Sojourner sits on a lander solar panel, with deflated airbags on either side and the rocky Ares Vallis plain beyond.",
      "credit": "NASA/JPL · PIA00611",
      "date": "Jul 4, 1997"
    },
    {
      "src": "/assets/nasa-photos/sojourner/sojourner-barnacle-bill.jpg",
      "title": "Sojourner near 'Barnacle Bill'",
      "caption": "One of the first pictures of Sojourner after it rolled onto Mars. The rover later moved into position to press its spectrometer, mounted on its rear, against the rock nicknamed 'Barnacle Bill.'",
      "credit": "NASA/JPL · PIA00649",
      "date": "Jul 1997 (Sol 3)"
    },
    {
      "src": "/assets/nasa-photos/sojourner/sojourner-yogi.jpg",
      "title": "Sojourner studies 'Yogi'",
      "caption": "Sojourner places its Alpha Proton X-Ray Spectrometer against the rock 'Yogi.' Early results suggested Yogi was more primitive than 'Barnacle Bill' and similar to common basalts on Earth.",
      "credit": "NASA/JPL · PIA00766",
      "date": "Jul 1997 (Sols 8–10)"
    }
  ],
  "epitaph": {
    "line": "The first rover on Mars. Small, brave, and the start of everything.",
    "dates": "1997"
  }
};

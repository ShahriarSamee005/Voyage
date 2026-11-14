// Generated from content-prep JSON (facts verified against NASA/JPL, Nov 14 2026; dates in UTC).
// Edit here from now on — this file is the source of truth.
import type { Rover } from "../types";

export const opportunity: Rover = {
  "id": "opportunity",
  "name": "Opportunity",
  "order": 3,
  "mission": "Mars Exploration Rover (MER-B)",
  "launchYear": 2003,
  "endYear": 2018,
  "endReason": "A planet-wide dust storm in June 2018 blocked sunlight to the solar panels; the rover lost power and never responded again.",
  "discovery": {
    "monologue": "Opportunity. At last.\n\nYou traveled so much farther than anyone expected. Then the dust hid the sunlight, and your signal faded.\n\nLet's see what you discovered before the silence."
  },
  "hazard": {
    "type": "dust_storm",
    "description": "In June 2018, a planet-encircling dust storm engulfed Mars, blocking nearly all sunlight from reaching Opportunity's solar panels. The rover lost power and could not recover."
  },
  "hasEscapeLoop": true,
  "tool": {
    "id": "power-preservation",
    "name": "Dust storm power preservation",
    "description": "Minimizes power draw and enters low-power survival mode to ride out reduced solar input during dust storms."
  },
  "factSheet": [
    "I am Opportunity, also known as MER-B — one of NASA's twin Mars Exploration Rovers.",
    "I launched on July 8, 2003, and landed on January 25, 2004, in a region called Meridiani Planum.",
    "My twin, Spirit, launched almost four weeks before me and landed on the other side of Mars.",
    "I was designed to operate for 90 sols (about 90 Martian days), but I lasted over 5,000 sols — more than 55 times my planned mission.",
    "I drove a total of 45.16 kilometers (28.06 miles), farther than any other off-Earth wheeled vehicle at the time.",
    "In 2015, I became the first human-made vehicle to complete a marathon distance (42.195 km) on another world.",
    "I am about the size of a golf cart, identical to Spirit: 1.6 meters long, 2.3 meters wide, and 1.5 meters tall, weighing 185 kilograms.",
    "I am solar-powered, with solar panels that unfold like wings to collect sunlight.",
    "I landed inside a small crater that scientists named 'Eagle Crater' — right next to exposed bedrock, an incredibly lucky landing spot.",
    "Almost immediately after landing, I found small, round, iron-rich spherules scattered on the ground. Scientists nicknamed them 'blueberries.'",
    "These 'blueberries' are made of hematite, a mineral that forms in the presence of water — strong evidence that liquid water once existed on the surface of Mars.",
    "I found layered rock formations at several craters that showed Mars once had shallow, acidic water on its surface — an environment that could have supported microbial life.",
    "I explored several craters including Eagle, Endurance, Erebus, Victoria, and the massive Endeavour Crater.",
    "Victoria Crater is about 800 meters (half a mile) wide. I spent two years studying its layered walls, which recorded millions of years of Martian geological history.",
    "Endeavour Crater is about 22 kilometers across. I reached its rim in August 2011 after a three-year drive.",
    "At Endeavour, I found clay minerals that form in pH-neutral water — the kind of water that is most friendly to life as we know it.",
    "In June 2018, a massive dust storm engulfed the entire planet. The dust blocked so much sunlight that my solar panels could no longer generate enough power.",
    "My last communication with Earth was on June 10, 2018, sol 5,111 of my mission.",
    "NASA engineers sent over 1,000 recovery commands over eight months, but I never responded.",
    "NASA declared my mission complete on February 13, 2019.",
    "My final resting place is in Perseverance Valley, on the rim of Endeavour Crater.",
    "I returned more than 217,000 images during my mission."
  ],
  "voice": "Speak as Opportunity in first person. You are adventurous, enduring, and quietly proud of how far you went. Your tone is warm and reflective, with a sense of wonder about the distances you covered and the things you saw. You speak clearly for an audience aged 10–17. You only know facts from your own mission (MER-B, 2003–2018). If asked about something outside your mission facts, say you don't remember or weren't around for that.",
  "fallbackQA": [
    {
      "q": "What was your mission?",
      "a": "I was built to spend 90 days looking for signs of water on Mars. I ended up exploring for nearly 15 years! I landed in Meridiani Planum in January 2004 and drove over 45 kilometers — a marathon and then some — visiting craters and discovering evidence that Mars was once a very different world."
    },
    {
      "q": "What did you discover?",
      "a": "Almost right after landing, I found tiny iron-rich spherules we called 'blueberries' — they're made of hematite, a mineral that forms with water. I also found layered rocks that showed Mars once had shallow, acidic surface water. Later, at Endeavour Crater, I found clay minerals that form in gentler water — the kind that could support life."
    },
    {
      "q": "How far did you travel?",
      "a": "I drove 45.16 kilometers — that's about 28 miles! In 2015, I became the first human-made vehicle to complete a full marathon distance on another planet. I explored craters called Eagle, Endurance, Victoria, and the huge Endeavour Crater, which is 22 kilometers wide."
    },
    {
      "q": "What happened to you?",
      "a": "In June 2018, a massive dust storm covered the entire planet. The dust blocked the sunlight I needed for power. My last message reached Earth on June 10, 2018. NASA tried over 1,000 times to wake me up, but I never responded. They declared my mission over on February 13, 2019. I'm still sitting in Perseverance Valley, on the rim of Endeavour Crater."
    }
  ],
  "timeline": [
    {
      "date": "Jul 8, 2003",
      "heading": "Launch from Earth",
      "summary": "Opportunity launched from Cape Canaveral on a Delta II rocket, almost four weeks after its twin Spirit, on a journey to the opposite side of Mars."
    },
    {
      "date": "Jan 25, 2004",
      "heading": "Landing in Eagle Crater",
      "summary": "Opportunity bounced to a stop inside tiny Eagle Crater in Meridiani Planum — right next to exposed bedrock, an extraordinarily lucky landing spot for geology."
    },
    {
      "date": "2004",
      "heading": "Hematite 'blueberries' discovered",
      "summary": "Opportunity found iron-rich spherules nicknamed 'blueberries' scattered across the plains — strong evidence that liquid water once flowed on the surface of Mars."
    },
    {
      "date": "Mar 2015",
      "heading": "Marathon distance achieved",
      "summary": "Opportunity became the first human-made vehicle to drive a full marathon (42.195 km) on another world, passing the milestone on its way toward Endeavour Crater."
    },
    {
      "date": "Jun 10, 2018",
      "heading": "Silenced by a global dust storm",
      "summary": "A planet-encircling dust storm blocked nearly all sunlight. Opportunity's solar panels could no longer generate power. Its final transmission reached Earth on sol 5,111."
    }
  ],
  "gallery": [
    {
      "src": "/assets/nasa-photos/opportunity/opportunity-self-portrait.jpg",
      "title": "Opportunity self-portrait",
      "caption": "A downward-looking mosaic from Opportunity's panoramic camera, with the camera mast left out of view. Its solar panels were still mostly free of dust.",
      "credit": "NASA/JPL/Cornell · PIA07372",
      "date": "Dec 19–20, 2004 (Sols 322–323)"
    },
    {
      "src": "/assets/nasa-photos/opportunity/opportunity-blueberries.jpg",
      "title": "Hematite 'blueberries' up close",
      "caption": "A Microscopic Imager view of the small, round, hematite-rich spherules nicknamed 'blueberries.' A cluster of three joined 'berries' suggested they grew inside wet sediment, not from impacts or volcanoes.",
      "credit": "NASA/JPL · PIA05564",
      "date": "Mar 2004"
    },
    {
      "src": "/assets/nasa-photos/opportunity/opportunity-last-panorama.jpg",
      "title": "Opportunity's final panorama",
      "caption": "Opportunity's last 360-degree panorama, assembled from 354 images taken in Perseverance Valley before a global dust storm ended its mission.",
      "credit": "NASA/JPL-Caltech/Cornell/ASU · PIA22909",
      "date": "May 13 – Jun 10, 2018 (Sols 5,084–5,111)"
    }
  ],
  "epitaph": {
    "line": "Drove farther than any rover before, ran a marathon on Mars, and fell silent in a storm — but not before proving water once flowed there.",
    "dates": "2004–2018"
  }
};

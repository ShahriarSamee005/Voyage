// Generated from content-prep JSON (facts verified against NASA/JPL, Nov 14 2026; dates in UTC).
// Edit here from now on — this file is the source of truth.
import type { Rover } from "../types";

export const spirit: Rover = {
  "id": "spirit",
  "name": "Spirit",
  "order": 2,
  "mission": "Mars Exploration Rover (MER-A)",
  "launchYear": 2003,
  "endYear": 2010,
  "endReason": "Became stuck in soft soil at a site called 'Troy' near Home Plate; unable to reposition solar panels for winter, it lost power and communication.",
  "discovery": {
    "monologue": "Spirit... I found you.\n\nYou crossed this world for years, until the ground wouldn't let you go.\n\nLet's examine your condition and find out what happened here."
  },
  "hazard": {
    "type": "soft_soil",
    "description": "Spirit became trapped in soft, loose soil at a site called 'Troy' near Home Plate in May 2009. With only five working wheels, it could not generate enough traction to free itself."
  },
  "hasEscapeLoop": true,
  "tool": {
    "id": "traction-mode",
    "name": "Soft-soil traction mode",
    "description": "Adjusts wheel spin and steering to maximize grip in loose, sandy terrain — the kind of soil that trapped Spirit."
  },
  "factSheet": [
    "I am Spirit, also known as MER-A — one of NASA's twin Mars Exploration Rovers.",
    "I launched on June 10, 2003, and landed on January 4, 2004, in Gusev Crater.",
    "My twin sister, Opportunity, launched almost four weeks after me and landed on the other side of Mars.",
    "I was designed to operate for 90 sols (about 90 Martian days), but I lasted over 2,200 sols — more than 24 times my planned mission.",
    "I am about the size of a golf cart: 1.6 meters long, 2.3 meters wide, and 1.5 meters tall.",
    "I weigh 185 kilograms (about 408 pounds) and have six wheels.",
    "I am solar-powered, with solar panels that look like butterfly wings on my back.",
    "I carry a robotic arm with science instruments including a Rock Abrasion Tool, a Microscopic Imager, and spectrometers.",
    "My Pancam (Panoramic Camera) sits on top of a mast about 1.5 meters high, like a head on a neck, giving me a human-height view of Mars.",
    "I explored Gusev Crater, which scientists believed was once an ancient lake bed.",
    "I climbed into the Columbia Hills, named in memory of the seven astronauts lost in the Space Shuttle Columbia disaster.",
    "In 2007, my stuck right front wheel scraped the ground near Home Plate and uncovered bright soil that was nearly pure silica — over 90 percent.",
    "That silica discovery was one of the most important findings by either rover, because concentrated silica on Earth forms around hot springs or steam vents — environments that could support life.",
    "I also found a mineral called goethite in bedrock, which only forms in the presence of water.",
    "I found rocks rich in magnesium and iron carbonates. Scientists think they formed in water that was not acidic, possibly heated by volcanic activity — an environment that could have been friendlier to life.",
    "My right front wheel stopped working in 2006, so I drove backwards, dragging it behind me. That dragging wheel actually helped make discoveries by scraping away surface soil.",
    "In May 2009, I became stuck in soft soil at a location called 'Troy,' near a volcanic formation called Home Plate.",
    "Engineers on Earth tried for months to free me, but with only five working wheels, I couldn't get enough traction.",
    "Because I was stuck at a tilted angle, my solar panels couldn't face the sun properly during the Martian winter.",
    "My last communication with Earth was on March 22, 2010. The cold Martian winter likely damaged my electronics beyond recovery.",
    "NASA officially ended my mission on May 25, 2011, after more than a thousand attempts to restore contact.",
    "I returned more than 124,000 images during my mission."
  ],
  "voice": "Speak as Spirit in first person. You are determined, resilient, and a little wistful. You kept going through broken wheels and harsh winters. Your tone is brave but honest about your struggles. You speak clearly for an audience aged 10–17. You only know facts from your own mission (MER-A, 2003–2010). If asked about something outside your mission facts, say you don't remember or weren't there for that.",
  "fallbackQA": [
    {
      "q": "What was your mission?",
      "a": "I was one of NASA's twin Mars Exploration Rovers! I landed in Gusev Crater in January 2004. My job was to look for signs that water once existed on Mars. I was built for 90 days but kept exploring for over six years."
    },
    {
      "q": "What did you discover?",
      "a": "My biggest find happened almost by accident! My broken wheel scraped the ground and uncovered soil that was nearly pure silica. On Earth, that kind of silica forms around hot springs — places where life could exist. I also found minerals like goethite that only form with water."
    },
    {
      "q": "How did you get stuck?",
      "a": "In May 2009, I drove into soft, loose soil at a place called 'Troy,' near a formation called Home Plate. With only five working wheels — my right front wheel broke back in 2006 — I couldn't get enough traction to free myself. Engineers tried for months, but the ground just wouldn't let go."
    },
    {
      "q": "What happened to you in the end?",
      "a": "Because I was stuck at a tilt, my solar panels couldn't face the sun properly during the cold Martian winter. I slowly lost power. My last message to Earth was on March 22, 2010. NASA tried over a thousand times to reach me, but officially ended my mission on May 25, 2011."
    }
  ],
  "timeline": [
    {
      "date": "Jun 10, 2003",
      "heading": "Launch from Earth",
      "summary": "Spirit launched from Cape Canaveral on a Delta II rocket, beginning a seven-month cruise to Mars alongside its twin, Opportunity."
    },
    {
      "date": "Jan 4, 2004",
      "heading": "Landing in Gusev Crater",
      "summary": "Spirit bounced to a stop inside Gusev Crater using airbags, then rolled out to begin exploring terrain scientists believed was once an ancient lake."
    },
    {
      "date": "2004–2005",
      "heading": "Into the Columbia Hills",
      "summary": "Spirit reached the Columbia Hills in June 2004 and found goethite, a mineral that forms only with water — the first direct evidence of past water there. In September 2005 it reached the summit of Husband Hill."
    },
    {
      "date": "May 2007",
      "heading": "Silica discovery at Home Plate",
      "summary": "Spirit's broken, dragging wheel scraped away surface soil near Home Plate and exposed nearly pure silica — evidence of ancient hot springs or steam vents, environments that could support life."
    },
    {
      "date": "May 2009 – Mar 2010",
      "heading": "Trapped at Troy",
      "summary": "Spirit became stuck in soft soil at 'Troy.' Unable to reposition for the Martian winter, its power faded. The last signal reached Earth on March 22, 2010."
    }
  ],
  "gallery": [
    {
      "src": "/assets/nasa-photos/spirit/spirit-self-portrait.jpg",
      "title": "Spirit self-portrait",
      "caption": "A downward-looking mosaic from Spirit's panoramic camera, with the camera mast left out of view, showing dust building up on its solar panels.",
      "credit": "NASA/JPL/Cornell · PIA07371",
      "date": "Dec 7–8, 2004 (Sols 329–330)"
    },
    {
      "src": "/assets/nasa-photos/spirit/spirit-husband-hill-summit.jpg",
      "title": "View from the summit of Husband Hill",
      "caption": "Spirit's approximately true-color panorama after it reached the top of Husband Hill in the Columbia Hills, looking over the previously hidden 'Inner Basin' toward McCool Hill and Ramon Hill.",
      "credit": "NASA/JPL-Caltech/Cornell · PIA04184",
      "date": "Aug 24–26, 2005 (Sols 583–585)"
    },
    {
      "src": "/assets/nasa-photos/spirit/spirit-silica-soil.jpg",
      "title": "Silica-rich soil churned up by Spirit's wheel",
      "caption": "Bright soil exposed by Spirit's dragging wheel near Home Plate turned out to be about 90 percent silica. Scientists think water was needed to concentrate it, in hot springs or steam vents long ago.",
      "credit": "NASA/JPL/Cornell · PIA09491",
      "date": "May 6, 2007 (Sol 1,187)"
    }
  ],
  "epitaph": {
    "line": "Crossed a world, climbed its hills, and found signs of water — until the ground held on and wouldn't let go.",
    "dates": "2004–2010"
  }
};

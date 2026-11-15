// Line icons for the Rover Hub (drawn to match the reference: chunky strokes, rounded caps).
type P = { size?: number; className?: string };
const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconGallery = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="9.5" r="1.8" />
    <path d="M3 17l5-5 4 4 3-3 6 6" />
  </svg>
);
export const IconChat = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 5h16v11H9l-5 4z" />
    <path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01" strokeWidth={3} />
  </svg>
);
export const IconBook = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-13c-3-.5-6 0-8 1.5z" />
    <path d="M12 6v13" />
  </svg>
);
export const IconCube = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
  </svg>
);
export const IconTools = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14.5 6.5a3.5 3.5 0 0 0 4.9 4.1L21 12.2 12.2 21l-1.6-1.6a3.5 3.5 0 0 0-4.1-4.9" />
    <path d="M4 4l6.5 6.5M4 4l-1 3 3-1M15 15l5 5" />
  </svg>
);
export const IconGauge = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-5" />
    <path d="M7 17h.01M17 17h.01" strokeWidth={3} />
  </svg>
);
export const IconLock = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor" stroke="none" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
export const IconSignal = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d="M5 20v-3M10 20v-7M15 20v-10M20 20V5" />
  </svg>
);
export const IconRover = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 4h4M16 4v4" />
    <rect x="4" y="8" width="16" height="7" rx="1.5" />
    <circle cx="7" cy="18.5" r="2" />
    <circle cx="12" cy="18.5" r="2" />
    <circle cx="17" cy="18.5" r="2" />
  </svg>
);
export const IconPerson = ({ size, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <circle cx="12" cy="7.5" r="4" />
    <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z" />
  </svg>
);
export const IconSend = ({ size, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <path d="M4 4l17 8-17 8 3-8z" />
  </svg>
);
export const IconBurger = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={2.5}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const IconClose = ({ size, className }: P) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
export const IconChevron = ({ size, className, dir = "left" }: P & { dir?: "left" | "right" | "down" }) => (
  <svg {...base(size)} className={className} strokeWidth={3}>
    <path d={dir === "left" ? "M15 5l-7 7 7 7" : dir === "right" ? "M9 5l7 7-7 7" : "M5 9l7 7 7-7"} />
  </svg>
);
export const IconTriangle = ({ size, className, dir = "left" }: P & { dir?: "left" | "right" }) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <path d={dir === "left" ? "M16 4L6 12l10 8z" : "M8 4l10 8-10 8z"} />
  </svg>
);
export const IconExpand = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);
export const IconRocket = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2c3 2.5 4.5 6 4.5 10.5L14 16h-4l-2.5-3.5C7.5 8 9 4.5 12 2z" />
    <circle cx="12" cy="9" r="1.6" />
    <path d="M7.5 12.5L5 16l3 .5M16.5 12.5L19 16l-3 .5M10 19l2 3 2-3" />
  </svg>
);
export const IconParachute = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10a9 7 0 0 1 18 0c-1.5-1-3-1-4.5 0-1.5-1-3-1-4.5 0-1.5-1-3-1-4.5 0C6 9 4.5 9 3 10z" />
    <path d="M3 10l7.5 8M21 10l-7.5 8M12 10v8" />
    <rect x="9.5" y="18" width="5" height="4" rx="1" />
  </svg>
);
export const IconWheels = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="6" cy="16" r="3" />
    <circle cx="18" cy="16" r="3" />
    <path d="M6 16h.01M18 16h.01" strokeWidth={3} />
    <path d="M3 10h18M9 16h6M12 10V6h4" />
  </svg>
);
export const IconMicroscope = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="10" cy="10" r="6" />
    <path d="M14.5 14.5L20 20" strokeWidth={3} />
    <path d="M7.5 9.5l2-2 3 1.5-1.5 3z" fill="currentColor" stroke="none" />
  </svg>
);
export const IconMountain = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2 20l7-12 4 6 3-4 6 10z" />
    <path d="M9 8l-1.5 3.5L9 11l1 1.5" />
  </svg>
);
export const IconSparkle = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
    <path d="M19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" />
  </svg>
);
export const IconFlag = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M5 21V4M5 4h12l-2.5 4L17 12H5" />
  </svg>
);
export const IconStorm = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8" />
  </svg>
);
export const IconSignalOff = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 20h.01" strokeWidth={3} />
    <path d="M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-3-2" />
    <path d="M3 3l18 18" />
  </svg>
);
export const IconPlay = ({ size, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <path d="M7 4l13 8-13 8z" />
  </svg>
);
export const IconPause = ({ size, className }: P) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" rx="1" />
    <rect x="14" y="4" width="4" height="16" rx="1" />
  </svg>
);

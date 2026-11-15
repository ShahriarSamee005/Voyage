/**
 * Small, quiet "made with AI" watermark (Space Apps 2026 AI rules). Sits in a screen corner,
 * low contrast, never interactive. Real NASA imagery keeps its own "NASA" labels.
 */
type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const CORNER: Record<Corner, string> = {
  "top-left": "left-3 top-2",
  "top-right": "right-3 top-2",
  "bottom-left": "bottom-2 left-3",
  "bottom-right": "bottom-2 right-3",
};

export function AiTag({
  label = "AI-generated art",
  corner = "bottom-right",
  className,
}: {
  label?: string;
  corner?: Corner;
  /** Overrides the corner offsets when a screen needs the tag nudged clear of its own UI. */
  className?: string;
}) {
  return (
    <span
      role="note"
      aria-label={label}
      className={`pointer-events-none absolute z-[5] flex select-none items-center gap-1 rounded-sm bg-black/35 px-1.5 py-px font-mono text-[9.5px] uppercase leading-[14px] tracking-[0.16em] text-white/50 ${className ?? CORNER[corner]}`}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
      </svg>
      {label}
    </span>
  );
}

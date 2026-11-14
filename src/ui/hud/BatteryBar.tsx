"use client";

const SEGMENTS = 10;

/** Segmented battery CHARGE bar (not battery health) — shared by HUD and My Rover. */
export function BatteryBar({ percent, large = false, wide = false }: { percent: number; large?: boolean; wide?: boolean }) {
  const filled = Math.ceil((percent / 100) * SEGMENTS);
  const tone = percent < 20 ? "bg-ui-danger" : percent < 40 ? "bg-ui-warning" : "bg-ui-cyan";
  return (
    <div className="flex gap-[3px]" role="img" aria-label={`Battery charge ${Math.round(percent)} percent`}>
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <div
          key={i}
          className={`${large ? "h-5 w-7" : wide ? "h-3.5 w-[22px]" : "h-3.5 w-4"} rounded-[2px] ${i < filled ? tone : "bg-ui-panel-raised"}`}
        />
      ))}
    </div>
  );
}

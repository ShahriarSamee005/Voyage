"use client";

const SEGMENTS = 10;

/**
 * Segmented battery CHARGE bar (not battery health) — shared by HUD and My Rover.
 * `alert` (low or no power): the whole bar turns red and blinks — empty segments too, so it
 * still blinks at 0%.
 */
export function BatteryBar({
  percent,
  large = false,
  wide = false,
  alert = false,
}: {
  percent: number;
  large?: boolean;
  wide?: boolean;
  alert?: boolean;
}) {
  const filled = Math.ceil((percent / 100) * SEGMENTS);
  const tone = alert || percent < 20 ? "bg-ui-danger" : percent < 40 ? "bg-ui-warning" : "bg-ui-cyan";
  const empty = alert ? "bg-ui-danger/30" : "bg-ui-panel-raised";
  return (
    <div
      className={`flex gap-[3px] ${alert ? "animate-[lowbat-blink_1s_linear_infinite]" : ""}`}
      role="img"
      aria-label={`Battery charge ${Math.round(percent)} percent${alert ? " — low" : ""}`}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <div
          key={i}
          className={`${large ? "h-5 w-7" : wide ? "h-3.5 w-[22px]" : "h-3.5 w-4"} rounded-[2px] ${i < filled ? tone : empty}`}
        />
      ))}
    </div>
  );
}

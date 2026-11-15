"use client";

import { actions, POWER_TOOL_ID, TRACTION_TOOL_ID } from "@/game/state/runStore";
import { TUNING } from "@/game/tuning";
import { LEGS } from "@/game/legs";
import { useRun } from "../useRun";
import { SOLAR_LABEL, TOOL_SHORT } from "../labels";
import { BatteryBar } from "./BatteryBar";

const LEG_TOOL: Record<string, string> = { spirit: TRACTION_TOOL_ID, opportunity: POWER_TOOL_ID };

const panel = "rounded-md border border-ui-border/70 bg-ui-background/85 shadow-lg backdrop-blur-[1px]";

/**
 * Minimal exploration HUD (PRD §4.7): battery + coins upper-left, objective + direction upper-right,
 * Rover Hub [T] lower-left, tool + pause lower-right. Small contextual warning only when needed.
 */
export function Hud() {
  const battery = useRun((s) => Math.round(s.batteryChargePercent));
  const charging = useRun((s) => s.isCharging);
  const solar = useRun((s) => s.solarCondition);
  const coins = useRun((s) => s.coins);
  const objective = useRun((s) => s.objective);
  const warning = useRun((s) => s.warning);
  const canScan = useRun((s) => s.canScan);
  const canJump = useRun((s) => s.canJump);
  const nextPlace = useRun((s) => {
    const next = s.activeEncounterRover ? LEGS[s.activeEncounterRover].next : null;
    return next ? LEGS[next].place : null;
  });
  // Show the tool that belongs to the current leg, once unlocked.
  const legTool = useRun((s) => {
    const id = s.activeEncounterRover ? LEG_TOOL[s.activeEncounterRover] : undefined;
    return id && s.unlockedTools.includes(id) && s.encounterStep !== "complete" ? id : null;
  });
  const toolEngaged = useRun((s) => s.toolEngaged);
  const canQuickCharge = useRun((s) => actions.canQuickCharge(s));
  const showQuickCharge = useRun((s) => s.batteryChargePercent < 80);
  const exploring = useRun((s) => s.mode === "explore" && !s.dialogue && !s.pauseOpen);
  // Low power: only the battery indicator itself (bar + %) blinks red — nothing else changes.
  const lowPower = useRun((s) => s.outOfPower || s.batteryChargePercent < TUNING.lowBatteryWarning);

  if (!exploring) return null;

  return (
    <>
      {/* upper-left: battery + coins */}
      <div data-hud-avoid className={`${panel} absolute left-5 top-5 w-[290px] px-4 py-3`}>
        <div className="mb-1.5 flex items-baseline justify-between font-mono text-[13px] tracking-widest text-ui-muted">
          <span>BATTERY</span>
          <span className={`text-[18px] ${lowPower ? "animate-[lowbat-blink_1s_linear_infinite] text-ui-danger" : "text-ui-text"}`}>
            {battery}%
          </span>
        </div>
        <BatteryBar percent={battery} wide alert={lowPower} />
        <div className="mt-2 flex items-center justify-between font-mono text-[13px]">
          <span className={charging ? "text-ui-cyan" : "text-ui-muted"}>
            ☀ {SOLAR_LABEL[solar]}
            {charging ? " · CHARGING" : ""}
          </span>
          <span className="text-ui-amber" aria-label={`${coins} coins`}>
            ◉ {coins}
          </span>
        </div>
        {showQuickCharge && (
          <button
            type="button"
            onClick={() => actions.quickCharge()}
            disabled={!canQuickCharge}
            className="pointer-events-auto mt-2.5 w-full rounded border border-ui-amber/70 px-2 py-1 font-mono text-[12px] tracking-wider text-ui-amber hover:bg-ui-amber/15 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ui-amber"
            title="Optional: spend coins to skip the solar-charging wait"
          >
            ⚡ QUICK CHARGE +{TUNING.quickChargeAmount}% · {TUNING.quickChargeCost}◉ <span className="text-ui-muted">[C]</span>
          </button>
        )}
      </div>

      {/* upper-right: objective + direction */}
      <div data-hud-avoid className={`${panel} absolute right-5 top-5 flex w-[340px] items-center gap-3 px-4 py-3`}>
        <div className="flex-1">
          <div className="font-mono text-[12px] tracking-widest text-ui-amber">OBJECTIVE</div>
          <div className="text-[15px] leading-snug">{objective.text}</div>
        </div>
        {objective.angle !== null && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ui-cyan/60"
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: `rotate(${objective.angle}rad)` }}>
              <path d="M3 11h13M11 5l6 6-6 6" stroke="#68d7e9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* contextual warning (icon + label + color, never color alone) */}
      {warning && (
        <div data-hud-avoid className="absolute left-1/2 top-5 -translate-x-1/2 rounded border border-ui-warning/70 bg-ui-background/90 px-4 py-1.5 font-mono text-[14px] tracking-widest text-ui-warning">
          ⚠ {warning}
        </div>
      )}

      {canJump && nextPlace && (
        <div
          data-hud-avoid
          className="pointer-events-auto absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-md border border-ui-cyan/80 bg-ui-background/92 px-5 py-2.5 text-[16px] shadow-[0_0_18px_rgba(104,215,233,0.3)]"
        >
          <span>
            Jump point reached. Press <kbd className="rounded border border-ui-cyan px-1.5 font-mono text-ui-cyan">E</kbd> to jump to{" "}
            <strong>{nextPlace}</strong> <span className="text-ui-muted">— or keep exploring</span>
          </span>
          <button
            type="button"
            onClick={() => actions.travelToNextLeg()}
            className="whitespace-nowrap rounded border border-ui-cyan bg-ui-cyan/15 px-3 py-1 font-mono text-[13px] tracking-widest text-ui-cyan hover:bg-ui-cyan/25 focus-visible:outline-2 focus-visible:outline-ui-cyan"
          >
            JUMP ▸
          </button>
        </div>
      )}

      {canScan && (
        <div data-hud-avoid className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-md border border-ui-amber/80 bg-ui-background/90 px-5 py-2 text-[16px]">
          Press <kbd className="rounded border border-ui-amber px-1.5 font-mono text-ui-amber">E</kbd> to scan the rover
          ahead
        </div>
      )}

      {/* lower-left: Rover Hub button */}
      <button
        type="button"
        data-hud-avoid
        onClick={() => actions.openHub("my_rover")}
        className={`${panel} pointer-events-auto absolute bottom-5 left-5 px-4 py-2.5 font-mono text-[14px] tracking-widest text-ui-cyan hover:border-ui-cyan focus-visible:outline-2 focus-visible:outline-ui-cyan`}
      >
        ROVER HUB <span className="ml-1 rounded border border-ui-cyan/60 px-1.5">T</span>
      </button>

      {/* lower-right: tool + pause */}
      <div data-hud-avoid className="absolute bottom-5 right-5 flex items-center gap-3">
        {legTool && (
          <div className={`${panel} px-4 py-2.5 font-mono text-[13px] tracking-wide`}>
            <span className="text-ui-muted">{TOOL_SHORT[legTool]} </span>
            <span className={toolEngaged ? "text-ui-cyan" : "text-ui-muted"}>{toolEngaged ? "ON" : "OFF"}</span>
            <span className="ml-2 rounded border border-ui-border px-1.5 text-ui-muted">E</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => actions.openPause()}
          aria-label="Pause"
          className={`${panel} pointer-events-auto px-4 py-2.5 font-mono text-[14px] text-ui-text hover:border-ui-cyan focus-visible:outline-2 focus-visible:outline-ui-cyan`}
        >
          ❚❚ <span className="ml-1 text-ui-muted">ESC</span>
        </button>
      </div>
    </>
  );
}

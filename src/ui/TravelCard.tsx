"use client";

import type { TravelCard as Travel } from "@/game/state/types";

// Jump between legs (PRD §4.3), redesigned for Phase H (F2): an animated schematic map of Mars.
// Both rover sites are placed by their real coordinates and joined by the great-circle route,
// drawn while a marker travels along it, with the real distance between them.

const MAP_W = 760;
const MAP_H = 380;
const R = Math.PI / 180;

type Site = { lat: number; lon: number };

function toVec(s: Site) {
  return [Math.cos(s.lat * R) * Math.cos(s.lon * R), Math.cos(s.lat * R) * Math.sin(s.lon * R), Math.sin(s.lat * R)];
}
function fromVec([x, y, z]: number[]): Site {
  return { lat: Math.atan2(z, Math.hypot(x, y)) / R, lon: Math.atan2(y, x) / R };
}
/** Points along the great circle from a to b (spherical interpolation). */
function greatCircle(a: Site, b: Site, n = 48): Site[] {
  const va = toVec(a);
  const vb = toVec(b);
  const omega = Math.acos(Math.max(-1, Math.min(1, va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2])));
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k1 = Math.sin((1 - t) * omega) / Math.sin(omega);
    const k2 = Math.sin(t * omega) / Math.sin(omega);
    return fromVec(va.map((v, j) => k1 * v + k2 * vb[j]));
  });
}

export function TravelCard({ travel }: { travel: Travel }) {
  const route = greatCircle(travel.fromSite, travel.toSite);
  // Centre the map on the route's midpoint so the route never wraps across the map's edge.
  const centre = route[Math.floor(route.length / 2)].lon;
  const project = (s: Site) => ({
    x: ((((s.lon - centre + 540) % 360) + 360) % 360) * (MAP_W / 360),
    y: (90 - s.lat) * (MAP_H / 180),
  });
  const pts = route.map(project);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const a = pts[0];
  const b = pts[pts.length - 1];
  const km = Math.round(travel.km / 100) * 100;

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,#0d1626_0%,#05080f_75%)]" role="status">
      <div className="font-mono text-[13px] tracking-[0.45em] text-ui-cyan">JUMP · NEXT REGION</div>
      <div className="mt-3 flex items-center gap-6 font-display text-[26px] tracking-[0.12em]">
        <span className="text-ui-muted">{travel.from.toUpperCase()}</span>
        <span className="text-ui-amber">→</span>
        <span className="text-ui-text">{travel.to.toUpperCase()}</span>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-lg border border-ui-border/70 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <svg width={MAP_W} height={MAP_H} viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-label={`Map: ${travel.from} to ${travel.to}`}>
          <defs>
            <radialGradient id="marsTone" cx="50%" cy="45%" r="75%">
              <stop offset="0" stopColor="#c46a3d" />
              <stop offset="0.7" stopColor="#8f4426" />
              <stop offset="1" stopColor="#5a2617" />
            </radialGradient>
            <pattern id="grid" width={MAP_W / 12} height={MAP_H / 6} patternUnits="userSpaceOnUse">
              <path d={`M ${MAP_W / 12} 0 L 0 0 0 ${MAP_H / 6}`} fill="none" stroke="#f3d2b0" strokeOpacity="0.12" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={MAP_W} height={MAP_H} fill="url(#marsTone)" />
          <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />
          <line x1="0" y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} stroke="#f3d2b0" strokeOpacity="0.3" strokeDasharray="4 6" />
          <text x="8" y={MAP_H / 2 - 6} fill="#f3d2b0" fillOpacity="0.5" fontSize="11" fontFamily="monospace">
            EQUATOR
          </text>

          {/* route: drawn on, then a marker travels along it */}
          <path d={d} fill="none" stroke="#000" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#68d7e9" strokeWidth="3" strokeLinecap="round" pathLength={1} className="travel-route" />
          <circle r="6" fill="#ffe2c2" stroke="#06101d" strokeWidth="2">
            <animateMotion dur="2.2s" begin="0.3s" fill="freeze" path={d} keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" />
          </circle>

          {/* sites */}
          <g>
            <circle cx={a.x} cy={a.y} r="6" fill="#f1aa61" stroke="#06101d" strokeWidth="2" />
            <text x={a.x} y={a.y - 14} textAnchor="middle" fill="#ffe2c2" fontSize="13" fontFamily="monospace" stroke="#06101d" strokeWidth="3" paintOrder="stroke">
              {travel.from}
            </text>
          </g>
          <g>
            <circle cx={b.x} cy={b.y} r="14" fill="none" stroke="#68d7e9" strokeWidth="2" className="travel-ping" />
            <circle cx={b.x} cy={b.y} r="6" fill="#68d7e9" stroke="#06101d" strokeWidth="2" />
            <text x={b.x} y={b.y + 26} textAnchor="middle" fill="#cfeef6" fontSize="13" fontFamily="monospace" stroke="#06101d" strokeWidth="3" paintOrder="stroke">
              {travel.to}
            </text>
          </g>
        </svg>
        <div className="absolute bottom-2 right-3 font-mono text-[10px] tracking-widest text-white/50">SCHEMATIC MAP · REAL SITE COORDINATES</div>
      </div>

      <p className="mt-6 max-w-[680px] text-center text-[16px] leading-relaxed text-ui-muted">
        The real rovers rest about <span className="text-ui-text">{km.toLocaleString("en-US")} km</span> apart on Mars. This jump
        skips the long drive and sets you down near the next one.
      </p>
      <style>{`
        .travel-route { stroke-dasharray: 1; stroke-dashoffset: 1; animation: travel-draw 2.2s 0.3s cubic-bezier(.45,0,.55,1) forwards; }
        @keyframes travel-draw { to { stroke-dashoffset: 0; } }
        .travel-ping { transform-box: fill-box; transform-origin: center; animation: travel-ping 1.2s ease-out infinite; }
        @keyframes travel-ping { from { transform: scale(0.6); opacity: 1; } to { transform: scale(2); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .travel-route { animation: none; stroke-dashoffset: 0; } .travel-ping { animation: none; } }
      `}</style>
    </div>
  );
}

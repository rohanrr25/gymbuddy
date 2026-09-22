"use client";

import { useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { niceTicks, toSessions, type Session } from "@/lib/progress";
import type { LoggedSet } from "@/lib/sets";
import { cn } from "@/lib/utils";

type Metric = "top" | "volume";
const METRICS: { id: Metric; label: string; long: string }[] = [
  { id: "top", label: "Heaviest set", long: "Heaviest set" },
  { id: "volume", label: "Volume", long: "Total volume" },
];

// Chart geometry, in viewBox units. The SVG scales to the column width (max-w-md).
const W = 360;
const H = 200;
const PAD = { left: 44, right: 20, top: 16, bottom: 26 };

const noSubscribe = () => () => {};
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
const shortFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const lb = (n: number) => `${n.toLocaleString()} lb`;

export function ProgressChart({ sets }: { sets: LoggedSet[] }) {
  // Sessions are the phone's calendar days, so they're built on the client only.
  const isClient = useSyncExternalStore(noSubscribe, () => true, () => false);
  const [metric, setMetric] = useState<Metric>("top");
  const [active, setActive] = useState<number | null>(null); // scrubbed session, else the latest

  if (!isClient) return <div className="min-h-96" aria-busy="true" />;

  const sessions = toSessions(sets);
  const valueOf = (s: Session<LoggedSet>) => (metric === "top" ? s.top.weight : s.volume);
  const shown = sessions[active ?? sessions.length - 1];
  const first = sessions[0];
  const metricLong = METRICS.find((m) => m.id === metric)!.long;

  const delta = valueOf(shown) - valueOf(first);
  const deltaText =
    shown === first
      ? null
      : `${delta === 0 ? "Same as" : `${delta > 0 ? "+" : "−"}${lb(Math.abs(delta))} since`} ${shortFormat.format(first.date)}`;

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Chart shows" className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            aria-pressed={metric === m.id}
            onClick={() => setMetric(m.id)}
            className={cn(
              "h-11 rounded-lg text-[0.95rem] font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
              metric === m.id ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* The readout doubles as the tooltip: on a phone, a tooltip would sit under your finger. */}
      <div aria-live="polite">
        <p className="text-sm text-muted-foreground">
          {metricLong}, {dayFormat.format(shown.date)}
        </p>
        <p className="font-display text-6xl font-bold leading-none">
          {metric === "top" ? (
            <>
              {shown.top.weight}
              <span className="text-3xl text-muted-foreground"> lb × {shown.top.reps}</span>
            </>
          ) : (
            <>
              {shown.volume.toLocaleString()}
              <span className="text-3xl text-muted-foreground"> lb</span>
            </>
          )}
        </p>
        {deltaText && <p className="mt-1 text-sm text-muted-foreground">{deltaText}</p>}
      </div>

      {sessions.length < 2 ? (
        <p className="text-muted-foreground">One session so far. Log this exercise on another day to start a trend.</p>
      ) : (
        <Chart sessions={sessions} valueOf={valueOf} active={active} setActive={setActive} label={metricLong} />
      )}

      <section aria-labelledby="sessions" className="flex flex-col gap-2">
        <h2 id="sessions" className="font-display text-2xl font-bold">
          Sessions
        </h2>
        <ul className="divide-y divide-border">
          {[...sessions].reverse().map((s) => (
            <li key={s.key} className="flex flex-col gap-0.5 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{dayFormat.format(s.date)}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Top {s.top.weight} × {s.top.reps}, {lb(s.volume)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground tabular-nums">
                {s.sets.map((set) => `${set.weight} × ${set.reps}`).join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Chart({
  sessions,
  valueOf,
  active,
  setActive,
  label,
}: {
  sessions: Session<LoggedSet>[];
  valueOf: (s: Session<LoggedSet>) => number;
  active: number | null;
  setActive: (i: number | null) => void;
  label: string;
}) {
  const values = sessions.map(valueOf);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const [lo, hi] = [ticks[0], ticks.at(-1)!];
  const t0 = sessions[0].date.getTime();
  const t1 = sessions.at(-1)!.date.getTime();

  // Real dates on x, so missed weeks show as gaps.
  const x = (s: Session<LoggedSet>) => PAD.left + ((s.date.getTime() - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + ((hi - v) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  const points = sessions.map((s, i) => [x(s), y(values[i])] as const);
  const line = points.map(([px, py]) => `${px},${py}`).join(" ");
  const baseline = y(lo);
  const area = `M${points[0][0]},${baseline} L${line.replaceAll(" ", " L")} L${points.at(-1)![0]},${baseline} Z`;
  const last = points.length - 1;
  const showDots = sessions.length <= 20; // past that, dots crowd the line

  // The crosshair snaps to the nearest session; readers aim at a date, not a 2px line.
  function scrub(e: PointerEvent<SVGRectElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const vx = PAD.left + ((e.clientX - box.left) / box.width) * (W - PAD.left - PAD.right);
    let nearest = 0;
    points.forEach(([px], i) => {
      if (Math.abs(px - vx) < Math.abs(points[nearest][0] - vx)) nearest = i;
    });
    setActive(nearest);
  }

  function step(e: KeyboardEvent<SVGSVGElement>) {
    const current = active ?? last;
    const next = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(Math.min(last, Math.max(0, next)));
  }

  const a = active ?? last;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full touch-pan-y overflow-visible rounded-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50"
      role="group"
      aria-label={`${label} over ${sessions.length} sessions. Use the arrow keys to step through them.`}
      tabIndex={0}
      onKeyDown={step}
      onBlur={() => setActive(null)}
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} className="stroke-muted" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
            {t.toLocaleString()}
          </text>
        </g>
      ))}
      <text x={points[0][0]} y={H - 6} className="fill-muted-foreground text-[11px]">
        {shortFormat.format(sessions[0].date)}
      </text>
      <text x={points[last][0]} y={H - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
        {shortFormat.format(sessions[last].date)}
      </text>

      <path d={area} className="fill-plate-blue" fillOpacity={0.1} />
      <polyline points={line} fill="none" className="stroke-plate-blue" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {active !== null && (
        <line x1={points[a][0]} x2={points[a][0]} y1={PAD.top} y2={baseline} className="stroke-foreground/30" strokeWidth={1} />
      )}
      {points.map(([px, py], i) =>
        showDots || i === a ? (
          <circle
            key={sessions[i].key}
            cx={px}
            cy={py}
            r={i === a ? 5 : 4}
            className="fill-plate-blue stroke-background"
            strokeWidth={2}
          />
        ) : null,
      )}
      {/* Only the latest value is labelled; the readout and the list carry the rest. */}
      {active === null && (
        <text x={points[last][0]} y={points[last][1] - 10} textAnchor="end" className="fill-foreground text-[12px] font-semibold tabular-nums">
          {values[last].toLocaleString()}
        </text>
      )}

      <rect
        x={PAD.left}
        y={0}
        width={W - PAD.left - PAD.right}
        height={H}
        fill="transparent"
        onPointerDown={scrub}
        onPointerMove={scrub}
        onPointerLeave={() => setActive(null)}
      />
    </svg>
  );
}

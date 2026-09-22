"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRest } from "@/lib/rest";
import { cn } from "@/lib/utils";

// On/off is a per-phone preference, kept in localStorage (it works fine without it).
const KEY = "gymbuddy:rest-timer";
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}
function readEnabled() {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}
function writeEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {}
  listeners.forEach((l) => l());
}

// Rest between sets. start() must be called from a tap: iOS only lets a web page play
// audio that a tap set up, so the "rest's up" beep is scheduled right then, to play later.
// The countdown is timestamp-based, so it's still right after the phone locks or you switch
// apps. But the page can't beep while it's in the background; that needs push notifications.
export function useRestTimer() {
  const enabled = useSyncExternalStore(subscribe, readEnabled, () => true);
  const [rest, setRest] = useState<{ endsAt: number; seconds: number } | null>(null);
  const [now, setNow] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const scheduled = useRef<OscillatorNode[]>([]);

  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest]);

  useEffect(() => () => cancelBeep(), []);

  function cancelBeep() {
    for (const osc of scheduled.current) {
      try {
        osc.stop();
      } catch {}
    }
    scheduled.current = [];
  }

  function scheduleBeep(inSeconds: number) {
    cancelBeep();
    try {
      const ctx = (audio.current ??= new AudioContext());
      void ctx.resume();
      // Two short beeps: easier to notice than one.
      for (const offset of [0, 0.3]) {
        const t = ctx.currentTime + Math.max(0, inSeconds) + offset;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
        scheduled.current.push(osc);
      }
    } catch {
      // No Web Audio: the screen change still says rest is up.
    }
  }

  function start(seconds: number) {
    const t = Date.now();
    setNow(t);
    setRest({ endsAt: t + seconds * 1000, seconds });
    scheduleBeep(seconds);
  }

  function stop() {
    cancelBeep();
    setRest(null);
  }

  function addTime(seconds: number) {
    if (!rest) return;
    const endsAt = Math.max(rest.endsAt, Date.now()) + seconds * 1000;
    setRest({ endsAt, seconds: rest.seconds + seconds });
    scheduleBeep((endsAt - Date.now()) / 1000);
  }

  const remaining = rest ? rest.endsAt - now : 0;
  const over = rest !== null && remaining <= 0;

  const panel = rest && (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 bg-card p-3 transition-colors",
        over ? "border-plate-green" : "border-border",
      )}
    >
      <span className="sr-only" aria-live="assertive">
        {over ? "Rest’s up" : ""}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">{over ? "Rest’s up. Time over" : `Rest, ${formatRest(rest.seconds)}`}</p>
        {/* Tabular digits: a countdown that changes every second mustn't jitter sideways. */}
        <p role="timer" className="font-display text-5xl font-bold leading-none tabular-nums">
          {over ? `+${formatRest(Math.floor(-remaining / 1000))}` : formatRest(Math.ceil(remaining / 1000))}
        </p>
      </div>
      {!over && (
        <Button variant="secondary" className="h-12 px-4 text-base" onClick={() => addTime(30)}>
          +30s
        </Button>
      )}
      <Button variant="outline" className="h-12 px-4 text-base" onClick={stop}>
        {over ? "Done" : "Skip"}
      </Button>
    </div>
  );

  const toggle = (
    <Button
      variant="ghost"
      aria-pressed={enabled}
      className="h-11 self-end px-3 text-sm text-muted-foreground"
      onClick={() => {
        writeEnabled(!enabled);
        if (enabled) stop();
      }}
    >
      <Timer /> Rest timer {enabled ? "on" : "off"}
    </Button>
  );

  return { enabled, start, stop, panel, toggle };
}

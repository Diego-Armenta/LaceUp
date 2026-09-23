// training-context-builder.ts
// Turns your local run history + goal into (1) a markdown context doc for the AI,
// and (2) a deterministic trend read you can use without ever calling the API.

export interface RunLog {
  date: string;              // ISO date, e.g. "2026-09-20"
  type: "easy" | "tempo" | "long" | "speed" | "recovery";
  plannedDistanceMi: number;
  actualDistanceMi: number;
  plannedPaceSecPerMi: number; // store as seconds for easy math, format for display
  actualPaceSecPerMi: number;
  rpe: number;                 // 1-10
  feltNotes: string;           // free text, e.g. "legs heavy, humid morning"
}

export interface Goal {
  raceName: string;
  raceDateISO: string;
  goalDistanceMi: number;      // 26.2 for marathon
  goalTimeSec: number;         // total seconds, e.g. 3:59:59 -> 14399
}

export interface UpcomingWorkout {
  date: string;
  type: RunLog["type"];
  plannedDistanceMi: number;
  plannedPaceSecPerMi: number;
  weekLabel: string;           // "Week 9 of 16 — Build phase"
}

// ---------- formatting helpers ----------

function fmtPace(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}/mi`;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = Math.round(sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ---------- deterministic trend detection ----------
// Runs entirely locally, no API call. Flags whether the last N same-type
// workouts show a consistent shortfall vs. just one rough outing.

export interface TrendFlag {
  workoutType: RunLog["type"];
  status: "on-track" | "watch" | "recalibrate";
  windowSize: number;
  avgPaceDeltaPct: number;   // positive = slower than planned
  avgRpeDelta: number;       // positive = harder than expected for that workout type
  consecutiveShortfalls: number;
}

const RPE_EXPECTED: Record<RunLog["type"], number> = {
  easy: 4, recovery: 3, tempo: 7, speed: 8, long: 6,
};

export function analyzeTrend(
  history: RunLog[],
  type: RunLog["type"],
  windowSize = 3
): TrendFlag {
  const sameType = history
    .filter((r) => r.type === type)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, windowSize);

  if (sameType.length === 0) {
    return { workoutType: type, status: "on-track", windowSize: 0, avgPaceDeltaPct: 0, avgRpeDelta: 0, consecutiveShortfalls: 0 };
  }

  const paceDeltas = sameType.map(
    (r) => ((r.actualPaceSecPerMi - r.plannedPaceSecPerMi) / r.plannedPaceSecPerMi) * 100
  );
  const rpeDeltas = sameType.map((r) => r.rpe - RPE_EXPECTED[r.type]);

  const avgPaceDeltaPct = paceDeltas.reduce((a, b) => a + b, 0) / paceDeltas.length;
  const avgRpeDelta = rpeDeltas.reduce((a, b) => a + b, 0) / rpeDeltas.length;

  // "shortfall" = notably slower than planned AND felt harder than it should have
  const consecutiveShortfalls = sameType.filter(
    (r, i) => paceDeltas[i] > 4 && rpeDeltas[i] >= 1
  ).length;

  let status: TrendFlag["status"] = "on-track";
  if (consecutiveShortfalls >= sameType.length && sameType.length >= 3) {
    status = "recalibrate"; // every recent workout of this type has been a shortfall
  } else if (consecutiveShortfalls >= 2 || avgPaceDeltaPct > 5) {
    status = "watch"; // a pattern may be forming, not conclusive yet
  }

  return { workoutType: type, status, windowSize: sameType.length, avgPaceDeltaPct, avgRpeDelta, consecutiveShortfalls };
}

// ---------- markdown context builder ----------
// This is what gets sent to the AI. Deterministic trend flags are included
// as pre-computed facts so the model reasons on top of them rather than
// re-deriving arithmetic from a table.

export function buildContextMarkdown(
  goal: Goal,
  recentLogs: RunLog[],
  upcoming: UpcomingWorkout,
  trendFlags: TrendFlag[]
): string {
  const logsSorted = [...recentLogs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);

  const logLines = logsSorted.map((r) => {
    const paceDeltaPct = (((r.actualPaceSecPerMi - r.plannedPaceSecPerMi) / r.plannedPaceSecPerMi) * 100).toFixed(1);
    return `- **${r.date}** — ${r.type}, ${r.actualDistanceMi}mi @ ${fmtPace(r.actualPaceSecPerMi)} ` +
      `(planned ${fmtPace(r.plannedPaceSecPerMi)}, ${paceDeltaPct}% delta), RPE ${r.rpe}. "${r.feltNotes}"`;
  }).join("\n");

  const trendLines = trendFlags.map((t) =>
    `- ${t.workoutType}: ${t.status} (last ${t.windowSize} runs, avg pace delta ${t.avgPaceDeltaPct.toFixed(1)}%, ` +
    `avg RPE delta ${t.avgRpeDelta.toFixed(1)}, ${t.consecutiveShortfalls}/${t.windowSize} shortfalls)`
  ).join("\n");

  return `# Training context

## Goal
- Race: ${goal.raceName} on ${goal.raceDateISO}
- Distance: ${goal.goalDistanceMi} mi
- Goal time: ${fmtTime(goal.goalTimeSec)}

## Upcoming planned workout
- ${upcoming.weekLabel}
- ${upcoming.date}: ${upcoming.type}, ${upcoming.plannedDistanceMi}mi @ ${fmtPace(upcoming.plannedPaceSecPerMi)}

## Trend flags (computed locally, not by the model)
${trendLines || "- No same-type history yet"}

## Recent run history (most recent first, last 14 entries)
${logLines || "- No logs yet"}
`;
}

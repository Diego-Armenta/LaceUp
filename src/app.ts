// app.ts
// Replaces the old inline <script> block in index.html. Same nav/slider logic
// as before, plus real database reads/writes via db.ts.

import { initSchema, saveProfile, getProfile, addRun, getRecentRuns } from "./db";
import type { ProfileRow, RunRow } from "./db";

// ---------- nav ----------

function goTo(name: string) {
  document.querySelectorAll(".nav-item").forEach((el) =>
    el.classList.toggle("active", (el as HTMLElement).dataset.view === name)
  );
  document.querySelectorAll(".view").forEach((el) =>
    el.classList.toggle("active", el.id === "view-" + name)
  );
  window.scrollTo(0, 0);
}
(window as any).goTo = goTo; // keep working if index.html still calls goTo(...) inline

document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => goTo((item as HTMLElement).dataset.view!));
});

// ---------- RPE slider ----------

function updateRpe(el: HTMLInputElement) {
  const out = document.getElementById("rpe-out");
  if (out) out.textContent = el.value;
  const min = +el.min, max = +el.max, val = +el.value;
  const pct = ((val - min) / (max - min)) * 100;
  el.style.setProperty("--fill", pct + "%");
}
(window as any).updateRpe = updateRpe;

// ---------- helpers: time/pace string <-> seconds ----------

// "0:50:30" -> 3030 (seconds)
function durationToSeconds(hms: string): number {
  const parts = hms.split(":").map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.unshift(0);
  const [h, m, s] = parts;
  return h * 3600 + m * 60 + s;
}

// distance + duration -> seconds per mile
function paceSecPerMi(distanceMi: number, durationSec: number): number {
  if (!distanceMi) return 0;
  return durationSec / distanceMi;
}

// ---------- Log a Run ----------

async function saveLog() {
  const date = (document.getElementById("f-date") as HTMLInputElement).value;
  const type = (document.getElementById("f-type") as HTMLSelectElement).value.toLowerCase().split(" ")[0]; // "Tempo run" -> "tempo"
  const dist = parseFloat((document.getElementById("f-dist") as HTMLInputElement).value);
  const durationStr = (document.getElementById("f-time") as HTMLInputElement).value;
  const rpe = parseInt((document.getElementById("f-rpe") as HTMLInputElement).value, 10);
  const felt = (document.getElementById("f-felt") as HTMLTextAreaElement).value;

  const durationSec = durationToSeconds(durationStr);
  const actualPace = paceSecPerMi(dist, durationSec);

  const run: RunRow = {
    date,
    type,
    planned_distance_mi: null, // wire this up once plan generation exists
    actual_distance_mi: dist,
    planned_pace_sec: null,
    actual_pace_sec: actualPace,
    rpe,
    felt_notes: felt,
  };

  await addRun(run);

  const t = document.getElementById("save-toast");
  if (t) {
    t.textContent = "Saved to your training log.";
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 4500);
  }
}
(window as any).saveLog = saveLog;

// ---------- Profile ----------
// NOTE: the profile inputs in index.html don't have ids yet — add the ids
// below to each <input> in the Profile view before this will work:
// name, age, weekly-mileage, years-running, race-5k, race-10k, race-half,
// race-marathon, goal-race-name, goal-race-date, goal-time

async function saveProfileForm() {
  const val = (id: string) => (document.getElementById(id) as HTMLInputElement)?.value ?? null;

  const profile: ProfileRow = {
    name: val("name") ?? "",
    age: val("age") ? parseInt(val("age")!, 10) : null,
    weekly_mileage: val("weekly-mileage") ? parseFloat(val("weekly-mileage")!) : null,
    years_running: val("years-running") ? parseInt(val("years-running")!, 10) : null,
    race_5k: val("race-5k"),
    race_10k: val("race-10k"),
    race_half: val("race-half"),
    race_marathon: val("race-marathon"),
    goal_race_name: val("goal-race-name"),
    goal_race_date: val("goal-race-date"),
    goal_time: val("goal-time"),
  };

  await saveProfile(profile);
  updateSidebarGoal(profile);
  const t = document.getElementById("profile-toast");
  if (t) {
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 3000);
  }
}
(window as any).saveProfileForm = saveProfileForm;

async function loadProfileIntoForm() {
  const p = await getProfile();
  if (!p) return; // nothing saved yet, leave the mock defaults showing

  const set = (id: string, value: string | number | null) => {
    const el = document.getElementById(id) as HTMLInputElement;
    if (el && value !== null && value !== undefined) el.value = String(value);
  };

  set("name", p.name);
  set("age", p.age);
  set("weekly-mileage", p.weekly_mileage);
  set("years-running", p.years_running);
  set("race-5k", p.race_5k);
  set("race-10k", p.race_10k);
  set("race-half", p.race_half);
  set("race-marathon", p.race_marathon);
  set("goal-race-name", p.goal_race_name);
  set("goal-race-date", p.goal_race_date);
  set("goal-time", p.goal_time);
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function updateSidebarGoal(p: ProfileRow) {
  const el = document.querySelector(".goal-line");
  if (!el || !p.goal_race_name) return;
  el.innerHTML = `${p.goal_race_name}<br>${formatDateShort(p.goal_race_date)} · ${p.goal_time ?? "—"}`;
}

// ---------- Dashboard: recent logs ----------

async function loadRecentRunsIntoDashboard() {
  const runs = await getRecentRuns(5);
  const ledger = document.querySelector("#view-dashboard .ledger");
  if (!ledger || runs.length === 0) return; // keep mock rows if there's no real data yet

  // remove existing data rows but keep the head row
  ledger.querySelectorAll(".ledger-row:not(.head-row)").forEach((row) => row.remove());

  for (const r of runs) {
    const pace = r.actual_pace_sec;
    const m = Math.floor(pace / 60);
    const s = Math.round(pace % 60).toString().padStart(2, "0");
    const rpeClass = r.rpe >= 7 ? "hard" : "";

    const row = document.createElement("div");
    row.className = "ledger-row";
    row.innerHTML = `
      <span class="num">${r.date}</span>
      <span class="type-tag">${r.type}</span>
      <span class="num">${r.actual_distance_mi} mi</span>
      <span class="num">${m}:${s}/mi</span>
      <span class="rpe-chip ${rpeClass}">${r.rpe}</span>
      <span class="felt">${r.felt_notes ?? ""}</span>
    `;
    ledger.appendChild(row);
  }
}

// ---------- init ----------

async function init() {
  await initSchema();
  updateRpe(document.getElementById("f-rpe") as HTMLInputElement);
  const profile = await getProfile();
  if (profile) {
    await loadProfileIntoForm();
    updateSidebarGoal(profile);
  }
  await loadRecentRunsIntoDashboard();
}

init();
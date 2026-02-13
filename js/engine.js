"use strict";

const MISSIONS_INDEX_PATH = "js/missions/missions.json";
const STORAGE_KEY = "json_harbor_progress_v3"; // <- new version due to new flags

const elMissionTitle = document.getElementById("mission-title");
const elMissionDesc = document.getElementById("mission-description"); // optional (may be null)
const elEditor = document.getElementById("json-editor");
const elFeedback = document.getElementById("feedback");
const btnReset = document.getElementById("reset-btn");
const btnValidate = document.getElementById("validate-btn");
const elDockHelpLink = document.getElementById("dock-help-link");

const elMissionList = document.getElementById("mission-list");
const elProgressSummary = document.getElementById("progress-summary");

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const overlayPrimary = document.getElementById("overlay-primary");
const overlaySecondary = document.getElementById("overlay-secondary");

let missionsIndex = null;
let currentMission = null;
let currentDockIdx = 0;
let currentMissionIdx = 0;

let progress = {
  introDone: false,
  helpDone: false,
  dockIdx: 0,
  missionIdx: 0,
  completed: {},

  // Story-flavor additions
  dockIntroSeen: {},        // { "dock1": true, ... }
  missionBeforeSeen: {},    // { "dock1-01": true, ... }
  missionSuccessSeen: {}    // { "dock1-01": true, ... } (optional, but useful for reload safety)
};

// ------------------------------------------------------------
// UI helpers
// ------------------------------------------------------------
function setFeedback(type, msg) {
  elFeedback.classList.remove("neutral", "success", "error");
  elFeedback.classList.add(type);
  elFeedback.textContent = msg;
}

function disablePlay(disabled) {
  btnValidate.disabled = disabled;
  btnReset.disabled = disabled;
  elEditor.disabled = disabled;
}

function showOverlay(title, text, primaryLabel, onPrimary, secondaryLabel = null, onSecondary = null) {
  overlayTitle.textContent = title;
  overlayText.innerHTML = text;
  overlayPrimary.textContent = primaryLabel;

  overlayPrimary.onclick = null;
  overlayPrimary.onclick = () => onPrimary && onPrimary();

  if (secondaryLabel) {
    overlaySecondary.style.display = "inline-block";
    overlaySecondary.textContent = secondaryLabel;
    overlaySecondary.onclick = null;
    overlaySecondary.onclick = () => onSecondary && onSecondary();
  } else {
    overlaySecondary.style.display = "none";
    overlaySecondary.onclick = null;
  }

  overlay.classList.add("overlay-show");
}

function hideOverlay() {
  overlay.classList.remove("overlay-show");
}

function updateDockHelpLink() {
  if (!elDockHelpLink || !missionsIndex) return;
  const dockId = missionsIndex.docks[currentDockIdx].dockId; // "dock1"
  elDockHelpLink.href = `index.html#${dockId}-guide`;
}

// ------------------------------------------------------------
// Storage
// ------------------------------------------------------------
function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    if (!obj.completed || typeof obj.completed !== "object") obj.completed = {};
    if (!obj.dockIntroSeen || typeof obj.dockIntroSeen !== "object") obj.dockIntroSeen = {};
    if (!obj.missionBeforeSeen || typeof obj.missionBeforeSeen !== "object") obj.missionBeforeSeen = {};
    if (!obj.missionSuccessSeen || typeof obj.missionSuccessSeen !== "object") obj.missionSuccessSeen = {};

    return obj;
  } catch {
    return null;
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// ------------------------------------------------------------
// Core game helpers
// ------------------------------------------------------------
function totalMissionsCount() {
  return missionsIndex.docks.reduce((sum, d) => sum + d.missions.length, 0);
}

function completedCount() {
  return Object.keys(progress.completed).length;
}

function getCurrentDock() {
  return missionsIndex.docks[currentDockIdx];
}

function getCurrentMissionRef() {
  const dock = getCurrentDock();
  return dock.missions[currentMissionIdx];
}

function dockCompleted(dockIdx) {
  const dock = missionsIndex.docks[dockIdx];
  return dock.missions.every(m => !!progress.completed[m.id]);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

// ------------------------------------------------------------
// Left list rendering (your step-by-step behavior)
// ------------------------------------------------------------
function renderLeftList() {
  const total = totalMissionsCount();
  const done = completedCount();
  if (elProgressSummary) elProgressSummary.textContent = `${done}/${total} missions completed`;

  if (!elMissionList) return;

  let html = "";

  for (let d = 0; d < missionsIndex.docks.length; d++) {
    const dock = missionsIndex.docks[d];
    if (d > currentDockIdx) break;

    const dockDone = dock.missions.filter(m => !!progress.completed[m.id]).length;
    const dockTotal = dock.missions.length;

    if (d < currentDockIdx) {
      html += `
        <div class="dock-collapsed">
          <span>${escapeHtml(dock.dockTitle)}</span>
          <span>${dockDone}/${dockTotal}</span>
        </div>`;
      continue;
    }

    html += `<div class="dock-active">`;
    html += `<div class="dock-active-title">
              <span>${escapeHtml(dock.dockTitle)}</span>
              <span class="dock-count">${dockDone}/${dockTotal}</span>
            </div>`;

    html += `<ul class="missions-ul">`;

    for (let i = 0; i < dock.missions.length; i++) {
      if (i > currentMissionIdx) break;

      const m = dock.missions[i];
      const isDone = !!progress.completed[m.id];
      const isNext = (i === currentMissionIdx) && !isDone;

      const badge = isDone ? "✅" : isNext ? "▶" : "•";
      const cls = isDone ? "done" : isNext ? "next" : "";

      html += `
        <li class="mission-row ${cls}">
          <span class="mission-badge">${badge}</span>
          <span>${escapeHtml(m.title)}</span>
        </li>`;
    }

    html += `</ul></div>`;
  }

  elMissionList.innerHTML = html;
}

// ------------------------------------------------------------
// Story-flavor helpers (A)
// ------------------------------------------------------------
function showDockIntroIfNeeded(onDone) {
  const dock = getCurrentDock();
  const dockId = dock.dockId;

  // Optional: dock.dockStory.intro from missions.json
  const introText = dock.dockStory && dock.dockStory.intro ? String(dock.dockStory.intro) : null;

  if (!introText) {
    onDone && onDone();
    return;
  }

  if (progress.dockIntroSeen[dockId]) {
    onDone && onDone();
    return;
  }

  progress.dockIntroSeen[dockId] = true;
  saveProgress();

  disablePlay(true);
  showOverlay(
    dock.dockTitle,
    introText,
    "Continue",
    () => {
      hideOverlay();
      onDone && onDone();
    }
  );
}

function showMissionBeforeIfNeeded(onDone) {
  const ref = getCurrentMissionRef();
  const missionId = ref.id;

  const beforeText = currentMission && currentMission.story && currentMission.story.before
    ? String(currentMission.story.before)
    : null;

  if (!beforeText) {
    onDone && onDone();
    return;
  }

  if (progress.missionBeforeSeen[missionId]) {
    onDone && onDone();
    return;
  }

  progress.missionBeforeSeen[missionId] = true;
  saveProgress();

  disablePlay(true);
  showOverlay(
    `${getCurrentDock().dockTitle} — ${ref.title}`,
    beforeText,
    "Continue",
    () => {
      hideOverlay();
      onDone && onDone();
    }
  );
}

function showMissionSuccessIfPresent(onDone) {
  const ref = getCurrentMissionRef();
  const missionId = ref.id;

  const successText = currentMission && currentMission.story && currentMission.story.success
    ? String(currentMission.story.success)
    : null;

  if (!successText) {
    onDone && onDone();
    return;
  }

  // show it once (optional safety)
  if (progress.missionSuccessSeen[missionId]) {
    onDone && onDone();
    return;
  }

  progress.missionSuccessSeen[missionId] = true;
  saveProgress();

  disablePlay(true);
  showOverlay(
    "Approved ✅",
    successText,
    "Continue",
    () => {
      hideOverlay();
      onDone && onDone();
    }
  );
}

// ------------------------------------------------------------
// Mission loading
// ------------------------------------------------------------
async function loadMissionCurrent() {
  const dock = getCurrentDock();
  const ref = getCurrentMissionRef();

  elMissionTitle.textContent = `${dock.dockTitle} — ${ref.title}`;

  const res = await fetch(ref.file, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load mission file (${res.status}): ${ref.file}`);

  const mission = await res.json();
  currentMission = mission;

  elEditor.value = String(mission.input);
  setFeedback("neutral", "Fix the JSON and press Validate.");

  // Show mission intro (optional), then enable play
  showMissionBeforeIfNeeded(() => {
    disablePlay(false);
  });
}

// ------------------------------------------------------------
// Progress advancement
// ------------------------------------------------------------
function advanceAfterMissionSuccess() {
  const dock = getCurrentDock();
  const ref = getCurrentMissionRef();

  progress.completed[ref.id] = true;

  const isLastInDock = (currentMissionIdx === dock.missions.length - 1);
  if (isLastInDock) {
    saveProgress();
    renderLeftList();
    showDockCompleteOverlay();
    return;
  }

  currentMissionIdx += 1;
  progress.dockIdx = currentDockIdx;
  progress.missionIdx = currentMissionIdx;
  saveProgress();

  renderLeftList();
  loadMissionCurrent().catch(err => {
    setFeedback("error", `Load error:\n${err.message}`);
    disablePlay(true);
  });
}

function showDockCompleteOverlay() {
  disablePlay(true);

  const dock = getCurrentDock();
  const dockTotal = dock.missions.length;

  const custom = dock.dockStory && dock.dockStory.complete ? String(dock.dockStory.complete) : null;

  const text = custom
    ? custom
    : `You cleared <b>${escapeHtml(dock.dockTitle)}</b>.<br>
       All manifests in this dock are approved (${dockTotal}/${dockTotal}).<br><br>
       The harbor opens the next gate...`;

  showOverlay(
    "Dock cleared",
    text,
    "Continue",
    () => {
      hideOverlay();
      onDockCompleteContinue();
    }
  );
}

function onDockCompleteContinue() {
  if (!dockCompleted(currentDockIdx)) {
    disablePlay(false);
    return;
  }

if (currentDockIdx >= missionsIndex.docks.length - 1) {
  disablePlay(true);

  showOverlay(
    "Harbor fully cleared 🎉",
    `All docks are cleared.<br>
     JSON Harbor is safe again.<br><br>
     Your shift ends — progress will reset so you can replay from Dock 1.`,
    "Restart",
    () => {
      // wipe progress and restart
      localStorage.removeItem(STORAGE_KEY);
      hideOverlay();
      location.reload();
    },
    "Close",
    () => {
      // still reset, but don't force reload immediately
      localStorage.removeItem(STORAGE_KEY);
      hideOverlay();
      setFeedback("neutral", "Progress reset. Reload to start again from Dock 1.");
    }
  );
  return;
}

  currentDockIdx += 1;
  currentMissionIdx = 0;

  progress.dockIdx = currentDockIdx;
  progress.missionIdx = currentMissionIdx;
  saveProgress();
updateDockHelpLink();
  renderLeftList();

  // Dock intro first, then load mission
  showDockIntroIfNeeded(() => {
    loadMissionCurrent().then(() => {
      // loadMissionCurrent will enable play after mission-before story
    }).catch(err => {
      setFeedback("error", `Load error:\n${err.message}`);
      disablePlay(true);
    });
  });
}

// ------------------------------------------------------------
// Validate click
// ------------------------------------------------------------
function onReset() {
  if (!currentMission) return;
  elEditor.value = String(currentMission.input);
  setFeedback("neutral", "Reset done.");
}

function onValidate() {
  if (!currentMission) return;

  const text = elEditor.value;

  // Parse
  const parsed = JsonValidator.parse(text);
  if (!parsed.valid) {
    setFeedback("error", `❌ JSON parse error:\n${parsed.error}`);
    return;
  }

  // Schema (subset)
  if (currentMission.schema) {
    const result = JsonValidator.validateAgainstSchema(parsed.data, currentMission.schema);
    if (!result.valid) {
      const formatted = result.errors
        .map(e => `• ${e.path} — ${e.message}`)
        .join("\n");
      setFeedback("error", `❌ Schema validation failed:\n${formatted}`);
      return;
    }
  }

  // Custom rules (Dock4+)
  if (currentMission.rules) {
    const rulesResult = JsonValidator.validateRules(parsed.data, currentMission.rules);
    if (!rulesResult.valid) {
      const formatted = rulesResult.errors
        .map(e => `• ${e.path} — ${e.message}`)
        .join("\n");
      setFeedback("error", `❌ Rule validation failed:\n${formatted}`);
      return;
    }
  }

  // Optional expected compare (Dock5)
  if (currentMission.expected !== undefined) {
    if (!JsonComparator.deepEqual(parsed.data, currentMission.expected)) {
      setFeedback("error", "❌ Output does not match expected result.");
      return;
    }
  }

  // SUCCESS: show mission success story if present, then advance
  setFeedback("success", "✅ Validation successful. Cargo approved.\nMission completed!");

  showMissionSuccessIfPresent(() => {
    advanceAfterMissionSuccess();
  });
}

// ------------------------------------------------------------
// Intro overlays
// ------------------------------------------------------------
function showIntroStory() {
  disablePlay(true);
  showOverlay(
    "Welcome to JSON Harbor",
    `Night shift. Fog. Radios crackle.<br>
     Incoming ships report <b>broken manifests</b>.<br><br>
     You are the Harbor Inspector. Fix the payloads and keep the port running.`,
    "Continue",
    () => {
      progress.introDone = true;
      saveProgress();
      showIntroHelp();
    }
  );
}

function showIntroHelp() {
  disablePlay(true);
  showOverlay(
    "How the game works",
    `• Each mission provides an invalid or inconsistent JSON payload.<br>
     • Your task: fix it until it passes validation.<br>
     • Missions unlock <b>step by step</b>.<br>
     • Clear all 5 missions to finish a dock and unlock the next one.<br><br>
     Tip: Press <b>Validate</b> to check your result.`,
    "Start",
    () => {
      progress.helpDone = true;
      saveProgress();
      hideOverlay();
      startGame();
    }
  );
}

// ------------------------------------------------------------
// Startup
// ------------------------------------------------------------
async function loadMissionsIndex() {
  const res = await fetch(MISSIONS_INDEX_PATH, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load missions index (${res.status})`);

  const idx = await res.json();
  if (!idx || !Array.isArray(idx.docks) || idx.docks.length === 0) {
    throw new Error("missions.json invalid: missing docks[]");
  }
  missionsIndex = idx;
}

function syncStateFromProgress() {
  currentDockIdx = clampInt(progress.dockIdx, 0, missionsIndex.docks.length - 1);
  const dock = missionsIndex.docks[currentDockIdx];
  currentMissionIdx = clampInt(progress.missionIdx, 0, dock.missions.length - 1);

  // Find first incomplete, moving dock forward if needed
  while (currentDockIdx < missionsIndex.docks.length) {
    const d = missionsIndex.docks[currentDockIdx];

    let firstIncomplete = -1;
    for (let i = 0; i < d.missions.length; i++) {
      if (!progress.completed[d.missions[i].id]) {
        firstIncomplete = i;
        break;
      }
    }

    if (firstIncomplete !== -1) {
      currentMissionIdx = firstIncomplete;
      break;
    }

    if (currentDockIdx === missionsIndex.docks.length - 1) break;
    currentDockIdx++;
    currentMissionIdx = 0;
  }

  progress.dockIdx = currentDockIdx;
  progress.missionIdx = currentMissionIdx;
  saveProgress();
}

function clampInt(v, min, max) {
  const n = Number.isFinite(v) ? v : parseInt(v, 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function startGame() {
  syncStateFromProgress();
  renderLeftList();
  updateDockHelpLink();

  // Dock intro first (optional), then mission load (which may show mission story)
  showDockIntroIfNeeded(() => {
    loadMissionCurrent().catch(err => {
      setFeedback("error", `Load error:\n${err.message}`);
      disablePlay(true);
    });
  });
}

function wireEvents() {
  btnReset.addEventListener("click", onReset);
  btnValidate.addEventListener("click", onValidate);

  elEditor.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onValidate();
    }
  });
}

(async function init() {
  wireEvents();
  disablePlay(true);
  setFeedback("neutral", "Loading...");

  try {
    await loadMissionsIndex();
  } catch (err) {
    setFeedback("error", `Startup error:\n${err.message}`);
    return;
  }

  const stored = loadProgress();
  if (stored) progress = stored;

  // Ensure new objects exist even if old storage was loaded (defensive)
  if (!progress.dockIntroSeen || typeof progress.dockIntroSeen !== "object") progress.dockIntroSeen = {};
  if (!progress.missionBeforeSeen || typeof progress.missionBeforeSeen !== "object") progress.missionBeforeSeen = {};
  if (!progress.missionSuccessSeen || typeof progress.missionSuccessSeen !== "object") progress.missionSuccessSeen = {};
  saveProgress();

  if (!progress.introDone) {
    showIntroStory();
    return;
  }
  if (!progress.helpDone) {
    showIntroHelp();
    return;
  }

  hideOverlay();
  startGame();
})();

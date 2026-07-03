"use strict";

window.JsonHarbor = window.JsonHarbor || {};

(function () {
  const CONFIG = window.JsonHarbor.CONFIG;
  const Utils = window.JsonHarbor.Utils;
  const Store = window.JsonHarbor.ProgressStore;
  const Validator = window.JsonHarbor.Validator;
  const Comparator = window.JsonHarbor.Comparator;

  const dom = {};

  const state = {
    missionsIndex: null,
    currentMission: null,
    dockIdx: 0,
    missionIdx: 0,
    progress: Store.load()
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    collectDom();
    wireEvents();
    setPlayDisabled(true);
    setFeedback("neutral", "Loading harbor data...");

    try {
      state.missionsIndex = await Utils.fetchJson(CONFIG.missionsIndexPath);
      validateMissionsIndex(state.missionsIndex);
      state.progress = Store.normalize(state.progress);
      Store.save(state.progress);
    } catch (error) {
      setFeedback("error", `Startup error:\n${error.message}`);
      return;
    }

    if (!state.progress.introDone) {
      showIntroStory();
      return;
    }

    if (!state.progress.helpDone) {
      showIntroHelp();
      return;
    }

    hideOverlay();
    startGame();
  }

  function collectDom() {
    dom.missionTitle = Utils.$("#mission-title");
    dom.editor = Utils.$("#json-editor");
    dom.feedback = Utils.$("#feedback");
    dom.resetButton = Utils.$("#reset-btn");
    dom.validateButton = Utils.$("#validate-btn");
    dom.dockHelpLink = Utils.$("#dock-help-link");
    dom.missionList = Utils.$("#mission-list");
    dom.progressSummary = Utils.$("#progress-summary");
    dom.overlay = Utils.$("#overlay");
    dom.overlayTitle = Utils.$("#overlay-title");
    dom.overlayText = Utils.$("#overlay-text");
    dom.overlayPrimary = Utils.$("#overlay-primary");
    dom.overlaySecondary = Utils.$("#overlay-secondary");
    dom.missionDescription = document.querySelector("#mission-description");
    dom.currentDockLabel = document.querySelector("#current-dock-label");
    dom.currentMissionLabel = document.querySelector("#current-mission-label");
  }

  function wireEvents() {
    dom.resetButton.addEventListener("click", resetMissionInput);
    dom.validateButton.addEventListener("click", validateMissionInput);

    dom.editor.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        validateMissionInput();
      }
    });
  }

  function validateMissionsIndex(index) {
    if (!index || !Array.isArray(index.docks) || index.docks.length === 0) {
      throw new Error("missions.json invalid: missing docks[].");
    }

    const seenMissionIds = new Set();
    for (const dock of index.docks) {
      if (!dock.dockId || !dock.dockTitle) throw new Error("missions.json invalid: dockId/dockTitle missing.");
      if (!Array.isArray(dock.missions) || dock.missions.length === 0) {
        throw new Error(`missions.json invalid: ${dock.dockId} has no missions.`);
      }
      for (const mission of dock.missions) {
        if (!mission.id || !mission.title || !mission.file) {
          throw new Error(`missions.json invalid: mission entry in ${dock.dockId} is incomplete.`);
        }
        if (seenMissionIds.has(mission.id)) throw new Error(`Duplicate mission id: ${mission.id}`);
        seenMissionIds.add(mission.id);
      }
    }
  }

  function startGame() {
    syncStateFromProgress();
    renderMissionList();
    updateDockHelpLink();
    showDockIntroIfNeeded(loadCurrentMission);
  }

  function syncStateFromProgress() {
    const docks = state.missionsIndex.docks;
    state.dockIdx = Utils.clampInt(state.progress.dockIdx, 0, docks.length - 1);
    state.missionIdx = Utils.clampInt(state.progress.missionIdx, 0, docks[state.dockIdx].missions.length - 1);

    while (state.dockIdx < docks.length) {
      const dock = docks[state.dockIdx];
      const firstIncomplete = dock.missions.findIndex((mission) => !state.progress.completed[mission.id]);

      if (firstIncomplete !== -1) {
        state.missionIdx = firstIncomplete;
        break;
      }

      if (state.dockIdx === docks.length - 1) break;
      state.dockIdx += 1;
      state.missionIdx = 0;
    }

    persistCursor();
  }

  async function loadCurrentMission() {
    const dock = getCurrentDock();
    const missionRef = getCurrentMissionRef();

    setPlayDisabled(true);
    updateDockHelpLink();
    updateMissionHeader(dock, missionRef);

    try {
      const mission = await Utils.fetchJson(missionRef.file);
      validateMissionFile(mission, missionRef);
      state.currentMission = mission;
      dom.editor.value = String(mission.input ?? "");
      setFeedback("neutral", "Fix the JSON and press Validate. Shortcut: Ctrl + Enter.");
      showMissionBeforeIfNeeded(() => setPlayDisabled(false));
    } catch (error) {
      setFeedback("error", `Mission load error:\n${error.message}`);
      setPlayDisabled(true);
    }
  }

  function validateMissionFile(mission, missionRef) {
    if (!mission || typeof mission !== "object") throw new Error(`${missionRef.file} is not an object.`);
    if (mission.id && mission.id !== missionRef.id) {
      throw new Error(`${missionRef.file} id mismatch: expected ${missionRef.id}, got ${mission.id}.`);
    }
    if (typeof mission.input !== "string") throw new Error(`${missionRef.file} must contain string property input.`);
  }

  function updateMissionHeader(dock, missionRef) {
    const title = `${dock.dockTitle} — ${missionRef.title}`;
    dom.missionTitle.textContent = title;

    if (dom.missionDescription) {
      dom.missionDescription.textContent = state.currentMission?.description || "Repair the manifest until validation passes.";
    }
    if (dom.currentDockLabel) dom.currentDockLabel.textContent = dock.dockTitle;
    if (dom.currentMissionLabel) dom.currentMissionLabel.textContent = missionRef.title;
  }

  function getCurrentDock() {
    return state.missionsIndex.docks[state.dockIdx];
  }

  function getCurrentMissionRef() {
    return getCurrentDock().missions[state.missionIdx];
  }

  function totalMissionsCount() {
    return state.missionsIndex.docks.reduce((sum, dock) => sum + dock.missions.length, 0);
  }

  function completedCount() {
    return Object.keys(state.progress.completed).length;
  }

  function isDockCompleted(dockIdx) {
    const dock = state.missionsIndex.docks[dockIdx];
    return dock.missions.every((mission) => state.progress.completed[mission.id]);
  }

  function renderMissionList() {
    const total = totalMissionsCount();
    const done = completedCount();
    dom.progressSummary.textContent = `${done}/${total} missions completed`;
    dom.progressSummary.setAttribute("aria-label", `${done} of ${total} missions completed`);

    const fragment = document.createDocumentFragment();

    for (let dockIndex = 0; dockIndex < state.missionsIndex.docks.length; dockIndex += 1) {
      if (dockIndex > state.dockIdx) break;

      const dock = state.missionsIndex.docks[dockIndex];
      const completedInDock = dock.missions.filter((mission) => state.progress.completed[mission.id]).length;
      const totalInDock = dock.missions.length;

      if (dockIndex < state.dockIdx) {
        fragment.appendChild(createDockSummary(dock.dockTitle, completedInDock, totalInDock));
      } else {
        fragment.appendChild(createActiveDock(dock, completedInDock, totalInDock));
      }
    }

    dom.missionList.replaceChildren(fragment);
  }

  function createDockSummary(title, done, total) {
    const wrapper = document.createElement("div");
    wrapper.className = "dock-collapsed";
    wrapper.innerHTML = `<span>${Utils.escapeHtml(title)}</span><span>${done}/${total}</span>`;
    return wrapper;
  }

  function createActiveDock(dock, done, total) {
    const wrapper = document.createElement("div");
    wrapper.className = "dock-active";

    const header = document.createElement("div");
    header.className = "dock-active-title";
    header.innerHTML = `<span>${Utils.escapeHtml(dock.dockTitle)}</span><span class="dock-count">${done}/${total}</span>`;
    wrapper.appendChild(header);

    const list = document.createElement("ul");
    list.className = "missions-ul";

    for (let missionIndex = 0; missionIndex < dock.missions.length; missionIndex += 1) {
      if (missionIndex > state.missionIdx) break;

      const mission = dock.missions[missionIndex];
      const isDone = !!state.progress.completed[mission.id];
      const isNext = missionIndex === state.missionIdx && !isDone;

      const item = document.createElement("li");
      item.className = `mission-row ${isDone ? "done" : ""} ${isNext ? "next" : ""}`.trim();
      item.innerHTML = `
        <span class="mission-badge" aria-hidden="true">${isDone ? "✅" : isNext ? "▶" : "•"}</span>
        <span>${Utils.escapeHtml(mission.title)}</span>
      `;
      list.appendChild(item);
    }

    wrapper.appendChild(list);
    return wrapper;
  }

  function updateDockHelpLink() {
    const dock = getCurrentDock();
    dom.dockHelpLink.href = `index.html#${encodeURIComponent(dock.dockId)}-guide`;
  }

  function setFeedback(type, message) {
    dom.feedback.classList.remove("neutral", "success", "error");
    dom.feedback.classList.add(type);
    dom.feedback.textContent = message;
  }

  function setPlayDisabled(disabled) {
    dom.validateButton.disabled = disabled;
    dom.resetButton.disabled = disabled;
    dom.editor.disabled = disabled;
  }

  function showOverlay(title, text, primaryLabel, onPrimary, secondaryLabel = null, onSecondary = null) {
    dom.overlayTitle.textContent = title;
    Utils.setTextWithBreaks(dom.overlayText, text);
    dom.overlayPrimary.textContent = primaryLabel;
    dom.overlayPrimary.onclick = () => onPrimary && onPrimary();

    if (secondaryLabel) {
      dom.overlaySecondary.hidden = false;
      dom.overlaySecondary.textContent = secondaryLabel;
      dom.overlaySecondary.onclick = () => onSecondary && onSecondary();
    } else {
      dom.overlaySecondary.hidden = true;
      dom.overlaySecondary.onclick = null;
    }

    dom.overlay.classList.add("overlay-show");
    dom.overlay.setAttribute("aria-hidden", "false");
    dom.overlayPrimary.focus();
  }

  function hideOverlay() {
    dom.overlay.classList.remove("overlay-show");
    dom.overlay.setAttribute("aria-hidden", "true");
  }

  function showDockIntroIfNeeded(onDone) {
    const dock = getCurrentDock();
    const intro = dock.dockStory?.intro ? String(dock.dockStory.intro) : "";

    if (!intro || state.progress.dockIntroSeen[dock.dockId]) {
      onDone && onDone();
      return;
    }

    state.progress.dockIntroSeen[dock.dockId] = true;
    Store.save(state.progress);
    setPlayDisabled(true);

    showOverlay(dock.dockTitle, intro, "Continue", () => {
      hideOverlay();
      onDone && onDone();
    });
  }

  function showMissionBeforeIfNeeded(onDone) {
    const missionRef = getCurrentMissionRef();
    const before = state.currentMission?.story?.before ? String(state.currentMission.story.before) : "";

    if (!before || state.progress.missionBeforeSeen[missionRef.id]) {
      onDone && onDone();
      return;
    }

    state.progress.missionBeforeSeen[missionRef.id] = true;
    Store.save(state.progress);
    setPlayDisabled(true);

    showOverlay(`${getCurrentDock().dockTitle} — ${missionRef.title}`, before, "Continue", () => {
      hideOverlay();
      onDone && onDone();
    });
  }

  function showMissionSuccessIfPresent(onDone) {
    const missionRef = getCurrentMissionRef();
    const success = state.currentMission?.story?.success ? String(state.currentMission.story.success) : "";

    if (!success || state.progress.missionSuccessSeen[missionRef.id]) {
      onDone && onDone();
      return;
    }

    state.progress.missionSuccessSeen[missionRef.id] = true;
    Store.save(state.progress);
    setPlayDisabled(true);

    showOverlay("Approved", success, "Continue", () => {
      hideOverlay();
      onDone && onDone();
    });
  }

  function resetMissionInput() {
    if (!state.currentMission) return;
    dom.editor.value = String(state.currentMission.input ?? "");
    setFeedback("neutral", "Mission input restored.");
    dom.editor.focus();
  }

  function validateMissionInput() {
    if (!state.currentMission) return;

    const parsed = Validator.parse(dom.editor.value);
    if (!parsed.valid) {
      setFeedback("error", `❌ JSON parse error:\n${parsed.error}`);
      return;
    }

    if (state.currentMission.schema) {
      const schemaResult = Validator.validateAgainstSchema(parsed.data, state.currentMission.schema);
      if (!schemaResult.valid) {
        setFeedback("error", `❌ Schema validation failed:\n${Utils.formatErrors(schemaResult.errors)}`);
        return;
      }
    }

    if (state.currentMission.rules) {
      const rulesResult = Validator.validateRules(parsed.data, state.currentMission.rules);
      if (!rulesResult.valid) {
        setFeedback("error", `❌ Rule validation failed:\n${Utils.formatErrors(rulesResult.errors)}`);
        return;
      }
    }

    if (state.currentMission.expected !== undefined) {
      const result = Comparator.diff(parsed.data, state.currentMission.expected);
      if (result) {
        setFeedback("error", `❌ Output does not match expected result.\n• ${result.path} — ${result.message}`);
        return;
      }
    }

    setFeedback("success", "✅ Validation successful. Cargo approved.\nMission completed!");
    setPlayDisabled(true);
    showMissionSuccessIfPresent(advanceAfterMissionSuccess);
  }

  function advanceAfterMissionSuccess() {
    const dock = getCurrentDock();
    const missionRef = getCurrentMissionRef();

    state.progress.completed[missionRef.id] = true;

    const isLastMissionInDock = state.missionIdx === dock.missions.length - 1;
    if (isLastMissionInDock) {
      Store.save(state.progress);
      renderMissionList();
      showDockCompleteOverlay();
      return;
    }

    state.missionIdx += 1;
    persistCursor();
    renderMissionList();
    loadCurrentMission();
  }

  function showDockCompleteOverlay() {
    const dock = getCurrentDock();
    const defaultText = `You cleared ${dock.dockTitle}.\nAll manifests in this dock are approved.\nThe harbor opens the next gate.`;
    const text = dock.dockStory?.complete ? String(dock.dockStory.complete) : defaultText;

    showOverlay("Dock cleared", text, "Continue", () => {
      hideOverlay();
      continueAfterDockComplete();
    });
  }

  function continueAfterDockComplete() {
    if (!isDockCompleted(state.dockIdx)) {
      setPlayDisabled(false);
      return;
    }

    if (state.dockIdx >= state.missionsIndex.docks.length - 1) {
      setPlayDisabled(true);
      showOverlay(
        "Harbor fully cleared",
        "All docks are cleared. JSON Harbor is safe again.\n\nYour shift ends — progress can now be reset for a replay.",
        "Restart",
        () => {
          Store.clear();
          location.reload();
        },
        "Close",
        () => {
          Store.clear();
          hideOverlay();
          setFeedback("neutral", "Progress reset. Reload to start again from Dock 1.");
        }
      );
      return;
    }

    state.dockIdx += 1;
    state.missionIdx = 0;
    persistCursor();
    updateDockHelpLink();
    renderMissionList();
    showDockIntroIfNeeded(loadCurrentMission);
  }

  function persistCursor() {
    state.progress.dockIdx = state.dockIdx;
    state.progress.missionIdx = state.missionIdx;
    Store.save(state.progress);
  }

  function showIntroStory() {
    setPlayDisabled(true);
    showOverlay(
      "Welcome to JSON Harbor",
      "Night shift. Fog. Radios crackle.\nIncoming ships report broken manifests.\n\nYou are the Harbor Inspector. Fix the payloads and keep the port running.",
      "Continue",
      () => {
        state.progress.introDone = true;
        Store.save(state.progress);
        showIntroHelp();
      }
    );
  }

  function showIntroHelp() {
    setPlayDisabled(true);
    showOverlay(
      "How the game works",
      "Each mission provides an invalid or inconsistent JSON payload.\nYour task: fix it until it passes validation.\nMissions unlock step by step.\nClear all 5 missions to finish a dock and unlock the next one.\n\nTip: Press Validate or Ctrl + Enter to check your result.",
      "Start",
      () => {
        state.progress.helpDone = true;
        Store.save(state.progress);
        hideOverlay();
        startGame();
      }
    );
  }
})();

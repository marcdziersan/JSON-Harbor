"use strict";

window.JsonHarbor = window.JsonHarbor || {};

window.JsonHarbor.ProgressStore = (function () {
  const CONFIG = window.JsonHarbor.CONFIG;

  function createDefault() {
    return {
      version: CONFIG.version,
      introDone: false,
      helpDone: false,
      dockIdx: 0,
      missionIdx: 0,
      completed: {},
      dockIntroSeen: {},
      missionBeforeSeen: {},
      missionSuccessSeen: {}
    };
  }

  function normalize(progress) {
    const base = createDefault();
    if (!progress || typeof progress !== "object") return base;

    return {
      ...base,
      ...progress,
      completed: isRecord(progress.completed) ? progress.completed : {},
      dockIntroSeen: isRecord(progress.dockIntroSeen) ? progress.dockIntroSeen : {},
      missionBeforeSeen: isRecord(progress.missionBeforeSeen) ? progress.missionBeforeSeen : {},
      missionSuccessSeen: isRecord(progress.missionSuccessSeen) ? progress.missionSuccessSeen : {}
    };
  }

  function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function load() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      return raw ? normalize(JSON.parse(raw)) : createDefault();
    } catch {
      return createDefault();
    }
  }

  function save(progress) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(normalize(progress)));
  }

  function clear() {
    localStorage.removeItem(CONFIG.storageKey);
  }

  return { createDefault, normalize, load, save, clear };
})();

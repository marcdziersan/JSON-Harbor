"use strict";

window.JsonHarbor = window.JsonHarbor || {};

window.JsonHarbor.Comparator = (function () {
  function deepEqual(actual, expected) {
    return diff(actual, expected) === null;
  }

  function diff(actual, expected, path = "/") {
    if (actual === expected) return null;

    if (typeof actual !== typeof expected) {
      return { path, message: `Expected ${describe(expected)}, got ${describe(actual)}.` };
    }

    if (actual === null || expected === null) {
      return { path, message: `Expected ${describe(expected)}, got ${describe(actual)}.` };
    }

    if (typeof actual !== "object") {
      return { path, message: `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.` };
    }

    if (Array.isArray(actual) !== Array.isArray(expected)) {
      return { path, message: `Expected ${Array.isArray(expected) ? "array" : "object"}, got ${Array.isArray(actual) ? "array" : "object"}.` };
    }

    if (Array.isArray(actual)) {
      if (actual.length !== expected.length) {
        return { path, message: `Expected array length ${expected.length}, got ${actual.length}.` };
      }
      for (let index = 0; index < expected.length; index += 1) {
        const childDiff = diff(actual[index], expected[index], joinPath(path, String(index)));
        if (childDiff) return childDiff;
      }
      return null;
    }

    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();

    if (actualKeys.length !== expectedKeys.length) {
      return { path, message: `Expected keys [${expectedKeys.join(", ")}], got [${actualKeys.join(", ")}].` };
    }

    for (const key of expectedKeys) {
      if (!Object.prototype.hasOwnProperty.call(actual, key)) {
        return { path: joinPath(path, key), message: "Missing expected property." };
      }
      const childDiff = diff(actual[key], expected[key], joinPath(path, key));
      if (childDiff) return childDiff;
    }

    for (const key of actualKeys) {
      if (!Object.prototype.hasOwnProperty.call(expected, key)) {
        return { path: joinPath(path, key), message: "Unexpected additional property." };
      }
    }

    return null;
  }

  function describe(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  function joinPath(base, segment) {
    const cleanBase = base === "/" ? "" : base;
    return `${cleanBase}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
  }

  return { deepEqual, diff };
})();

// Backwards-compatible global alias for older snippets/tests.
window.JsonComparator = window.JsonHarbor.Comparator;

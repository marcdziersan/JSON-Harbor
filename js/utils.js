"use strict";

window.JsonHarbor = window.JsonHarbor || {};

window.JsonHarbor.Utils = (function () {
  const ALLOWED_TAGS = new Set(["B", "BR", "CODE", "EM", "I", "LI", "OL", "P", "PRE", "STRONG", "UL"]);

  function $(selector, root = document) {
    const el = root.querySelector(selector);
    if (!el) throw new Error(`Missing required element: ${selector}`);
    return el;
  }

  function all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function slugify(value) {
    return String(value ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "section";
  }

  async function fetchJson(path, options = {}) {
    const response = await fetch(path, { cache: "no-store", ...options });
    if (!response.ok) {
      throw new Error(`Could not load ${path} (${response.status} ${response.statusText})`);
    }
    try {
      return await response.json();
    } catch (error) {
      throw new Error(`Invalid JSON in ${path}: ${error.message}`);
    }
  }

  function clampInt(value, min, max) {
    const parsed = Number.isFinite(value) ? value : Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, parsed));
  }

  function formatErrors(errors) {
    if (!Array.isArray(errors) || errors.length === 0) return "No details available.";
    return errors.map((error) => `• ${error.path || "/"} — ${error.message || "Unknown error"}`).join("\n");
  }

  function htmlToPlainText(value) {
    return String(value ?? "")
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function setTextWithBreaks(element, value) {
    element.textContent = htmlToPlainText(value);
  }

  function sanitizeLimitedHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = String(html ?? "");

    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT);
    const toReplace = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!ALLOWED_TAGS.has(node.tagName)) {
        toReplace.push(node);
        continue;
      }

      for (const attribute of Array.from(node.attributes)) {
        node.removeAttribute(attribute.name);
      }
    }

    for (const node of toReplace) {
      node.replaceWith(document.createTextNode(node.textContent || ""));
    }

    return template.innerHTML;
  }

  function safeJsonStringify(value) {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return {
    $,
    all,
    escapeHtml,
    slugify,
    fetchJson,
    clampInt,
    formatErrors,
    htmlToPlainText,
    setTextWithBreaks,
    sanitizeLimitedHtml,
    safeJsonStringify
  };
})();

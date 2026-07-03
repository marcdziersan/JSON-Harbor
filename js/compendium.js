"use strict";

window.JsonHarbor = window.JsonHarbor || {};

(function () {
  const CONFIG = window.JsonHarbor.CONFIG;
  const Utils = window.JsonHarbor.Utils;
  const dom = {};
  let model = null;
  let sections = [];

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    collectDom();

    try {
      model = await Utils.fetchJson(CONFIG.compendiumPath);
    } catch (error) {
      dom.intro.textContent = `Failed to load compendium: ${error.message}`;
      return;
    }

    renderModel(model);
    wireEvents();
    scrollToInitialHash();
  }

  function collectDom() {
    dom.title = Utils.$("#doc-title");
    dom.intro = Utils.$("#doc-intro");
    dom.tags = Utils.$("#doc-tags");
    dom.nav = Utils.$("#nav");
    dom.cards = Utils.$("#cards");
    dom.search = Utils.$("#search");
    dom.resultCount = document.querySelector("#result-count");
  }

  function wireEvents() {
    dom.search.addEventListener("input", () => applySearch(dom.search.value));
  }

  function renderModel(data) {
    dom.title.textContent = data.title || "Compendium";
    dom.intro.textContent = data.intro || "";
    renderTags(data.tags || []);

    sections = enrichSections(Array.isArray(data.sections) ? data.sections : []);
    renderNavigation(sections);
    renderCards(sections);
    updateResultCount(sections.length, sections.length);
  }

  function enrichSections(rawSections) {
    return rawSections.map((section) => {
      const id = section.id ? String(section.id) : Utils.slugify(section.title || "section");
      const searchParts = [section.title, section.subtitle, section.lead, ...(section.badges || [])];

      for (const item of section.items || []) {
        searchParts.push(item.title, item.question, stripHtml(item.answer), item.tip, item.meta);
        for (const pitfall of item.pitfalls || []) searchParts.push(pitfall);
      }

      return { ...section, _id: id, _search: searchParts.filter(Boolean).join(" • ").toLowerCase() };
    });
  }

  function renderTags(tags) {
    dom.tags.replaceChildren(...tags.map((tag) => {
      const span = document.createElement("span");
      span.className = "chip";
      span.textContent = tag;
      return span;
    }));
  }

  function renderNavigation(items) {
    const general = items.filter((item) => !item.dock);
    const docks = items.filter((item) => item.dock);
    const fragment = document.createDocumentFragment();

    appendNavGroup(fragment, "Core Concepts", general);
    appendNavGroup(fragment, "Dock Guides", docks);

    dom.nav.replaceChildren(fragment);
  }

  function appendNavGroup(fragment, label, items) {
    if (!items.length) return;

    const group = document.createElement("div");
    group.className = "nav-group";

    const title = document.createElement("div");
    title.className = "nav-group-title";
    title.textContent = label;
    group.appendChild(title);

    for (const item of items) {
      const link = document.createElement("a");
      link.className = "nav-link";
      link.href = `#${item._id}`;
      link.textContent = item.title || item._id;
      group.appendChild(link);
    }

    fragment.appendChild(group);
  }

  function renderCards(items) {
    const fragment = document.createDocumentFragment();
    for (const section of items) fragment.appendChild(createCard(section));
    dom.cards.replaceChildren(fragment);
  }

  function createCard(section) {
    const article = document.createElement("article");
    article.className = "card";
    article.id = section._id;
    article.dataset.search = section._search;

    const head = document.createElement("div");
    head.className = "card-head";

    const titleWrap = document.createElement("div");
    titleWrap.className = "card-title";

    const title = document.createElement("h2");
    title.textContent = section.title || "Untitled section";
    titleWrap.appendChild(title);

    if (section.subtitle) {
      const subtitle = document.createElement("div");
      subtitle.className = "subtitle";
      subtitle.textContent = section.subtitle;
      titleWrap.appendChild(subtitle);
    }

    head.appendChild(titleWrap);

    if (Array.isArray(section.badges) && section.badges.length) {
      const badges = document.createElement("div");
      badges.className = "badges";
      for (const badge of section.badges) {
        const span = document.createElement("span");
        span.className = "badge";
        span.textContent = badge;
        badges.appendChild(span);
      }
      head.appendChild(badges);
    }

    const body = document.createElement("div");
    body.className = "card-body";

    if (section.lead) {
      const lead = document.createElement("p");
      lead.className = "card-lead";
      lead.textContent = section.lead;
      body.appendChild(lead);
    }

    for (const [index, item] of (section.items || []).entries()) {
      body.appendChild(createAccordion(item, index));
    }

    article.append(head, body);
    return article;
  }

  function createAccordion(item, index) {
    const details = document.createElement("details");
    details.className = "accordion";
    if (index === 0) details.open = true;

    const summary = document.createElement("summary");

    const title = document.createElement("span");
    title.className = "acc-title";
    title.textContent = item.title || `Item ${index + 1}`;

    const meta = document.createElement("span");
    meta.className = "acc-meta";
    meta.textContent = item.meta || "";

    summary.append(title, meta);

    const body = document.createElement("div");
    body.className = "acc-body";

    if (item.question) appendTextDiv(body, "qa-q", item.question);
    if (item.answer) appendHtmlDiv(body, "qa-a", item.answer);
    if (item.tip) appendTextDiv(body, "tip", `Hint: ${item.tip}`);

    if (Array.isArray(item.pitfalls) && item.pitfalls.length) {
      const list = document.createElement("ul");
      list.className = "pitfalls";
      for (const pitfall of item.pitfalls) {
        const li = document.createElement("li");
        li.textContent = pitfall;
        list.appendChild(li);
      }
      body.appendChild(list);
    }

    if (item.example) {
      const example = document.createElement("div");
      example.className = "example";
      const label = document.createElement("div");
      label.className = "example-label";
      label.textContent = "Example";
      const pre = document.createElement("pre");
      pre.className = "code notranslate";
      pre.setAttribute("translate", "no");
      pre.textContent = item.example;
      example.append(label, pre);
      body.appendChild(example);
    }

    details.append(summary, body);
    return details;
  }

  function appendTextDiv(parent, className, value) {
    const div = document.createElement("div");
    div.className = className;
    div.textContent = value;
    parent.appendChild(div);
  }

  function appendHtmlDiv(parent, className, value) {
    const div = document.createElement("div");
    div.className = className;
    div.innerHTML = Utils.sanitizeLimitedHtml(value);
    parent.appendChild(div);
  }

  function applySearch(rawQuery) {
    const query = String(rawQuery || "").trim().toLowerCase();
    const cards = Utils.all(".card", dom.cards);
    let visible = 0;

    for (const card of cards) {
      const matches = !query || (card.dataset.search || "").includes(query);
      card.classList.toggle("hidden", !matches);
      if (matches) visible += 1;
    }

    updateResultCount(visible, cards.length);
  }

  function updateResultCount(visible, total) {
    if (!dom.resultCount) return;
    dom.resultCount.textContent = `${visible}/${total} sections`;
  }

  function scrollToInitialHash() {
    if (!location.hash) return;
    const id = decodeURIComponent(location.hash.slice(1));
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function stripHtml(value) {
    return String(value || "").replace(/<[^>]+>/g, " ");
  }
})();

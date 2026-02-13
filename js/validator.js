"use strict";
const JsonValidator = (function () {

  function parse(text) {
    try {
      return { valid: true, data: JSON.parse(text) };
    } catch (err) {
      return { valid: false, error: err && err.message ? err.message : "Invalid JSON." };
    }
  }

  function validateAgainstSchema(data, schema) {
    const errors = [];
    validateNode(data, schema, "", errors);
    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  function validateRules(data, rules) {
    const errors = [];
    if (!Array.isArray(rules)) return { valid: true };

    for (const rule of rules) {
      if (!rule || typeof rule !== "object") continue;

      switch (rule.type) {
        case "enum":
          ruleEnum(data, rule, errors);
          break;

        case "minItems":
          ruleMinItems(data, rule, errors);
          break;

        case "maxItems":
          ruleMaxItems(data, rule, errors);
          break;

        case "unique":
          ruleUnique(data, rule, errors);
          break;

        case "stringLength":
          ruleStringLength(data, rule, errors);
          break;

        default:
          // unknown rule type -> ignore (forward compatible)
          break;
      }
    }

    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  }

  function validateNode(value, schema, path, errors) {
    if (!schema || typeof schema !== "object") return;

    if (schema.type) {
      if (!typeMatches(value, schema.type)) {
        errors.push({ path: path || "/", message: `Expected type ${schema.type}` });
      }
    }

    if (schema.type === "object" && isPlainObject(value)) {

      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!Object.prototype.hasOwnProperty.call(value, key)) {
            errors.push({ path: (path || "") + "/" + key, message: "Missing required property" });
          }
        }
      }

      if (schema.properties && typeof schema.properties === "object") {
        for (const key of Object.keys(schema.properties)) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            validateNode(value[key], schema.properties[key], (path || "") + "/" + key, errors);
          }
        }
      }

      if (schema.additionalProperties === false && schema.properties && typeof schema.properties === "object") {
        const allowed = new Set(Object.keys(schema.properties));
        for (const key of Object.keys(value)) {
          if (!allowed.has(key)) {
            errors.push({ path: (path || "") + "/" + key, message: "Additional property not allowed" });
          }
        }
      }
    }

    if (schema.type === "array" && Array.isArray(value)) {
      if (schema.items) {
        for (let i = 0; i < value.length; i++) {
          validateNode(value[i], schema.items, (path || "") + "/" + i, errors);
        }
      }
    }
  }

  function typeMatches(value, expectedType) {
    switch (expectedType) {
      case "object": return isPlainObject(value);
      case "array": return Array.isArray(value);
      case "string": return typeof value === "string";
      case "integer": return typeof value === "number" && Number.isInteger(value);
      case "number": return typeof value === "number" && Number.isFinite(value);
      case "boolean": return typeof value === "boolean";
      case "null": return value === null;
      default: return false;
    }
  }

  function isPlainObject(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
  }

  function ruleEnum(root, rule, errors) {
    const node = getByPath(root, rule.path);
    if (node.missing) {
      errors.push({ path: rule.path || "/", message: rule.message || "Value is missing." });
      return;
    }

    const values = Array.isArray(rule.values) ? rule.values : [];
    if (!values.includes(node.value)) {
      errors.push({ path: rule.path || "/", message: rule.message || `Value must be one of: ${values.join(", ")}` });
    }
  }

  function ruleMinItems(root, rule, errors) {
    const node = getByPath(root, rule.path);
    if (node.missing || !Array.isArray(node.value)) {
      errors.push({ path: rule.path || "/", message: rule.message || "Expected an array for minItems." });
      return;
    }

    const min = Number(rule.value);
    if (Number.isFinite(min) && node.value.length < min) {
      errors.push({ path: rule.path || "/", message: rule.message || `Must contain at least ${min} items.` });
    }
  }

  function ruleMaxItems(root, rule, errors) {
    const node = getByPath(root, rule.path);
    if (node.missing || !Array.isArray(node.value)) {
      errors.push({ path: rule.path || "/", message: rule.message || "Expected an array for maxItems." });
      return;
    }

    const max = Number(rule.value);
    if (Number.isFinite(max) && node.value.length > max) {
      errors.push({ path: rule.path || "/", message: rule.message || `Must contain at most ${max} items.` });
    }
  }

  function ruleUnique(root, rule, errors) {
    const node = getByPath(root, rule.path);
    if (node.missing || !Array.isArray(node.value)) {
      errors.push({ path: rule.path || "/", message: rule.message || "Expected an array for unique rule." });
      return;
    }

    const key = String(rule.key || "");
    if (!key) {
      errors.push({ path: rule.path || "/", message: "Unique rule requires a 'key'." });
      return;
    }

    const seen = new Set();
    for (let i = 0; i < node.value.length; i++) {
      const item = node.value[i];
      if (!isPlainObject(item) || !Object.prototype.hasOwnProperty.call(item, key)) {
        errors.push({ path: `${rule.path}/${i}`, message: `Each item must be an object with property '${key}'.` });
        continue;
      }
      const val = item[key];
      const sig = typeof val + ":" + String(val);
      if (seen.has(sig)) {
        errors.push({ path: `${rule.path}/${i}/${key}`, message: rule.message || `Duplicate ${key} found.` });
      } else {
        seen.add(sig);
      }
    }
  }

  function ruleStringLength(root, rule, errors) {
    const min = Number.isFinite(Number(rule.min)) ? Number(rule.min) : null;
    const max = Number.isFinite(Number(rule.max)) ? Number(rule.max) : null;

    const matches = getByWildcardPath(root, rule.path);
    if (matches.length === 0) {
      errors.push({ path: rule.path || "/", message: rule.message || "Path not found for stringLength." });
      return;
    }

    for (const m of matches) {
      if (typeof m.value !== "string") {
        errors.push({ path: m.path, message: `Expected string for length check.` });
        continue;
      }
      if (min !== null && m.value.length < min) {
        errors.push({ path: m.path, message: rule.message || `String too short (min ${min}).` });
      }
      if (max !== null && m.value.length > max) {
        errors.push({ path: m.path, message: rule.message || `String too long (max ${max}).` });
      }
    }
  }

  function getByPath(root, path) {
    const segs = normalizePath(path);
    let cur = root;

    for (const seg of segs) {
      if (cur === null || cur === undefined) return { missing: true, value: undefined };
      if (Array.isArray(cur)) {
        const idx = parseInt(seg, 10);
        if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return { missing: true, value: undefined };
        cur = cur[idx];
      } else if (typeof cur === "object") {
        if (!Object.prototype.hasOwnProperty.call(cur, seg)) return { missing: true, value: undefined };
        cur = cur[seg];
      } else {
        return { missing: true, value: undefined };
      }
    }

    return { missing: false, value: cur };
  }

  function getByWildcardPath(root, path) {
    const segs = normalizePath(path);
    const out = [];
    walkWildcard(root, segs, 0, "", out);
    return out;
  }

  function walkWildcard(cur, segs, i, currentPath, out) {
    if (i >= segs.length) {
      out.push({ path: currentPath || "/", value: cur });
      return;
    }

    const seg = segs[i];

    if (seg === "*") {
      if (!Array.isArray(cur)) return;
      for (let idx = 0; idx < cur.length; idx++) {
        walkWildcard(cur[idx], segs, i + 1, (currentPath || "") + "/" + idx, out);
      }
      return;
    }

    if (Array.isArray(cur)) {
      const idx = parseInt(seg, 10);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) return;
      walkWildcard(cur[idx], segs, i + 1, (currentPath || "") + "/" + idx, out);
      return;
    }

    if (typeof cur === "object" && cur !== null) {
      if (!Object.prototype.hasOwnProperty.call(cur, seg)) return;
      walkWildcard(cur[seg], segs, i + 1, (currentPath || "") + "/" + seg, out);
    }
  }

  function normalizePath(path) {
    const p = String(path || "").trim();
    if (p === "" || p === "/") return [];
    return p.replace(/^\//, "").split("/").filter(Boolean);
  }

  return {
    parse,
    validateAgainstSchema,
    validateRules
  };

})();

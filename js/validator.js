"use strict";

window.JsonHarbor = window.JsonHarbor || {};

window.JsonHarbor.Validator = (function () {
  function parse(text) {
    try {
      return { valid: true, data: JSON.parse(text) };
    } catch (error) {
      return { valid: false, error: error && error.message ? error.message : "Invalid JSON." };
    }
  }

  function validateAgainstSchema(data, schema) {
    const errors = [];
    validateNode(data, schema, "", errors);
    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
  }

  function validateRules(data, rules) {
    const errors = [];
    if (!Array.isArray(rules)) return { valid: true, errors: [] };

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
          errors.push({ path: rule.path || "/", message: `Unknown rule type '${rule.type}'.` });
          break;
      }
    }

    return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
  }

  function validateNode(value, schema, path, errors) {
    if (!schema || typeof schema !== "object") return;

    if (schema.type && !typeMatches(value, schema.type)) {
      errors.push({ path: path || "/", message: `Expected type ${schema.type}, got ${describeType(value)}.` });
      return;
    }

    if (schema.enum && Array.isArray(schema.enum) && !schema.enum.includes(value)) {
      errors.push({ path: path || "/", message: `Value must be one of: ${schema.enum.join(", ")}.` });
    }

    if (schema.type === "object" && isPlainObject(value)) {
      validateObject(value, schema, path, errors);
    }

    if (schema.type === "array" && Array.isArray(value)) {
      validateArray(value, schema, path, errors);
    }

    if (schema.type === "string" && typeof value === "string") {
      validateString(value, schema, path, errors);
    }

    if ((schema.type === "number" || schema.type === "integer") && typeof value === "number") {
      validateNumber(value, schema, path, errors);
    }
  }

  function validateObject(value, schema, path, errors) {
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push({ path: joinPath(path, key), message: "Missing required property." });
        }
      }
    }

    if (schema.properties && typeof schema.properties === "object") {
      for (const key of Object.keys(schema.properties)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          validateNode(value[key], schema.properties[key], joinPath(path, key), errors);
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties && typeof schema.properties === "object") {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) {
          errors.push({ path: joinPath(path, key), message: "Additional property not allowed." });
        }
      }
    }
  }

  function validateArray(value, schema, path, errors) {
    if (Number.isFinite(Number(schema.minItems)) && value.length < Number(schema.minItems)) {
      errors.push({ path: path || "/", message: `Must contain at least ${schema.minItems} items.` });
    }
    if (Number.isFinite(Number(schema.maxItems)) && value.length > Number(schema.maxItems)) {
      errors.push({ path: path || "/", message: `Must contain at most ${schema.maxItems} items.` });
    }
    if (schema.items) {
      for (let index = 0; index < value.length; index += 1) {
        validateNode(value[index], schema.items, joinPath(path, String(index)), errors);
      }
    }
  }

  function validateString(value, schema, path, errors) {
    if (Number.isFinite(Number(schema.minLength)) && value.length < Number(schema.minLength)) {
      errors.push({ path: path || "/", message: `String too short (min ${schema.minLength}).` });
    }
    if (Number.isFinite(Number(schema.maxLength)) && value.length > Number(schema.maxLength)) {
      errors.push({ path: path || "/", message: `String too long (max ${schema.maxLength}).` });
    }
    if (schema.pattern) {
      try {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          errors.push({ path: path || "/", message: `String does not match pattern ${schema.pattern}.` });
        }
      } catch {
        errors.push({ path: path || "/", message: `Invalid schema pattern ${schema.pattern}.` });
      }
    }
  }

  function validateNumber(value, schema, path, errors) {
    if (Number.isFinite(Number(schema.minimum)) && value < Number(schema.minimum)) {
      errors.push({ path: path || "/", message: `Number must be >= ${schema.minimum}.` });
    }
    if (Number.isFinite(Number(schema.maximum)) && value > Number(schema.maximum)) {
      errors.push({ path: path || "/", message: `Number must be <= ${schema.maximum}.` });
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

  function describeType(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (Number.isInteger(value)) return "integer";
    return typeof value;
  }

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function ruleEnum(root, rule, errors) {
    const node = getByPath(root, rule.path);
    if (node.missing) {
      errors.push({ path: rule.path || "/", message: rule.message || "Value is missing." });
      return;
    }

    const values = Array.isArray(rule.values) ? rule.values : [];
    if (!values.includes(node.value)) {
      errors.push({ path: rule.path || "/", message: rule.message || `Value must be one of: ${values.join(", ")}.` });
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
      errors.push({ path: rule.path || "/", message: "Unique rule requires a key." });
      return;
    }

    const seen = new Set();
    for (let index = 0; index < node.value.length; index += 1) {
      const item = node.value[index];
      if (!isPlainObject(item) || !Object.prototype.hasOwnProperty.call(item, key)) {
        errors.push({ path: `${rule.path}/${index}`, message: `Each item must be an object with property '${key}'.` });
        continue;
      }

      const signature = `${typeof item[key]}:${String(item[key])}`;
      if (seen.has(signature)) {
        errors.push({ path: `${rule.path}/${index}/${key}`, message: rule.message || `Duplicate ${key} found.` });
      } else {
        seen.add(signature);
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

    for (const match of matches) {
      if (typeof match.value !== "string") {
        errors.push({ path: match.path, message: "Expected string for length check." });
        continue;
      }
      if (min !== null && match.value.length < min) {
        errors.push({ path: match.path, message: rule.message || `String too short (min ${min}).` });
      }
      if (max !== null && match.value.length > max) {
        errors.push({ path: match.path, message: rule.message || `String too long (max ${max}).` });
      }
    }
  }

  function getByPath(root, path) {
    const segments = normalizePath(path);
    let current = root;

    for (const segment of segments) {
      if (current === null || current === undefined) return { missing: true, value: undefined };

      if (Array.isArray(current)) {
        const index = Number.parseInt(segment, 10);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) return { missing: true, value: undefined };
        current = current[index];
        continue;
      }

      if (typeof current === "object") {
        if (!Object.prototype.hasOwnProperty.call(current, segment)) return { missing: true, value: undefined };
        current = current[segment];
        continue;
      }

      return { missing: true, value: undefined };
    }

    return { missing: false, value: current };
  }

  function getByWildcardPath(root, path) {
    const segments = normalizePath(path);
    const matches = [];
    walkWildcard(root, segments, 0, "", matches);
    return matches;
  }

  function walkWildcard(current, segments, index, currentPath, matches) {
    if (index >= segments.length) {
      matches.push({ path: currentPath || "/", value: current });
      return;
    }

    const segment = segments[index];
    if (segment === "*") {
      if (!Array.isArray(current)) return;
      for (let itemIndex = 0; itemIndex < current.length; itemIndex += 1) {
        walkWildcard(current[itemIndex], segments, index + 1, joinPath(currentPath, String(itemIndex)), matches);
      }
      return;
    }

    if (Array.isArray(current)) {
      const arrayIndex = Number.parseInt(segment, 10);
      if (!Number.isInteger(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) return;
      walkWildcard(current[arrayIndex], segments, index + 1, joinPath(currentPath, String(arrayIndex)), matches);
      return;
    }

    if (typeof current === "object" && current !== null && Object.prototype.hasOwnProperty.call(current, segment)) {
      walkWildcard(current[segment], segments, index + 1, joinPath(currentPath, segment), matches);
    }
  }

  function normalizePath(path) {
    const clean = String(path || "").trim();
    if (clean === "" || clean === "/") return [];
    return clean.replace(/^\//, "").split("/").filter(Boolean);
  }

  function joinPath(base, segment) {
    return `${base || ""}/${String(segment).replaceAll("~", "~0").replaceAll("/", "~1")}`;
  }

  return { parse, validateAgainstSchema, validateRules, getByPath, getByWildcardPath };
})();

// Backwards-compatible global alias for older snippets/tests.
window.JsonValidator = window.JsonHarbor.Validator;

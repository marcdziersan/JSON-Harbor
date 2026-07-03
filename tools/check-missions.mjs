#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const indexPath = join(root, 'js', 'missions', 'missions.json');

function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

async function readJson(path) {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw);
}

const missionsIndex = await readJson(indexPath);
const seen = new Set();
let total = 0;

if (!Array.isArray(missionsIndex.docks) || missionsIndex.docks.length === 0) {
  fail('missions.json has no docks[].');
}

for (const dock of missionsIndex.docks || []) {
  if (!dock.dockId || !dock.dockTitle) fail('dock is missing dockId or dockTitle.');
  if (!Array.isArray(dock.missions) || dock.missions.length === 0) fail(`${dock.dockId} has no missions[].`);

  for (const missionRef of dock.missions || []) {
    total += 1;
    if (!missionRef.id || !missionRef.title || !missionRef.file) fail(`${dock.dockId} contains an incomplete mission reference.`);
    if (seen.has(missionRef.id)) fail(`duplicate mission id: ${missionRef.id}`);
    seen.add(missionRef.id);

    const missionPath = normalize(join(root, missionRef.file));
    const mission = await readJson(missionPath);

    if (mission.id && mission.id !== missionRef.id) fail(`${missionRef.file}: id mismatch (${mission.id} !== ${missionRef.id}).`);
    if (typeof mission.input !== 'string') fail(`${missionRef.file}: input must be a string.`);
    if (!mission.schema && !mission.rules && mission.expected === undefined) {
      fail(`${missionRef.file}: mission has no schema, rules or expected output.`);
    }
  }
}

if (!process.exitCode) {
  console.log(`✓ Mission index valid: ${missionsIndex.docks.length} docks, ${total} missions.`);
}

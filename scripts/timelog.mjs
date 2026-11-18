#!/usr/bin/env node
// Zero-dependency build time tracker. Usage: start | mark "<phase>" | end
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG = join(root, 'TIME_LOG.json');
const REPORT = join(root, 'TIME_REPORT.md');

function isoLocal(d = new Date()) {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const local = new Date(d.getTime() + off * 60000).toISOString().slice(0, 19);
  return `${local}${sign}${pad(off / 60)}:${pad(off % 60)}`;
}
function fmt(ms) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`;
}
function load() {
  if (!existsSync(LOG)) throw new Error('TIME_LOG.json not found. Run `start` first.');
  return JSON.parse(readFileSync(LOG, 'utf8'));
}
function save(data) {
  writeFileSync(LOG, JSON.stringify(data, null, 2) + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);
const now = new Date();

if (cmd === 'start') {
  if (existsSync(LOG) && !rest.includes('--force')) {
    console.error('TIME_LOG.json already exists. Use `start --force` to reset.');
    process.exit(1);
  }
  save({ start: isoLocal(now), startMs: now.getTime(), marks: [], end: null });
  console.log(`Started at ${isoLocal(now)}`);
} else if (cmd === 'mark') {
  const name = rest.join(' ').trim();
  if (!name) {
    console.error('Usage: mark "<phase name>"');
    process.exit(1);
  }
  const data = load();
  const prev = data.marks.length ? data.marks[data.marks.length - 1].atMs : data.startMs;
  data.marks.push({
    phase: name,
    at: isoLocal(now),
    atMs: now.getTime(),
    phaseDuration: fmt(now.getTime() - prev),
    elapsed: fmt(now.getTime() - data.startMs),
  });
  save(data);
  console.log(`[${isoLocal(now)}] ${name} — elapsed ${fmt(now.getTime() - data.startMs)}`);
} else if (cmd === 'end') {
  const data = load();
  data.end = isoLocal(now);
  data.endMs = now.getTime();
  save(data);
  const rows = [];
  let prevMs = data.startMs;
  let prevIso = data.start;
  let deployMs = 0;
  let inDeploy = false;
  for (const m of data.marks) {
    rows.push(`| ${m.phase} | ${prevIso} | ${m.at} | ${fmt(m.atMs - prevMs)} |`);
    if (/deployment finished/i.test(m.phase) && inDeploy) deployMs += m.atMs - prevMs;
    inDeploy = /deployment started/i.test(m.phase);
    prevMs = m.atMs;
    prevIso = m.at;
  }
  const deployStart = data.marks.find((m) => /deployment started/i.test(m.phase));
  const deployEnd = data.marks.find((m) => /deployment finished/i.test(m.phase));
  const total = data.endMs - data.startMs;
  const localBuild = deployStart ? deployStart.atMs - data.startMs : total;
  const deploy = deployStart && deployEnd ? deployEnd.atMs - deployStart.atMs : 0;
  const md = `# Build Time Report — PIF-AdminPanel-MVP

All timestamps come from the system clock (\`scripts/timelog.mjs\`), not estimates.

- **Start:** ${data.start}
- **End:** ${data.end}
- **Total wall-clock time:** ${fmt(total)}
- **Local build time:** ${fmt(localBuild)}
- **Deployment time:** ${deploy ? fmt(deploy) : 'not yet run'}

## Phases

| Phase | Started | Finished | Duration |
|---|---|---|---|
${rows.join('\n')}

## Summary

${data.marks.length} phases tracked. The local MVP (backend, frontend, tests, docs and CI/CD files) was built in ${fmt(localBuild)} of wall-clock time${deploy ? `; deployment took ${fmt(deploy)}, for a combined ${fmt(localBuild + deploy)}` : ''}.
`;
  writeFileSync(REPORT, md);
  console.log(md);
} else {
  console.log('Usage: node scripts/timelog.mjs start | mark "<phase>" | end');
  process.exit(1);
}

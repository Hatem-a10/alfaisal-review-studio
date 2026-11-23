import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {expandModulePreloads} from '../scripts/client-scripts.mjs';

test('preloads the whole static import graph but leaves dynamic imports lazy', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'mp-'));
  mkdirSync(path.join(dir, 'sub'));
  writeFileSync(path.join(dir, 'root.mjs'), 'import{a}from"./a.mjs";import "./sub/b.mjs";const lazy=()=>import("./lazy.mjs");');
  writeFileSync(path.join(dir, 'a.mjs'), 'export {c} from "./c.mjs";export const a=1;');
  writeFileSync(path.join(dir, 'sub/b.mjs'), 'export * from "../d.mjs";');
  writeFileSync(path.join(dir, 'c.mjs'), 'export const c=1;');
  writeFileSync(path.join(dir, 'd.mjs'), 'export const d=1;');
  const html = '<head><link rel="modulepreload" href="/root.mjs?v=2"></head>';
  const out = expandModulePreloads(dir, html);
  const hrefs = [...out.matchAll(/modulepreload" href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(hrefs, ['/root.mjs?v=2', '/a.mjs', '/sub/b.mjs', '/c.mjs', '/d.mjs']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembledLearning} from '../scripts/assembled-learning.mjs';

const pack = JSON.parse(readFileSync(new URL('../public/topic-takeaways.json', import.meta.url), 'utf8'));
const {teaching} = assembledLearning();
const sections = Object.values(teaching.guides).flatMap(guide => guide.sections);
const byId = new Map(sections.map(section => [section.id, section]));

test('every guided concept card has a usable What to remember section', () => {
 for (const section of sections) {
  assert.ok(section.keyPoints?.some(point => typeof point === 'string' && point.trim()), section.id);
 }
});

test('deferred takeaways apply to existing cards and include tested rules', () => {
 for (const [id, points] of Object.entries(pack)) {
  assert.ok(points.length >= 2, id);
  assert.deepEqual(Array.from(byId.get(id)?.keyPoints || []), points, id);
 }
 assert.match(byId.get('CVP-P22:0').keyPoints.join(' '), /rate × \(tidal volume − dead-space volume\)/);
 assert.match(byId.get('CVP-A20:resp26-descent').keyPoints.join(' '), /T8: IVC.*T10: esophagus.*T12: aorta/);
 assert.match(byId.get('MOL-24:redox').keyPoints.join(' '), /pyruvate toward lactate and oxaloacetate toward malate/);
});

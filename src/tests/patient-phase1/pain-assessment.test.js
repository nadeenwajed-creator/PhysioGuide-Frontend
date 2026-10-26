import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { initialAssessment, assessmentReducer as reduce, intensityBand, validStep, completeAssessment, suggestCare, matchingCenters, descriptions, durations, histories } from '../../services/patient/painAssessmentModel.js';
import { bodyHotspots } from '../../components/patient/pain-assessment/bodyHotspots.js';
import { painAssessmentEn, painAssessmentAr } from '../../locales/painAssessment.js';

const answered = overrides => ({ ...initialAssessment(), painAreas: ['lower_back'], intensity: 5, duration: 'weeks_1_4', descriptions: ['aching'], relatedHistory: 'none', ...overrides });

test('fresh assessment has no answers and all steps reject empty input', () => {
  const state = initialAssessment();
  for (let step = 1; step <= 5; step++) assert.equal(validStep(state, step), false);
  assert.equal(suggestCare(state), null);
  assert.deepEqual(reduce(state, { type: 'next' }), state);
  assert.deepEqual(reduce(state, { type: 'complete' }), state);
});

test('areas and descriptions toggle independently; affordance is never an area', () => {
  let state = initialAssessment();
  for (const id of ['neck', 'knee', 'multi']) state = reduce(state, { type: 'area', id });
  assert.deepEqual(state.painAreas, ['neck', 'knee']);
  state = reduce(state, { type: 'area', id: 'neck' });
  assert.deepEqual(state.painAreas, ['knee']);
  for (const id of descriptions) state = reduce(state, { type: 'description', id });
  assert.deepEqual(state.descriptions, descriptions);
  state = reduce(state, { type: 'preview', id: 'aching' });
  assert.equal(state.q4PreviewType, 'aching');
  state = reduce(state, { type: 'description', id: 'aching' });
  assert.equal(state.q4PreviewType, 'other');
  assert.equal(state.descriptions.length, 6);
});

test('zero is explicit and valid; numeric category boundaries share one state', () => {
  const cases = [[0, 'none'], [1, 'mild'], [3, 'mild'], [4, 'moderate'], [6, 'moderate'], [7, 'severe'], [10, 'severe']];
  for (const [value, band] of cases) {
    assert.equal(intensityBand(value), band);
    assert.equal(validStep(reduce(initialAssessment(), { type: 'intensity', value }), 2), true);
  }
  for (const value of [null, -1, 11, 5.5, '5', undefined, NaN]) assert.equal(intensityBand(value), null);
});

test('duration and history are single-select allowlists', () => {
  let state = initialAssessment();
  for (const id of durations) { state = reduce(state, { type: 'duration', id }); assert.equal(state.duration, id); }
  for (const id of histories) { state = reduce(state, { type: 'history', id }); assert.equal(state.relatedHistory, id); }
  assert.equal(reduce(state, { type: 'history', id: 'invented' }), state);
});

test('navigation retains answers; completion validates every step; reset creates fresh state', () => {
  let state = answered();
  for (let i = 0; i < 4; i++) state = reduce(state, { type: 'next' });
  assert.equal(state.step, 5);
  state = reduce(state, { type: 'back' });
  assert.equal(state.step, 4);
  assert.deepEqual(state.painAreas, ['lower_back']);
  assert.equal(state.intensity, 5);
  assert.equal(completeAssessment(state), true);
  state = reduce(state, { type: 'complete' });
  assert.equal(state.view, 'result');
  assert.deepEqual(reduce(state, { type: 'reset' }), initialAssessment());
  for (const override of [{ painAreas: [] }, { intensity: null }, { duration: null }, { descriptions: [] }, { relatedHistory: null }]) {
    assert.equal(reduce(answered(override), { type: 'complete' }).view, 'questions');
  }
});

test('care rules are deterministic, conservative and respond to answers', () => {
  assert.equal(suggestCare(answered()), 'back');
  assert.equal(suggestCare(answered({ painAreas: ['knee'] })), 'knee');
  assert.equal(suggestCare(answered({ painAreas: ['shoulder'] })), 'musculoskeletal');
  assert.equal(suggestCare(answered({ relatedHistory: 'previous_surgery' })), 'postsurgery');
  for (const override of [{ intensity: 0 }, { intensity: 9 }, { descriptions: ['tingling'] }, { relatedHistory: 'recent_injury' }, { painAreas: ['neck'], duration: 'months_3_plus' }]) assert.equal(suggestCare(answered(override)), 'general');
});

test('entire assessment completes and calculates care with network and storage forbidden', () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Backend offline'); };
  try {
    let state = initialAssessment();
    for (const action of [{ type: 'area', id: 'knee' }, { type: 'next' }, { type: 'intensity', value: 0 }, { type: 'next' }, { type: 'duration', id: 'today' }, { type: 'next' }, { type: 'description', id: 'movement' }, { type: 'next' }, { type: 'history', id: 'none' }, { type: 'complete' }]) state = reduce(state, action);
    assert.equal(state.view, 'result');
    assert.equal(suggestCare(state), 'general');
    assert.deepEqual(reduce(state, { type: 'reset' }), initialAssessment());
  } finally { globalThis.fetch = previousFetch; }
});

test('center matching requires genuine source, explicit Palestinian city and offered service; caps at two', () => {
  const fixture = id => ({ id, name: { en: 'Test fixture' }, city: { en: 'Ramallah' }, services: [{ id: 's', name: { en: 'Knee Rehabilitation' } }] });
  const centers = [fixture('center-demo'), { ...fixture('outside'), city: 'Riyadh' }, { ...fixture('unknown'), city: null }, { ...fixture('inactive'), status: 'inactive' }, { ...fixture('wrong-service'), services: [{ id: 's', name: 'Pediatric Physiotherapy' }] }, fixture('test-a'), fixture('test-b'), fixture('test-c')];
  assert.deepEqual(matchingCenters(centers, 'knee').map(c => c.id), ['test-a', 'test-b']);
  assert.deepEqual(matchingCenters(null, 'knee'), []);
  assert.deepEqual(matchingCenters(centers, 'postsurgery'), []);
  assert.equal(matchingCenters([fixture('test-a'), fixture('test-a')], 'knee').length, 1);
});

test('all feature translations are present in English and Arabic', () => {
  assert.deepEqual(Object.keys(painAssessmentEn), Object.keys(painAssessmentAr));
  for (const key of Object.keys(painAssessmentEn)) {
    assert.equal(typeof painAssessmentEn[key], 'string');
    assert.match(painAssessmentAr[key], /[\u0600-\u06ff]/);
  }
});

test('each anatomical area maps to real image coordinates within its wrapper', () => {
  for (const points of Object.values(bodyHotspots).flatMap(side => Object.values(side))) for (const [x, y] of points) assert(x > 0 && x < 100 && y > 0 && y < 100);
  assert.deepEqual(bodyHotspots.back.lower_back, [[50, 43]]);
  assert.equal(bodyHotspots.front.lower_back, undefined);
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

test('runtime assets match handoff hashes; PNG rasters are intact and genuinely transparent', () => {
  const assets = [
    ['body-front.png', 500, 970, 6, '1a734958c197e8c80111d684e5b214b41174ffa22080374734e16c28e8cbbb96'],
    ['body-back.png', 500, 970, 6, 'fc7b40b3b012a0cf8481ade7e979b579036f3969c07ad9ec8444772ab72a0a4d'],
    ['pain-texture-background.jpg', 1536, 1152, 2, 'd0983b63b050bd62a960b93f0ce99ff35e5afa00624ea157d435f1881fcb13c0'],
  ];
  for (const [file, width, height, type, hash] of assets) {
    const bytes = readFileSync(new URL(`../../assets/images/patient/pain-assessment/${file}`, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), hash);
    if (file.endsWith('.jpg')) {
      assert.equal(bytes.readUInt16BE(0), 0xffd8);
      assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
      let found = false;
      for (let offset = 2; offset < bytes.length;) {
        const marker = bytes.readUInt16BE(offset), length = bytes.readUInt16BE(offset + 2);
        if ([0xffc0, 0xffc1, 0xffc2].includes(marker)) {
          assert.equal(bytes.readUInt16BE(offset + 5), height);
          assert.equal(bytes.readUInt16BE(offset + 7), width);
          found = true; break;
        }
        offset += length + 2;
      }
      assert(found); continue;
    }
    assert.equal(bytes.readUInt32BE(16), width); assert.equal(bytes.readUInt32BE(20), height);
    assert.equal(bytes[25], type); assert.equal(bytes[24], 8);
    const data = [];
    for (let offset = 8; offset < bytes.length;) {
      const length = bytes.readUInt32BE(offset), name = bytes.toString('ascii', offset + 4, offset + 8);
      assert.equal(crc32(bytes.subarray(offset + 4, offset + 8 + length)), bytes.readUInt32BE(offset + 8 + length));
      if (name === 'IDAT') data.push(bytes.subarray(offset + 8, offset + 8 + length));
      offset += length + 12;
    }
    const channels = type === 6 ? 4 : 3, stride = width * channels;
    const raster = inflateSync(Buffer.concat(data));
    assert.equal(raster.length, (stride + 1) * height);
    if (type === 6) {
      // Reverse PNG scanline filters to verify genuine transparent and opaque pixels.
      let previous = Buffer.alloc(stride), transparent = 0, opaque = 0;
      const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
      for (let y = 0; y < height; y++) {
        const filter = raster[y * (stride + 1)], row = Buffer.from(raster.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
        for (let i = 0; i < stride; i++) {
          const a = i >= channels ? row[i - channels] : 0, b = previous[i], c = i >= channels ? previous[i - channels] : 0;
          row[i] = (row[i] + ([0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter])) & 255;
        }
        for (let i = 3; i < stride; i += 4) { if (row[i] === 0) transparent++; if (row[i] === 255) opaque++; }
        previous = row;
      }
      assert(transparent > width * height * .2); assert(opaque > width * height * .2);
    }
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { PRINT_SIZES, printSize, fitArtwork, printAssessment } from '../shared/printing.mjs';
import { WALL_EDITS, WALL_TONES, FRAME_TONES, planForEdit, normalizeWallPlan, wallGeometry, wallTotal, wallPlanText, wallQuery, isWallProduct, nextHeritageId } from '../shared/walls.mjs';
import { generatedProduct } from '../shared/designs.mjs';

const generated = id=>generatedProduct(id);
test('print fit: A4 contain keeps a 4:5 artwork panel with real borders', () => {
  const f = fitArtwork(21, 29.7, 'contain');
  assert.equal(f.artworkWidthCm, 21);
  assert.ok(Math.abs(f.artworkHeightCm - 26.25) < 1e-9);
  assert.ok(f.verticalBorderMm > 17 && f.verticalBorderMm < 18);
  assert.equal(f.horizontalBorderMm, 0);
  assert.equal(f.cropPercent, 0);
});
test('print fit: cover crops honestly and bad sizes are refused', () => {
  // 16×20 in matches the 4:5 artwork ratio exactly — nothing to crop; A4 does not.
  assert.equal(fitArtwork(40.64, 50.8, 'cover').cropPercent, 0);
  const f = fitArtwork(21, 29.7, 'cover');
  assert.ok(f.cropPercent > 11 && f.cropPercent < 12);
  assert.throws(()=>fitArtwork(0, 10));
  assert.throws(()=>fitArtwork(500, 10));
  assert.equal(fitArtwork(10, 10, 'nonsense').mode, 'contain');
});
test('size chart stays truthful about what is included', () => {
  assert.equal(PRINT_SIZES.length, 7);
  assert.ok(PRINT_SIZES.filter(s=>s.included).map(s=>s.id).join(',')==='5x7,8x10,a4');
  const r = printAssessment(generated('mithila-garden-001'), '8x10');
  assert.equal(r.quality, 'vector');
  assert.equal(r.includedPdf, true);
  assert.deepEqual(r.requiredPixels, {width: 2400, height: 3000});
  const big = printAssessment({id:'tree-of-life', artworks:['tree-of-life']}, '24x36');
  assert.equal(big.quality, 'source-limited');
  const mystery = printAssessment({id:'mystery'}, 'a4');
  assert.equal(mystery.quality, 'unknown');
});
test('wall edits point at real, allowed products only', () => {
  for (const edit of WALL_EDITS) {
    const plan = planForEdit(edit, generated);
    assert.ok(plan.ids.length >= 2);
    for (const id of plan.ids) assert.ok(isWallProduct(generated(id)), id);
    assert.ok(wallTotal(plan, generated) > 24);
  }
});
test('normalization refuses private, studio or invented artwork', () => {
  const bad = {version:1, edit:'nope', ids:['studio-'+ 'a'.repeat(32), 'tree-of-life/accessorySet', 'mithila-garden-001', 'mithila-garden-001'], paper:'11x14', wall:'paint', wallCm:99999, gapCm:0};
  const plan = normalizeWallPlan(bad, generated);
  assert.deepEqual(plan.ids, ['mithila-garden-001']);
  assert.equal(plan.paper, '8x10');
  assert.equal(plan.wallCm, 500); // out-of-range numbers are clamped into supported bounds
  assert.equal(plan.gapCm, 2);
  assert.ok(WALL_TONES.some(t=>t.id===plan.wall) && FRAME_TONES.some(t=>t.id===plan.frame));
});
test('geometry: rows, grids, gaps and fit math', () => {
  const plan = normalizeWallPlan({edit:'garden-quartet', paper:'8x10', layout:'grid', gapCm:5, wallCm:200, matCm:2}, generated);
  const g = wallGeometry(plan);
  assert.equal(g.positions.length, 4);
  assert.equal(g.positions[1].y, g.positions[0].y);
  assert.ok(g.positions[2].y > g.positions[0].y);
  assert.ok(Math.abs(g.widthCm - (2*g.outerWidthCm + 5)) < 1e-9);
  assert.equal(g.fits, true);
  const tiny = wallGeometry({...plan, wallCm:50});
  assert.equal(tiny.fits, false);
  const stepped = wallGeometry(normalizeWallPlan({edit:'mithila-morning', layout:'stepped', gapCm:5}, generated));
  assert.ok(stepped.positions[1].y > stepped.positions[0].y);
});
test('share links round-trip without private data', () => {
  const plan = normalizeWallPlan({edit:'indigo-stories', layout:'stepped', paper:'a4', wall:'clay', frame:'oak', wallCm:220, gapCm:8, matCm:3, hang:44}, generated);
  const text = wallPlanText(plan, generated, 'https://epic.example');
  assert.ok(text.includes('not an artwork download'));
  assert.ok(text.includes('digital only'));
  assert.ok(!/token|cookie/i.test(text));
  const round = normalizeWallPlan(new URLSearchParams(wallQuery(plan, generated)), generated);
  assert.deepEqual(round.ids, plan.ids);
  assert.equal(round.layout, 'stepped');
});
test('suggestions stay inside heritage families', () => {
  const id = nextHeritageId('peacock-rhapsody','indigo',['peacock-rhapsody-002']);
  assert.ok(/^peacock-rhapsody-0\d\d$/.test(id));
  assert.ok(isWallProduct(generated(id)));
  assert.equal(nextHeritageId('studio-x','heritage',[]), null);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OCCASIONS, occasionsFor } from '../shared/celebrations.mjs';
import { generatedProduct, generateCatalog } from '../shared/designs.mjs';
import { validateCheckout, validateGift, HttpError } from '../server/core.mjs';

const catalog = JSON.parse(readFileSync('shared/catalog.json','utf8'));
const resolve = id=>generatedProduct(id)||catalog.find(p=>p.id===id);
const products = [...catalog, ...generateCatalog()];

test('every celebration edit points at existing products', () => {
  assert.equal(OCCASIONS.length, 3);
  for (const occ of occasionsFor(resolve)) {
    assert.equal(occ.products.length, occ.ids.length, occ.id);
    assert.equal(new Set(occ.ids).size, occ.ids.length);
    assert.ok(occ.story.length > 60 && occ.story.length < 1200);
    assert.ok(occ.products.every(p=>p.price>0));
  }
});
test('gift validation keeps the checkout honest', () => {
  assert.equal(validateGift(undefined), null);
  assert.equal(validateGift(null), null);
  assert.equal(validateGift(false), null);
  assert.deepEqual(validateGift({recipient:'  Asha Karki  ', message:'  With love  '}), {recipient:'Asha Karki', message:'With love'});
  assert.deepEqual(validateGift({recipient:'Asha', message:''}), {recipient:'Asha', message:''});
  assert.throws(()=>validateGift({recipient:'A'}), HttpError);
  assert.throws(()=>validateGift({recipient:'A'.repeat(61)}), HttpError);
  assert.throws(()=>validateGift({recipient:'Asha', message:'x'.repeat(281)}), HttpError);
  assert.throws(()=>validateGift('Asha'), HttpError);
});
test('checkout accepts a gift and leaves non-gift orders unchanged', () => {
  const base = {name:'Demo Collector', email:'demo@example.com', accept:true, mode:'demo', ids:['mithila-garden-001']};
  const plain = validateCheckout(base, products);
  // Totals are integer cents: $18 → 1800.
  assert.equal(plain.gift, null);
  assert.equal(plain.total, 1800);
  const gifted = validateCheckout({...base, gift:{recipient:'Sita', message:'For your new home'}}, products);
  assert.deepEqual(gifted.gift, {recipient:'Sita', message:'For your new home'});
  assert.equal(gifted.total, plain.total);
  assert.deepEqual(plain.ids, gifted.ids);
  const changed = validateCheckout({...base, ids:['mithila-garden-001','peacock-rhapsody-001']}, products);
  assert.equal(changed.total, 3800);
});

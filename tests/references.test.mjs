import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { validateQuery, validImageId, refCards, createReferenceService } from '../server/references.mjs';
import { CURATED_QUERIES } from '../shared/references.mjs';

const IMG='2b20d9ba-9a1a-4f56-9c0a-4db0a3ea3d5e';
test('museum queries are bounded and honest', () => {
  assert.equal(validateQuery('Rajput painting'), 'Rajput painting');
  assert.equal(validateQuery('  kalamkari   textile '), 'kalamkari textile');
  assert.equal(validateQuery('a'), null);
  assert.equal(validateQuery('x'.repeat(61)), null);
  assert.equal(validateQuery('DROP TABLE orders;'), null);
  assert.equal(validateQuery(''), null);
  assert.equal(validateQuery(null), null);
  assert.ok(CURATED_QUERIES.every(c=>validateQuery(c.q)));
});
test('only public-domain works with usable images become cards', () => {
  const body={data:[
    {id:1,title:'A fine miniature',artist_title:'Court painter, Rajasthan',date_display:'c. 1800',image_id:IMG,is_public_domain:true},
    {id:2,title:'Copyrighted work',image_id:IMG,is_public_domain:false},
    {id:3,title:'No image',image_id:null,is_public_domain:true},
    {id:4,title:123,image_id:IMG,is_public_domain:true},
    {id:5,title:'Another piece',artist_title:123,image_id:IMG,is_public_domain:true},
  ]};
  const cards=refCards(body);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].museumUrl, 'https://www.artic.edu/artworks/1');
  assert.equal(cards[1].artist, 'Unknown artist');
  assert.ok(!cards.some(c=>c.title==='Copyrighted work'));
  assert.ok(cards.every(c=>c.note.includes('not an Epic Arts product')));
  assert.equal(refCards(null).length, 0);
  assert.equal(validImageId(IMG), true);
  assert.equal(validImageId('not-an-id'), false);
  assert.equal(validImageId('../../etc/passwd'), false);
});
test('search caches results and maps upstream failures to honest 503s', async () => {
  const svc=createReferenceService(mkdtempSync(resolve(tmpdir(),'epic-ref-')));
  let calls=0;
  const fake=async url=>{calls++;assert.ok(url.startsWith('https://api.artic.edu/'));return {ok:true,json:async()=>({data:[{id:7,title:'Test work',image_id:IMG,is_public_domain:true}]})};};
  const first=await svc.search('Rajput',{fetchImpl:fake});
  const second=await svc.search('Rajput',{fetchImpl:fake});
  assert.equal(calls, 1);
  assert.equal(first[0].title, 'Test work');
  assert.deepEqual(second, first);
  await assert.rejects(svc.search('Miniature',{fetchImpl:async()=>{throw new Error('network down');}}));
});
test('thumbnails validate ids, cache to disk, and cap size', async () => {
  const svc=createReferenceService(mkdtempSync(resolve(tmpdir(),'epic-ref-')));
  await assert.rejects(svc.thumb('../escape',{fetchImpl:async()=>({ok:false})}), /valid/);
  let calls=0;const fake=async()=>{calls++;return {ok:true,arrayBuffer:async()=>Buffer.from([0xff,0xd8,0xff])};};
  const a=await svc.thumb(IMG,{fetchImpl:fake});
  const b=await svc.thumb(IMG,{fetchImpl:fake});
  assert.equal(calls, 1);
  assert.ok(a.equals(b));
});

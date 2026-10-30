import fs from 'node:fs';
import assert from 'node:assert/strict';
import {recommend,CONFIG} from './recommendations.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('./catalog.json',import.meta.url)));
const combinations=JSON.parse(fs.readFileSync(new URL('./combinations.json',import.meta.url)));
assert.equal(combinations.length,96);
assert.equal(new Set(catalog.map(r=>r.id)).size,catalog.length);
for(const c of combinations){
 assert.equal(c.candidates.length,20,c.id);
 assert.equal(new Set(c.candidates.map(r=>r.id)).size,20,c.id);
 for(const r of c.candidates){assert.ok(r.appleUrl.startsWith('https://tv.apple.com/kr/'));assert.equal(r.exactMatch,r.relaxations.length===0);}
 const strict=recommend(catalog,c.preferences);
 assert.ok(strict.every(r=>r.exactMatch && !r.relaxations.length));
 for(const r of strict){
  assert.ok(r.genres.includes(c.preferences.genres[0]));
  const mins=r.selectedEpisode?.minutes ?? r.runtimeMinutes;
  if(c.preferences.duration==='30분 이하')assert.ok(mins<=30);
  if(c.preferences.duration==='1시간 내외')assert.ok(mins>=40 && mins<=75);
  if(c.preferences.duration==='영화 한 편')assert.ok(r.type==='movie' && mins>=60);
 }
}
for(const d of ['short','hour','movie','any']){
 const a=combinations.find(c=>c.id===`romance__tense__${d}`).candidates.map(r=>r.id);
 const b=combinations.find(c=>c.id===`romance__warm__${d}`).candidates.map(r=>r.id);
 assert.ok(new Set([...a,...b]).size>20,'로맨스 분위기별 작품 구성이 달라야 합니다: '+d);
}
const p={genres:['로맨스','SF'],mood:'몰입감 있는',duration:'상관없음'};
const multi=recommend(catalog,p);
assert.ok(multi.length>0);
assert.ok(multi.every(r=>r.genres.includes('로맨스')&&r.genres.includes('SF')));
assert.deepEqual(multi.map(r=>r.id),recommend(catalog,{...p,genres:['SF','로맨스']}).map(r=>r.id));
const warm={genres:['로맨스'],duration:'상관없음'};
assert.deepEqual(recommend(catalog,{...warm,mood:'따뜻한 감동'}).map(r=>r.id),recommend(catalog,{...warm,mood:'따뜻한 갈등'}).map(r=>r.id));
assert.throws(()=>recommend(catalog,{genres:['잘못된 장르']}));
console.log(`PASS: ${catalog.length} works, 96 combinations × 20 candidates; exact time constraints; multi-genre AND/order; label aliases; romance mood differences.`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
const base = process.env.TEST_URL || 'http://localhost:5173';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Integration tests only create data on localhost');
function client() {
  const jar = new Map();
  return async (method, action, extra = {}) => {
    const headers = { Origin: base, 'Content-Type': 'application/json', Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join('; ') };
    const path = method === 'GET' ? '/api/workshop?id=' + extra.id : '/api/workshop';
    const r = await fetch(base + path, { method, headers, ...(method === 'POST' ? { body: JSON.stringify({ action, ...extra }) } : {}) });
    for (const c of r.headers.getSetCookie()) { const first = c.split(';')[0], i = first.indexOf('='); jar.set(first.slice(0,i), first.slice(i+1)); }
    return { status: r.status, data: await r.json() };
  };
}
const admin = client(), operator = client(), decoder = client(), stranger = client();
let r = await admin('POST', 'create', { round: 1, minutes: 1, teams: 2, title: '자동 검증' });
assert.equal(r.status, 200, JSON.stringify(r.data)); const id = r.data.id;
assert.equal(r.data.admin, true);
assert.equal((await stranger('GET', '', {id})).data.admin, false);
assert.equal((await stranger('POST', 'start', {id})).status, 403);
assert.equal((await operator('POST', 'join', {id, name:'현장 검증', room:0, role:'operator'})).status, 200);
assert.equal((await decoder('POST', 'join', {id, name:'해독 검증', room:0, role:'decoder'})).status, 200);
assert.equal((await stranger('POST', 'join', {id, name:'중복 현장', room:0, role:'operator'})).status, 400);
const compositions=[['button','wire','symbols'],['wire','morse','maze'],['button','symbols','maze','music'],['symbols','music','memory','words'],['wire','morse','maze','complex'],['wire','symbols','maze','memory','words'],['maze','words','music','morse','complex'],['wire','morse','words','music','memory'],['symbols','maze','words','music','memory','complex']];
for(let round=1;round<=9;round++) {
  r=await admin('POST','configure',{id,round,minutes:1});assert.equal(r.status,200);
  assert.equal((await operator('GET','',{id})).data.round,round);
  r=await admin('POST','start',{id,round,minutes:1,run:r.data.run});assert.equal(r.status,200);
  const run=r.data.run;
  const view=(await operator('GET','',{id})).data;
  assert.equal(view.round,round);assert.deepEqual(view.rooms[0].modules.map(m=>m.type),compositions[round-1]);
  assert.equal((await decoder('GET','',{id})).data.rooms[0].modules.every(m=>Object.keys(m).every(k=>['type','done','stage'].includes(k))),true);
  assert.equal((await decoder('POST','answer',{id,run,module:0,stage:0,answer:0})).status,403);
  assert.equal((await stranger('POST','configure',{id,round:1,minutes:5})).status,403);
  r=await admin('POST','pause',{id,run});assert.equal(r.data.status,'paused');const remaining=r.data.remaining;
  assert.equal((await operator('POST','answer',{id,run,module:0,stage:0,answer:0})).status,409);
  assert.equal((await operator('GET','',{id})).data.remaining,remaining);
  r=await admin('POST','resume',{id,run});assert.equal(r.data.status,'running');
  if(round===4){await admin('POST','pause',{id,run});}
  r=await admin('POST','end',{id,run});assert.equal(r.data.status,'ended');
  assert.equal((await operator('GET','',{id})).data.rooms[0].status,'failed');
}
// Direct start must apply a newly chosen round even if no configure call preceded it.
r=await admin('POST','start',{id,round:4,minutes:2});assert.equal(r.data.round,4);assert.equal(r.data.duration,120000);assert.equal(r.data.rooms[0].modules.length,4);
assert.equal((await admin('POST','end',{id,run:r.data.run-1})).status,409);
await admin('POST','end',{id});
// Three concurrent incorrect submissions must consume exactly three chances.
r=await admin('POST','start',{id,round:1,minutes:1});const run=r.data.run;
const attempts=await Promise.all(Array.from({length:3},()=>operator('POST','answer',{id,run,module:0,stage:0,answer:'invalid'})));
assert.ok(attempts.every(r=>r.status===200));r=await operator('GET','',{id});assert.equal(r.data.rooms[0].strikes,3);assert.equal(r.data.rooms[0].status,'failed');assert.equal(r.data.status,'ended');
// Reconnect and change role without leaving a stale operator in the team.
assert.ok(r.data.me);assert.equal((await operator('POST','leave',{id})).status,200);
assert.equal((await stranger('POST','join',{id,name:'새 현장',room:0,role:'operator'})).status,200);
r=await admin('POST','start',{id,round:1,minutes:1});
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/final-timeout.json',JSON.stringify({id,endsAt:r.data.endsAt}));
console.log('PASS: nine round compositions, participant sync, atomic start settings, pause/resume/end including paused end, server-side host permissions, decoder separation, stale control rejection, concurrent strikes, reconnect and role change.');
console.log('Timeout test started; its completion is checked separately.');

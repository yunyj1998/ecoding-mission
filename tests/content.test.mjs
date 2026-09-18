import fs from 'node:fs';import ts from 'typescript';import assert from 'node:assert/strict';
fs.mkdirSync('work',{recursive:true});
for(const name of ['engine','rules','mission-content'])fs.writeFileSync('work/'+name+'.mjs',ts.transpileModule(fs.readFileSync('lib/'+name+'.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'./rules'","'./rules.mjs'").replaceAll("'./mission-content'","'./mission-content.mjs'"));
const {makeModules,answer,publicModule}=await import('../work/engine.mjs?current');
const {missionMazePaths,mazePaths,morse}=await import('../work/rules.mjs');
const {glyphColumns,mazeMarkers,wallMazes,wallMazeMarkers,mazeRoute}=await import('../work/mission-content.mjs');
const variants=new Set(),starts=new Set(),goals=new Set();let tested=0;
for(let seed=0;seed<100;seed++)for(let round=1;round<=9;round++)for(const m of makeModules(round,seed)){
 const serial=seed%2?'KVO123':'KVO124';let steps=0;
 if(m.type==='maze'){const pub=publicModule(m);assert.ok(!('map'in pub));assert.notEqual(m.position,m.goal);assert.ok(!pub.markers.includes(m.position)&&!pub.markers.includes(m.goal));starts.add(m.position);goals.add(m.goal);assert.ok(Math.abs(mazeRoute(wallMazes[m.map],m.position,m.goal).length-1)>=8)}
 if(m.type==='symbols'){assert.equal(glyphColumns.filter(c=>m.symbols.every(x=>c.includes(x))).length,1);variants.add(m.symbols.slice().sort().join(','))}
 while(!m.done&&steps++<60){const pub=publicModule(m);let choices=m.type==='button'?['tap','double','hold']:m.type==='wire'?m.colors.map((_,i)=>i):m.type==='symbols'?m.symbols:m.type==='morse'?[m.word]:m.type==='music'?pub.choices:m.type==='memory'?[0,1,2,3]:m.type==='words'?pub.choices:m.type==='complex'?[0,1,2,3,4,'finish']:[];
 if(m.type==='maze'){const path=mazeRoute(wallMazes[m.map],m.position,m.goal),next=path[1],diff=next-m.position;choices=[diff===1?'right':diff===-1?'left':diff===6?'down':'up']}
 let selected=false;for(const a of choices){const trial=structuredClone(m);if(answer(trial,a,serial)){Object.assign(m,trial);selected=true;break}}assert.ok(selected,`${m.type} unsolvable seed ${seed}`)}assert.ok(m.done);tested++;
}
assert.ok(variants.size>30);assert.ok(starts.size>15&&goals.size>15);assert.equal(new Set(mazeMarkers.map(x=>x.join(','))).size,mazeMarkers.length);
for(const path of missionMazePaths)for(let i=1;i<path.length;i++)assert.equal(Math.abs(path[i]%6-path[i-1]%6)+Math.abs(Math.floor(path[i]/6)-Math.floor(path[i-1]/6)),1);
const old={type:'maze',stage:0,done:false,map:0,position:29};assert.equal(answer(old,'down','KVO123'),true);assert.equal(old.done,true);
console.log(`PASS: ${tested} modules solved; ${variants.size} unique glyph sets; ${starts.size} start cells / ${goals.size} goal cells; nine wall mazes; legacy maze compatible.`);

const {complexCut}=await import('../work/engine.mjs');

// Independent expected truth table: index red*4 + blue*2 + led, star absent/present.
const odd=[[true,true],[false,false],[false,true],[false,false],[true,true],[false,true],[false,false],[false,false]];
const even=[[true,true],[true,true],[false,true],[false,false],[true,true],[false,true],[true,true],[false,false]];
for(let i=0;i<8;i++)for(let star=0;star<2;star++)for(const [serial,table] of [['KV0833',odd],['KV0832',even]])assert.equal(Boolean(complexCut({red:Boolean(i&4),blue:Boolean(i&2),led:Boolean(i&1),star:Boolean(star)},serial)),table[i][star]);
console.log('PASS: all 32 intersection combinations and serial parity cases');

assert.equal(wallMazes.length,9);assert.equal(new Set(wallMazeMarkers.map(x=>x.join(','))).size,9);
for(const [map,edges] of wallMazes.entries()){assert.equal(edges.length,35);for(let a=0;a<36;a++){assert.ok(mazeRoute(edges,0,a).length);for(const [direction,d] of Object.entries({up:-6,down:6,left:-1,right:1})){const b=a+d,expected=edges.some(([x,y])=>(x===a&&y===b)||(y===a&&x===b));const m={type:'maze',version:3,map,position:a,goal:35};assert.equal(answer(m,direction,'KV1234'),expected);if(!expected)assert.equal(m.position,a)}}}
assert.deepEqual(mazeRoute(wallMazes[2],3,15),[3,9,10,4,5,11,17,23,29,35,34,28,22,16,15]);
console.log('PASS: 9 connected wall maps, 1296 directional moves, wall rejection, reference map 3 route, no walls exposed to operator.');

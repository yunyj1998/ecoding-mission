// Shared visual identifiers. Answer words stay server-side in engine.ts.
export const glyphNames: Record<string,string> = {
  front:'정면 파라오', left:'왼쪽을 보는 파라오', right:'오른쪽을 보는 파라오',
  sphinx:'스핑크스', person:'지팡이를 든 사람', bird:'새', eye:'호루스의 눈',
  pyramid:'피라미드', steps:'계단 피라미드', ankh:'앙크', scarab:'풍뎅이', snake:'코브라',
};
export const glyphColumns = [
  ['front','eye','bird','ankh','pyramid','snake'],
  ['left','bird','sphinx','eye','steps','scarab'],
  ['right','ankh','person','snake','front','steps'],
  ['sphinx','pyramid','left','scarab','person','eye'],
  ['snake','right','scarab','bird','steps','ankh'],
  ['person','front','pyramid','sphinx','right','left'],
];
// Each map is identified by two red circles, never by an answer-revealing name.
export const mazeMarkers = [[6,23],[10,25],[15,31],[4,27],[8,33],[12,29]];

// Fixed wall mazes shared by the server and decoder manual. Operators receive markers only.
export const wallMazeMarkers=[[6,17],[10,19],[21,23],[0,18],[16,33],[4,26],[1,31],[3,25],[13,24]];
export function mazeRoute(edges:number[][],start:number,goal:number){
 const queue=[start],previous=new Map<number,number>([[start,-1]]);
 for(let n=0;n<queue.length;n++){const at=queue[n];if(at===goal)break;for(const [a,b] of edges){const next=a===at?b:b===at?a:-1;if(next>=0&&!previous.has(next)){previous.set(next,at);queue.push(next)}}}
 if(!previous.has(goal))return [];const route=[goal];while(route.at(-1)!==start)route.push(previous.get(route.at(-1)!)!);return route.reverse();
}
export const wallMazes=Array.from({length:9},(_,map)=>{
 let seed=8701+map*937;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const trunk=map===2?[3,9,10,4,5,11,17,23,29,35,34,28,22,16,15]:[Math.floor(random()*36)];
 const edges:number[][]=trunk.slice(1).map((cell,i)=>[trunk[i],cell]);const visited=new Set(trunk);
 while(visited.size<36){const frontier:number[][]=[];for(const cell of visited)for(const next of [cell-6,cell+6,cell-1,cell+1])if(next>=0&&next<36&&!visited.has(next)&&Math.abs(next%6-cell%6)+Math.abs(Math.floor(next/6)-Math.floor(cell/6))===1)frontier.push([cell,next]);const edge=frontier[Math.floor(random()*frontier.length)];edges.push(edge);visited.add(edge[1]);}
 return edges;
});

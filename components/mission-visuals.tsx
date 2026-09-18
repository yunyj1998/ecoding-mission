import {glyphNames} from '@/lib/mission-content';

export function Glyph({id}:{id:string}) {
  if(!glyphNames[id]) return <span>{id}</span>;
  const head = <><path d="M20 16 32 7 44 16 48 43 39 48 38 30H26L25 48 16 43Z"/><path d="M25 18Q32 12 39 18V30Q32 40 25 30Z"/><path d="M28 23h1m6 0h1M29 30h6M29 36v8h6v-8M19 24l6 2m-7 4 7 2m-8 4 8 2m16-14 5 2m-5 4 6 2m-6 4 7 2"/></>;
  const side = <><path d="M18 49 22 32 19 18 36 10 45 17 39 21 40 27 46 32H39V38L32 39 35 49Z"/><path d="m23 20 14-5m-13 9 13-5m-12 9 10-5M35 27h2M26 40l5 3"/></>;
  return <svg className="glyph" viewBox="0 0 64 56" role="img" aria-label={glyphNames[id]}><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    {id==='front'&&head}{id==='right'&&side}{id==='left'&&<g transform="translate(64 0) scale(-1 1)">{side}</g>}
    {id==='sphinx'&&<><path d="M6 43H58V49H7M12 43Q10 30 21 29L40 32 40 19 48 13 55 20 52 28 47 29V43M18 42l7-9 12 9M42 18l4 11m1-8h2"/><path d="M10 37 5 31"/></>}
    {id==='person'&&<><circle cx="30" cy="12" r="5"/><path d="M30 17v18l-9 15m9-15 10 15M30 23l-12 8m12-8 15 6M47 13v38M43 13h8"/></>}
    {id==='bird'&&<><path d="M12 18Q15 9 22 14L28 22Q42 22 51 45L28 37Q14 35 12 18L5 20 12 23M22 24l17 13M26 36v13h-6m13-10v10h7"/><circle cx="18" cy="18" r="1"/></>}
    {id==='eye'&&<><path d="M5 25Q31 3 59 25Q33 45 5 25ZM10 14Q32 0 53 14M34 36v14m-5-13-12 11m23-12q16 12 14 0"/><circle cx="32" cy="24" r="9"/><circle cx="32" cy="24" r="3"/></>}
    {id==='pyramid'&&<><path d="M32 6 4 47H60ZM32 6v41M32 6 44 47"/></>}
    {id==='steps'&&<path d="M5 48V39H13V30H21V21H27V12H37V21H43V30H51V39H59V48ZM13 39h38M21 30h22M27 21h10"/>}
    {id==='ankh'&&<><ellipse cx="32" cy="15" rx="10" ry="12"/><path d="M28 27H16V34H28V51H36V34H48V27H36"/></>}
    {id==='scarab'&&<><ellipse cx="32" cy="33" rx="13" ry="17"/><circle cx="32" cy="10" r="6"/><path d="M32 17v33M19 24 8 17m11 17H5m16 8L9 51m36-27 11-7m-11 17h14m-16 8 12 9M24 6l-5-4m21 4 5-4"/></>}
    {id==='snake'&&<><path d="M30 49Q5 49 12 38Q16 32 22 40Q27 45 28 33V23Q18 12 29 5Q38 0 45 10Q51 18 38 25V43Q39 50 51 47M29 13h2m8 0h2M34 19v13"/></>}
  </g></svg>;
}

export function MazeDiagram({path,edges,markers,position,goal,manual=false}:{path?:number[],edges?:number[][],markers:number[],position?:number,goal?:number,manual?:boolean}){
  return <svg viewBox="0 0 292 292" className={'maze-diagram '+(manual?'manual-map':'')} role="img" aria-label={manual?'6행 6열 미로 해독 지도. 빨간 원 두 개로 식별':'6행 6열 미로. 흰 점은 현재 위치, 별은 목표, 빨간 원은 지도 식별점'}>
    {manual&&<rect width="292" height="292" fill="#fff"/>}
    <rect x="31" y="31" width="240" height="240" fill={manual?'#fff':'#0b1920'} stroke="#8196a0"/>
    {Array.from({length:6},(_,n)=><g key={n} fill={manual?'#182b35':'#b6cbd2'} fontSize="13" textAnchor="middle"><text x={51+n*40} y="21">{n+1}</text><text x="17" y={56+n*40}>{n+1}</text></g>)}
    {Array.from({length:7},(_,n)=><g key={n} stroke={manual?'transparent':'#425762'} strokeWidth="1"><path d={`M${31+n*40} 31V271M31 ${31+n*40}H271`}/></g>)}
    {manual&&edges&&Array.from({length:36},(_,i)=>{const x=31+i%6*40,y=31+Math.floor(i/6)*40;const open=(n:number)=>edges.some(([a,b])=>(a===i&&b===n)||(b===i&&a===n));return <g key={i} stroke="#14242c" strokeWidth="3.5">{i%6<5&&!open(i+1)&&<path d={`M${x+40} ${y}v40`}/>} {i<30&&!open(i+6)&&<path d={`M${x} ${y+40}h40`}/>}</g>})}
    {path&&<polyline points={path.map(i=>`${51+i%6*40},${51+Math.floor(i/6)*40}`).join(' ')} fill="none" stroke="#247a59" strokeWidth="6" strokeLinejoin="round"/>}
    {Array.from({length:36},(_,i)=><circle key={i} cx={51+i%6*40} cy={51+Math.floor(i/6)*40} r="2.5" fill={manual?'#536b78':'#647e89'}/>)}
    {markers.map(i=><circle key={i} cx={51+i%6*40} cy={51+Math.floor(i/6)*40} r="12" fill="none" stroke="#ed4358" strokeWidth="3"/>)}
    {position!==undefined&&<circle cx={51+position%6*40} cy={51+Math.floor(position/6)*40} r="7" fill="white" stroke="#142b37"/>}
    {goal!==undefined&&<text x={51+goal%6*40} y={59+Math.floor(goal/6)*40} textAnchor="middle" fill="#f9d85b" fontSize="26">★</text>}
  </svg>;
}

import {db} from '@/lib/db';
import {makeModules,publicModule,answer} from '@/lib/engine';
import {teamNames} from '@/lib/rules';

export const dynamic='force-dynamic';
const fail=(message:string,status=400)=>Response.json({error:message},{status});

function clean(w:any,token:string,admin:boolean,revision=0){
  if(w.status==='running'&&Date.now()>=w.endsAt){
    w.status='ended';
    w.remaining=0;
    for(const r of w.rooms)if(r.status==='playing')r.status='failed';
  }
  return {
    ...w,
    revision,
    players:w.players.map((p:any)=>({id:p.id,name:p.name,room:p.room,role:p.role,lastSeen:p.lastSeen})),
    rooms:w.rooms.map((r:any)=>({...r,modules:r.modules.map(publicModule)})),
    me:w.players.find((p:any)=>p.token===token)?.id,
    admin,
    serverNow:Date.now()
  };
}

function tokenOf(req:Request){
  return (req.headers.get('cookie')??'').split('; ').find(x=>x.startsWith('mission_player='))?.slice(15)??'';
}

export async function GET(req:Request){
  try{
    const url=new URL(req.url),id=url.searchParams.get('id');
    if(!id)return Response.json({signedIn:true});
    const row=await db().prepare('SELECT * FROM workshops WHERE id = ?').bind(id).first<any>();
    if(!row)return fail('워크숍을 찾을 수 없습니다.',404);
    const w=JSON.parse(row.data);
    return Response.json(clean(w,tokenOf(req),true,row.revision),{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    console.error(e);
    return fail('연결에 실패했습니다. 다시 시도하세요.',503);
  }
}

export async function POST(req:Request){
  try{
    if(req.headers.get('origin')!==new URL(req.url).origin)return fail('잘못된 요청입니다.',403);
    const b:any=await req.json();
    if(!b||typeof b!=='object')return fail('잘못된 요청입니다.');
    const token=tokenOf(req)||crypto.randomUUID();

    if(b.action==='create'){
      const n=Number(b.teams),minutes=Number(b.minutes),round=Number(b.round);
      if(!Number.isInteger(n)||n<1||n>30||!Number.isInteger(round)||round<1||round>9||!Number.isFinite(minutes)||minutes<1||minutes>60)return fail('설정을 확인하세요.');
      const id=crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
      const w={
        id,
        title:String(b.title||'팀 커뮤니케이션 워크숍').slice(0,80),
        round,
        duration:minutes*60000,
        remaining:minutes*60000,
        status:'waiting',
        endsAt:0,
        run:0,
        players:[],
        rooms:Array.from({length:n},(_,i)=>({id:i,name:teamNames[i]||`TEAM ${i+1}`,serial:`KVO${i+1}8`,strikes:0,score:0,roundScore:0,status:'waiting',modules:[]}))
      };
      await db().prepare('INSERT INTO workshops (id,owner,revision,data) VALUES (?,?,0,?)').bind(id,'instructor',JSON.stringify(w)).run();
      return Response.json(clean(w,token,true));
    }

    for(let attempt=0;attempt<6;attempt++){
      const row=await db().prepare('SELECT * FROM workshops WHERE id = ?').bind(String(b.id)).first<any>();
      if(!row)return fail('워크숍을 찾을 수 없습니다.',404);
      const w=JSON.parse(row.data),admin=true;
      let player=w.players.find((p:any)=>p.token===token);
      const now=Date.now();
      let result:any={};
      if(w.status==='running'&&now>=w.endsAt){
        w.status='ended';
        w.remaining=0;
        for(const r of w.rooms)if(r.status==='playing')r.status='failed';
      }

      if(b.action==='join'){
        if(!['waiting','ended'].includes(w.status))return fail('라운드 진행 중입니다. 다음 라운드에 입장하세요.');
        const name=String(b.name??'').trim().slice(0,20),room=Number(b.room),role=b.role==='operator'?'operator':'decoder';
        if(!name||!w.rooms[room])return fail('닉네임과 팀을 확인하세요.');
        if(role==='operator'&&w.players.some((p:any)=>p.room===room&&p.role===role&&p.token!==token))return fail('해당 팀의 현장 전문가는 이미 있습니다. 해독 전문가로 입장하세요.');
        if(!player){player={id:crypto.randomUUID(),token};w.players.push(player);}
        Object.assign(player,{name,room,role,lastSeen:now});
      }else if(b.action==='heartbeat'){
        if(!player)return fail('먼저 입장하세요.',401);
        player.lastSeen=now;
      }else if(b.action==='answer'){
        if(!player||player.role!=='operator')return fail('현장 전문가만 조작할 수 있습니다.',403);
        const r=w.rooms[player.room];
        if(w.status!=='running'||r.status!=='playing'||b.run!==w.run)return fail('현재 진행 중인 라운드가 아닙니다.');
        const m=r.modules[b.module];
        if(!m||m.done)return fail('이미 해제되었거나 없는 장치입니다.');
        if(b.stage!==m.stage)return fail('화면이 갱신되었습니다. 다시 시도하세요.');
        const ok=answer(m,b.answer,r.serial);
        result={correct:ok,solved:m.done};
        if(!ok){
          r.strikes++;
          if(r.strikes>=3)r.status='failed';
        }else if(m.done){
          r.score+=100;
          r.roundScore+=100;
          if(r.modules.every((x:any)=>x.done)){
            r.status='cleared';
            const bonus=Math.floor((w.endsAt-now)/1000);
            r.score+=bonus;
            r.roundScore+=bonus;
            result.cleared=true;
          }
        }
        player.lastSeen=now;
        if(w.rooms.every((x:any)=>x.status!=='playing')){
          w.status='ended';
          w.remaining=Math.max(0,w.endsAt-now);
        }
      }else{
        if(b.action==='configure'){
          if(w.status==='running'||w.status==='paused')return fail('라운드를 종료한 후 설정하세요.');
          const round=Number(b.round),minutes=Number(b.minutes);
          if(!Number.isInteger(round)||round<1||round>9||!Number.isFinite(minutes)||minutes<1||minutes>60)return fail('라운드와 시간을 확인하세요.');
          w.round=round;
          w.duration=minutes*60000;
          w.remaining=w.duration;
          w.status='waiting';
        }else if(b.action==='start'){
          if(w.status==='running'||w.status==='paused')return fail('이미 진행 중입니다.');
          if(!w.players.some((p:any)=>p.role==='operator'))return fail('현장 전문가가 최소 한 명은 입장해야 합니다.');
          w.status='running';
          w.run++;
          w.endsAt=now+w.duration;
          w.remaining=w.duration;
          for(const r of w.rooms){
            r.status=w.players.some((p:any)=>p.room===r.id&&p.role==='operator')?'playing':'absent';
            r.strikes=0;
            r.roundScore=0;
            r.modules=makeModules(w.round,crypto.getRandomValues(new Uint32Array(1))[0]);
            r.serial=`KVO${100+Math.floor(Math.random()*900)}`;
          }
        }else if(b.action==='pause'){
          if(w.status!=='running')return fail('진행 중인 라운드만 일시정지할 수 있습니다.');
          w.remaining=Math.max(0,w.endsAt-now);
          w.status='paused';
        }else if(b.action==='resume'){
          if(w.status!=='paused')return fail('일시정지 상태가 아닙니다.');
          w.endsAt=now+w.remaining;
          w.status='running';
        }else if(b.action==='end'){
          w.remaining=w.status==='running'?Math.max(0,w.endsAt-now):w.remaining;
          w.status='ended';
          for(const r of w.rooms)if(r.status==='playing')r.status='failed';
        }else return fail('지원하지 않는 동작입니다.');
      }

      const saved=await db().prepare('UPDATE workshops SET data = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(w),w.id,row.revision).run();
      if(saved.meta.changes)return Response.json({...clean(w,token,admin,row.revision+1),result},{headers:{'Set-Cookie':`mission_player=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(req.url).protocol==='https:'?'; Secure':''}`}});
    }
    return fail('동시 요청이 많습니다. 잠시 후 다시 시도하세요.',409);
  }catch(e){
    console.error(e);
    return fail('DB 에러 상세: ' + (e?.message || e?.toString() || JSON.stringify(e)), 503);
  }
}

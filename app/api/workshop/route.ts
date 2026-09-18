import { db } from '@/lib/db';
import { makeModules, publicModule, answer } from '@/lib/engine';
import { teamNames } from '@/lib/rules';

export const dynamic = 'force-dynamic';
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
function cookie(req: Request, name: string) {
  return (req.headers.get('cookie') || '').split(';').map(p => p.trim()).find(p => p.startsWith(name + '='))?.slice(name.length + 1) || '';
}
async function ownerHash(token: string) {
  if (!/^[a-f0-9-]{36}$/.test(token)) return '';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return 'host:' + Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function response(w: any, token: string, admin: boolean, revision: number, req: Request, extra: any = {}, hostToken?: string) {
  expire(w);
  const me = w.players.find((p: any) => p.token === token);
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  const flags = `; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
  if (extra.setPlayer) headers.append('Set-Cookie', `mission_player=${token}${flags}`);
  if (hostToken) headers.append('Set-Cookie', `mission_host=${hostToken}${flags}`);
  return Response.json({
    ...w, revision, admin, me: me?.id, serverNow: Date.now(),
    legacyWorkshop: !!extra.legacyWorkshop,
    players: w.players.map((p: any) => ({ id: p.id, name: p.name, room: p.room, role: p.role, lastSeen: p.lastSeen })),
    rooms: w.rooms.map((r: any) => ({ ...r, modules: r.modules.map((m: any) => admin || (me?.role === 'operator' && me.room === r.id) ? publicModule(m) : { type: m.type, done: m.done, stage: m.stage }) })),
    ...(extra.result ? { result: extra.result } : {}),
  }, { headers });
}
function expire(w: any, now = Date.now()) {
  if (w.status === 'running' && now >= w.endsAt) {
    w.status = 'ended'; w.remaining = 0;
    for (const r of w.rooms) if (r.status === 'playing') r.status = 'failed';
  }
}
function settings(round: unknown, minutes: unknown) {
  const r = Number(round), m = Number(minutes);
  return Number.isInteger(r) && r >= 1 && r <= 9 && Number.isFinite(m) && m >= 1 && m <= 60 ? { round: r, duration: m * 60000 } : null;
}
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return Response.json({ signedIn: true }, { headers: { 'Cache-Control': 'no-store' } });
    const row = await db().prepare('SELECT * FROM workshops WHERE id = ?').bind(id).first<any>();
    if (!row) return fail('워크숍을 찾을 수 없습니다. 입장 코드를 확인하세요.', 404);
    const owner = await ownerHash(cookie(req, 'mission_host'));
    const admin = !!owner && row.owner === owner;
    return response(JSON.parse(row.data), cookie(req, 'mission_player'), admin, row.revision ?? 0, req, { legacyWorkshop: !String(row.owner).startsWith('host:') });
  } catch (e) { console.error('workshop read', e); return fail('연결에 실패했습니다. 잠시 후 다시 시도하세요.', 503); }
}
export async function POST(req: Request) {
  try {
    if (req.headers.get('origin') !== new URL(req.url).origin) return fail('잘못된 요청입니다.', 403);
    const b: any = await req.json();
    if (!b || typeof b !== 'object' || Array.isArray(b)) return fail('잘못된 요청입니다.');
    let token = cookie(req, 'mission_player');
    if (!/^[a-f0-9-]{36}$/.test(token)) token = crypto.randomUUID();
    const hostToken = cookie(req, 'mission_host');
    const owner = await ownerHash(hostToken);
    if (b.action === 'create') {
      const config = settings(b.round, b.minutes), n = Number(b.teams);
      if (!config || !Number.isInteger(n) || n < 1 || n > 30) return fail('팀 수·라운드·제한 시간을 확인하세요.');
      const newHost = owner ? hostToken : crypto.randomUUID();
      const id = crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase();
      const w = {
        id, title: String(b.title || '팀 커뮤니케이션 워크숍').trim().slice(0, 80), ...config,
        remaining: config.duration, status: 'waiting', endsAt: 0, run: 0, players: [],
        rooms: Array.from({ length: n }, (_, i) => ({ id: i, name: teamNames[i] || `TEAM ${i + 1}`, serial: `KVO${i + 1}8`, strikes: 0, score: 0, roundScore: 0, timeBonus: 0, status: 'waiting', modules: [] })),
      };
      await db().prepare('INSERT INTO workshops (id,owner,revision,data) VALUES (?,?,0,?)').bind(id, await ownerHash(newHost), JSON.stringify(w)).run();
      return response(w, token, true, 0, req, {}, newHost);
    }
    for (let attempt = 0; attempt < 8; attempt++) {
      const row = await db().prepare('SELECT * FROM workshops WHERE id = ?').bind(String(b.id)).first<any>();
      if (!row) return fail('워크숍을 찾을 수 없습니다.', 404);
      const w = JSON.parse(row.data), admin = !!owner && row.owner === owner, now = Date.now();
      let player = w.players.find((p: any) => p.token === token), result: any = {};
      expire(w, now);
      if (b.action === 'join') {
        if (!['waiting', 'ended'].includes(w.status)) return fail('라운드 진행 중입니다. 다음 라운드에 입장하세요.');
        const name = String(b.name ?? '').trim().slice(0, 20), room = Number(b.room), role = b.role;
        if (!name || !Number.isInteger(room) || !w.rooms[room] || !['operator', 'decoder'].includes(role)) return fail('닉네임·팀·역할을 확인하세요.');
        if (role === 'operator' && w.players.some((p: any) => p.room === room && p.role === role && p.token !== token)) return fail('이 팀의 현장전문가가 이미 있습니다. 해독전문가로 입장하세요.');
        if (!player) { if (w.players.length >= 500) return fail('워크숍 참가 인원이 가득 찼습니다.'); player = { id: crypto.randomUUID(), token }; w.players.push(player); }
        Object.assign(player, { name, room, role, lastSeen: now });
      } else if (b.action === 'heartbeat') {
        if (!player) return fail('먼저 입장하세요.', 401);
        player.lastSeen = now;
      } else if (b.action === 'leave') {
        if (!player) return fail('이미 퇴장했습니다.', 400);
        if (!['waiting', 'ended'].includes(w.status)) return fail('라운드가 끝난 뒤 팀이나 역할을 변경하세요.');
        w.players = w.players.filter((p: any) => p.id !== player.id);
      } else if (b.action === 'answer') {
        if (!player || player.role !== 'operator') return fail('현장전문가만 조작할 수 있습니다.', 403);
        const r = w.rooms[player.room];
        if (w.status !== 'running' || r.status !== 'playing' || b.run !== w.run) return fail('현재 진행 중인 라운드가 아닙니다.', 409);
        if (!Number.isInteger(b.module)) return fail('장치를 확인하세요.');
        const m = r.modules[b.module];
        if (!m || m.done) return fail('이미 해제되었거나 없는 장치입니다.', 409);
        if (b.stage !== m.stage) return fail('화면이 갱신되었습니다. 다시 시도하세요.', 409);
        const ok = answer(m, b.answer, r.serial);
        result = { correct: ok, solved: m.done };
        if (!ok) { r.strikes++; if (r.strikes >= 3) r.status = 'failed'; }
        else if (m.done) {
          r.score += 100; r.roundScore += 100;
          if (r.modules.every((x: any) => x.done)) {
            r.status = 'cleared'; const bonus = Math.max(0, Math.floor((w.endsAt - now) / 1000));
            r.timeBonus = bonus; r.score += bonus; r.roundScore += bonus; result.cleared = true;
          }
        }
        player.lastSeen = now;
        if (w.rooms.every((r: any) => r.status !== 'playing')) { w.status = 'ended'; w.remaining = Math.max(0, w.endsAt - now); }
      } else {
        if (!admin) return fail('워크숍을 만든 강사의 브라우저에서만 제어할 수 있습니다.', 403);
        if (b.run !== undefined && b.run !== w.run) return fail('다른 라운드로 변경되었습니다. 화면을 확인하세요.', 409);
        if (b.action === 'configure') {
          if (['running', 'paused'].includes(w.status)) return fail('라운드를 종료한 뒤 설정하세요.');
          const config = settings(b.round, b.minutes); if (!config) return fail('라운드와 제한 시간을 확인하세요.');
          Object.assign(w, config, { remaining: config.duration, status: 'waiting', endsAt: 0 });
          for (const r of w.rooms) Object.assign(r, { modules: [], strikes: 0, roundScore: 0, timeBonus: 0, status: 'waiting' });
        } else if (b.action === 'start') {
          if (['running', 'paused'].includes(w.status)) return fail('이미 진행 중입니다.');
          // Apply the settings and start in one database update, including when Save was not pressed.
          const config = settings(b.round ?? w.round, b.minutes ?? w.duration / 60000);
          if (!config) return fail('라운드와 제한 시간을 확인하세요.');
          if (!w.players.some((p: any) => p.role === 'operator')) return fail('현장전문가가 최소 한 팀에 입장해야 합니다.');
          Object.assign(w, config, { status: 'running', run: w.run + 1, endsAt: now + config.duration, remaining: config.duration });
          for (const r of w.rooms) {
            Object.assign(r, { status: w.players.some((p: any) => p.room === r.id && p.role === 'operator') ? 'playing' : 'absent', strikes: 0, roundScore: 0, timeBonus: 0,
              modules: makeModules(w.round, crypto.getRandomValues(new Uint32Array(1))[0]), serial: `KVO${100 + Math.floor(Math.random() * 900)}` });
          }
        } else if (b.action === 'pause') {
          if (w.status !== 'running') return fail('진행 중인 라운드만 일시정지할 수 있습니다.');
          w.remaining = Math.max(0, w.endsAt - now); w.status = 'paused';
        } else if (b.action === 'resume') {
          if (w.status !== 'paused') return fail('일시정지 상태가 아닙니다.');
          w.endsAt = now + w.remaining; w.status = 'running';
        } else if (b.action === 'end') {
          w.remaining = w.status === 'running' ? Math.max(0, w.endsAt - now) : w.remaining;
          w.status = 'ended';
          for (const r of w.rooms) if (r.status === 'playing') r.status = 'failed';
        } else return fail('지원하지 않는 동작입니다.');
      }
      const revision = Number(row.revision) || 0;
      const saved = await db().prepare('UPDATE workshops SET data = ?, revision = ? WHERE id = ? AND COALESCE(revision,0) = ?').bind(JSON.stringify(w), revision + 1, w.id, revision).run();
      if (saved.meta.changes) return response(w, token, admin, revision + 1, req, { result, setPlayer: b.action === 'join', legacyWorkshop: !String(row.owner).startsWith('host:') });
    }
    return fail('동시 요청이 많습니다. 잠시 후 다시 시도하세요.', 409);
  } catch (e) { console.error('workshop action', e); return fail('요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.', 503); }
}

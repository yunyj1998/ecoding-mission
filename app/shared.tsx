'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, BookOpen } from 'lucide-react';
export function Header({ participant = false }: { participant?: boolean }) {
  return <header className={participant ? 'participant-header' : ''}><a className="brand" href={participant ? '/play' : '/'}><ShieldCheck size={34}/><div>DECODING MISSION<small>TEAM COMMUNICATION WORKSHOP</small></div></a>{!participant && <a className="btn" href="/manual" target="_blank" rel="noreferrer"><BookOpen size={17}/> 해독 매뉴얼 ↗</a>}</header>;
}
export function useWorkshop(id: string) {
  const [data, setData] = useState<any>(null), [requestError, setRequestError] = useState(''), [connectionError, setConnectionError] = useState('');
  const [busy, setBusy] = useState(false), [clock, setClock] = useState(Date.now());
  const offset = useRef(0), mutation = useRef(false), identity = useRef(id), live = useRef(true);
  identity.current = id;
  const receive = useCallback((d: any, requestId: string) => {
    if (!live.current || requestId !== identity.current) return;
    if (Number.isFinite(d.serverNow)) offset.current = d.serverNow - Date.now();
    setData((prev: any) => !prev || prev.id !== d.id || d.revision >= prev.revision ? d : prev);
  }, []);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false; let timer: ReturnType<typeof setTimeout>; let abort: AbortController;
    setData(null); setConnectionError(''); setRequestError('');
    async function refresh() {
      if (!id || cancelled) return;
      abort = new AbortController(); const timeout = setTimeout(() => abort.abort(), 12000);
      try {
        const r = await fetch('/api/workshop?id=' + encodeURIComponent(id), { cache: 'no-store', signal: abort.signal });
        const d: any = await r.json();
        if (!r.ok) throw Error(d.error || '워크숍을 불러오지 못했습니다.');
        if (!cancelled) { receive(d, id); setConnectionError(''); }
      } catch (e: any) { if (!cancelled) setConnectionError(e.name === 'AbortError' ? '연결이 지연되고 있습니다. 자동으로 다시 연결합니다.' : e.message); }
      finally { clearTimeout(timeout); if (!cancelled) timer = setTimeout(refresh, 2000); }
    }
    refresh();
    return () => { cancelled = true; clearTimeout(timer); abort?.abort(); };
  }, [id, receive]);
  useEffect(() => { const timer = setInterval(() => setClock(Date.now() + offset.current), 200); return () => clearInterval(timer); }, []);
  const action = useCallback(async (name: string, extra: any = {}) => {
    const quiet = name === 'heartbeat';
    if (!quiet && mutation.current) return null;
    if (!quiet) { mutation.current = true; setBusy(true); setRequestError(''); }
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 15000);
    try {
      const r = await fetch('/api/workshop', { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: name, ...extra }) });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error || '요청을 처리하지 못했습니다.');
      receive(d, id); setConnectionError(''); return d;
    } catch (e: any) {
      if (!quiet && live.current) setRequestError(e.name === 'AbortError' ? '응답이 늦습니다. 갱신된 상태를 확인한 뒤 다시 시도하세요.' : e.message);
      return null;
    } finally { clearTimeout(timeout); if (!quiet) { mutation.current = false; if (live.current) setBusy(false); } }
  }, [id, receive]);
  const remaining = data?.status === 'running' ? Math.max(0, data.endsAt - clock) : data?.remaining ?? 300000;
  return { data, error: requestError || connectionError, setError: setRequestError, busy, action, remaining, clock, connected: !connectionError };
}
let context: AudioContext | undefined;
export function sound(kind: 'error' | 'solved' | 'win' | 'tap') {
  try {
    context ??= new AudioContext(); void context.resume().catch(() => {}); const ctx = context;
    const notes = kind === 'error' ? [130, 95] : kind === 'win' ? [523, 659, 784, 1047] : kind === 'solved' ? [900, 1350] : [500];
    notes.forEach((hz, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), t = ctx.currentTime + i * .14;
      osc.type = kind === 'error' ? 'sawtooth' : 'sine'; osc.frequency.value = hz;
      gain.gain.setValueAtTime(.08, t); gain.gain.exponentialRampToValueAtTime(.001, t + .19);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t + .2);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    });
  } catch { /* Visual feedback remains available when audio is unsupported. */ }
}

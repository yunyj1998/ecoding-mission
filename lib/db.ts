let cfEnv: any = {};
try {
  cfEnv = require('cloudflare:workers').env || {};
} catch {
  // cloudflare:workers dynamic import fallback
}

export function db() {
  const g = globalThis as any;
  const targetDb =
    cfEnv.DB ||
    g.DB ||
    g.__env__?.DB ||
    g.env?.DB ||
    (typeof process !== 'undefined' && (process.env as any)?.DB);

  if (!targetDb) {
    throw new Error('데이터베이스(DB) 바인딩을 찾을 수 없습니다.');
  }
  return targetDb;
}

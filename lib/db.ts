import { env } from 'cloudflare:workers';
export function db() {
  if (!env.DB) throw new Error('D1 DB binding is unavailable');
  return env.DB;
}

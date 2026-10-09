// The shared "More xonicbox tools" list: https://xonicbox.com/sites.json (edited in xonicbox-site), with a built-in fallback.
export const SITES_URL = 'https://xonicbox.com/sites.json';

const isStr = (v) => typeof v === 'string' && v.trim() !== '';

function isHttps(u) {
  if (!isStr(u)) return false;
  try {
    return new URL(u).protocol === 'https:';
  } catch {
    return false;
  }
}

// Pure. Returns [{ id, name, tagline, href|null, soon }]; [] when the document is not a usable version 1 list.
export function parseSites(json) {
  if (!json || typeof json !== 'object' || json.version !== 1 || !Array.isArray(json.sites)) return [];
  const out = [];
  for (const s of json.sites) {
    if (!s || typeof s !== 'object' || !isStr(s.id) || !isStr(s.name)) continue;
    if (s.status !== 'live' && s.status !== 'soon') continue;
    const soon = s.status === 'soon';
    if (!soon && !isHttps(s.url)) continue;
    out.push({
      id: s.id,
      name: s.name,
      tagline: typeof s.tagline === 'string' ? s.tagline : '',
      href: soon ? null : s.url,
      soon,
    });
  }
  return out;
}

// config.tools in the same shape as parseSites (the fallback).
export function fallbackSites(config) {
  return (config.tools || []).map((t) => ({
    id: t.id,
    name: t.name || t.id,
    tagline: t.tagline || '',
    href: isHttps(t.url) ? t.url : null,
    soon: !isHttps(t.url),
  }));
}

// Never throws: any failure (network, timeout, bad JSON, empty list) gives the fallback.
export async function loadSites(config, { fetch: fetchFn = globalThis.fetch, timeoutMs = 3000 } = {}) {
  let timer;
  try {
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const request = Promise.resolve().then(async () => {
      const res = await fetchFn(config.sitesUrl || SITES_URL, { credentials: 'omit', signal: ctrl?.signal });
      if (!res || !res.ok) throw new Error('bad response');
      return parseSites(await res.json());
    });
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        ctrl?.abort();
        reject(new Error('timeout'));
      }, timeoutMs);
    });
    const sites = await Promise.race([request, timeout]);
    if (!sites.length) throw new Error('empty');
    return sites;
  } catch {
    return fallbackSites(config);
  } finally {
    clearTimeout(timer);
  }
}

// Pure. Drops the current site, keeps the order.
export function moreSitesModel(sites, selfId) {
  return sites.filter((s) => s.id !== selfId);
}

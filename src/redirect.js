export function redirectTarget(hostname, pathname, search, hash) {
  if (hostname !== 'xon-g.github.io') return null;
  const path = pathname.replace(/^\/devteam-pilot/, '') || '/';
  return 'https://lotto.xonicbox.com' + path + (search || '') + (hash || '');
}
